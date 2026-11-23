import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, UnreachableError } from "./api";
import {
  endSession,
  getAccessToken,
  LOCAL_TOKEN_KEY,
  resetSession,
  signIn,
  signInLocal,
  signOut,
  startSession,
} from "./session";

// A stand-in for Supabase's client. `loaded` says whether the app imported it at all.
const supabase = vi.hoisted(() => ({
  loaded: false,
  session: null as null | { access_token: string },
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => {
  supabase.loaded = true;
  return { createClient: supabase.createClient };
});

type GetSession = { data: { session: typeof supabase.session }; error: unknown };

const auth = {
  getSession: vi.fn(async (): Promise<GetSession> => ({
    data: { session: supabase.session },
    error: null,
  })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
  signInWithPassword: vi.fn(async (): Promise<{ data: object; error: unknown }> => {
    supabase.session = { access_token: "supabase-token" };
    return { data: {}, error: null };
  }),
  signOut: vi.fn(async () => {
    supabase.session = null;
    return { error: null };
  }),
};

const LOCAL = {
  mode: "local",
  people: [{ id: "sample-alex-rivera", name: "Alex Rivera", email: "alex.rivera@team.example" }],
};
const SUPABASE = {
  mode: "supabase",
  supabase_url: "https://project.supabase.example",
  publishable_key: "test-publishable-key",
};

function serveConfig(config: unknown) {
  const fetch = vi.fn(async (path: string) => {
    if (path === "/api/auth/config") return Response.json(config);
    if (path === "/api/auth/local") return Response.json({ access_token: "local-token" });
    return Response.json({ detail: "Not Found" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => {
  resetSession();
  localStorage.clear();
  supabase.session = null;
  vi.clearAllMocks();
  supabase.createClient.mockImplementation(() => ({ auth }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("on a local copy", () => {
  test("Supabase's client is never loaded", async () => {
    const fetch = serveConfig(LOCAL);
    await startSession();
    expect(await signInLocal("sample-alex-rivera")).toBeNull();
    await signOut();
    expect(supabase.loaded).toBe(false);
    expect(supabase.createClient).not.toHaveBeenCalled();
    expect(fetch.mock.calls.every(([path]) => String(path).startsWith("/api/"))).toBe(true);
  });

  test("the token comes from local sign-in and is kept", async () => {
    serveConfig(LOCAL);
    await startSession();
    expect(await getAccessToken()).toBeNull();
    await signInLocal("sample-alex-rivera");
    expect(await getAccessToken()).toBe("local-token");
    expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBe("local-token");

    // A reload picks the session up again.
    resetSession();
    await startSession();
    expect(await getAccessToken()).toBe("local-token");
  });

  test("signing out ends the session and keeps the theme", async () => {
    serveConfig(LOCAL);
    localStorage.setItem("accountable-theme", "dark");
    await startSession();
    await signInLocal("sample-alex-rivera");
    await signOut();
    expect(await getAccessToken()).toBeNull();
    expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem("accountable-theme")).toBe("dark");
  });
});

describe("on Supabase", () => {
  test("the client gets the URL and publishable key from /api/auth/config", async () => {
    serveConfig(SUPABASE);
    await startSession();
    expect(supabase.createClient).toHaveBeenCalledWith(
      "https://project.supabase.example",
      "test-publishable-key",
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: true }) }),
    );
  });

  test("the token comes from Supabase's session", async () => {
    serveConfig(SUPABASE);
    await startSession();
    expect(await getAccessToken()).toBeNull();
    expect(await signIn("alex@team.example", "a password")).toBeNull();
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "alex@team.example",
      password: "a password",
    });
    expect(await getAccessToken()).toBe("supabase-token");
  });

  test("a failed sign-in gives its message", async () => {
    serveConfig(SUPABASE);
    await startSession();
    auth.signInWithPassword.mockResolvedValueOnce({
      data: {},
      error: { name: "AuthApiError", code: "invalid_credentials" },
    });
    expect(await signIn("alex@team.example", "wrong")).toBe(
      "That email and password don't match. Try again.",
    );
    expect(await getAccessToken()).toBeNull();
  });

  test("signing out ends only this browser's session and keeps the theme", async () => {
    serveConfig(SUPABASE);
    localStorage.setItem("accountable-theme", "system");
    await startSession();
    await signIn("alex@team.example", "a password");
    await signOut();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(await getAccessToken()).toBeNull();
    expect(localStorage.getItem("accountable-theme")).toBe("system");
  });

  test("a session kept from before is picked up, and a 401 ends it", async () => {
    serveConfig(SUPABASE);
    supabase.session = { access_token: "kept-token" };
    await startSession();
    expect(await getAccessToken()).toBe("kept-token");
    await endSession();
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(await getAccessToken()).toBeNull();
  });

  test("a token that can't be renewed because Supabase doesn't answer keeps the session", async () => {
    serveConfig(SUPABASE);
    supabase.session = { access_token: "kept-token" };
    await startSession();
    // The token ran out, such as while the laptop slept, and renewing it got no answer.
    // Supabase keeps the session and answers with a retryable error.
    auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { name: "AuthRetryableFetchError", status: 0 },
    });
    const fetch = vi.fn(async () =>
      Response.json({ detail: "Sign in to continue." }, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetch);

    await expect(api.get("/contacts")).rejects.toBeInstanceOf(UnreachableError);
    expect(fetch).not.toHaveBeenCalled();
    expect(auth.signOut).not.toHaveBeenCalled();

    // Once Supabase answers, the same session carries on.
    expect(await getAccessToken()).toBe("kept-token");
  });

  test("a token Supabase refuses to renew gives no token, so the API's 401 ends the session", async () => {
    serveConfig(SUPABASE);
    supabase.session = { access_token: "kept-token" };
    await startSession();
    auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { name: "AuthApiError", status: 400, code: "refresh_token_not_found" },
    });
    expect(await getAccessToken()).toBeNull();
  });
});

test("no answer from /api/auth/config leaves the app unable to sign in until it tries again", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
  );
  await startSession();
  expect(await getAccessToken()).toBeNull();
  const { retrySession } = await import("./session");
  serveConfig(LOCAL);
  await retrySession();
  expect(await signInLocal("sample-alex-rivera")).toBeNull();
});

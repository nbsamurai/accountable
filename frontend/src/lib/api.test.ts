import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, ApiError, query, UnreachableError, useServerReachable } from "./api";
import { getAccessToken, LOCAL_TOKEN_KEY, resetSession, startSession } from "./session";

afterEach(() => {
  vi.unstubAllGlobals();
});

function respond(status: number, body?: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(body === undefined ? null : JSON.stringify(body), { status })),
  );
}

test("a 422 gives each field its message", async () => {
  respond(422, { detail: [{ loc: ["body", "name"], msg: "Enter a name.", type: "x" }] });
  const error = (await api.post("/contacts", {}).catch((e) => e)) as ApiError;
  expect(error).toBeInstanceOf(ApiError);
  expect(error.status).toBe(422);
  expect(error.fields).toEqual({ name: "Enter a name." });
});

test("a 404 or 409 gives its message", async () => {
  respond(409, { detail: "Stage changes can't be changed." });
  const error = (await api.delete("/activities/1").catch((e) => e)) as ApiError;
  expect(error.message).toBe("Stage changes can't be changed.");
});

test("no answer, or the proxy's 502, means the server can't be reached", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
  );
  await expect(api.get("/health")).rejects.toBeInstanceOf(UnreachableError);
  respond(502);
  await expect(api.get("/health")).rejects.toBeInstanceOf(UnreachableError);
});

test("a request already on its way when the server is found unreachable doesn't hide the banner", async () => {
  // Each request waits until the test answers it, in the order they were sent.
  const answers: ((response: Response) => void)[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>((resolve) => answers.push(resolve))),
  );
  const { result } = renderHook(() => useServerReachable());
  // The user menu and a screen ask at the same time, and only the screen's request fails.
  const me = api.get("/me");
  const dashboard = api.get("/dashboard").catch((error: unknown) => error);
  await waitFor(() => expect(answers).toHaveLength(2));
  await act(async () => {
    answers[1]!(new Response(null, { status: 502 }));
    await dashboard;
  });
  expect(result.current).toBe(false);
  await act(async () => {
    answers[0]!(Response.json({}));
    await me;
  });
  expect(result.current).toBe(false);

  // A request sent after the failure, such as Try again's, shows the server is back.
  const health = api.get("/health");
  await waitFor(() => expect(answers).toHaveLength(3));
  await act(async () => {
    answers[2]!(Response.json({ status: "ok" }));
    await health;
  });
  expect(result.current).toBe(true);
});

test("query strings leave out empty values", () => {
  expect(query({ q: "ann", status: undefined, page: 2, sort: "" })).toBe("?q=ann&page=2");
  expect(query({})).toBe("");
});

describe("signed in", () => {
  beforeEach(async () => {
    resetSession();
    localStorage.setItem(LOCAL_TOKEN_KEY, "local-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ mode: "local", people: [] })),
    );
    await startSession();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test("every request sends the token", async () => {
    respond(200, { items: [], total: 0 });
    await api.get("/contacts");
    await api.post("/contacts", { name: "Jane Doe" });
    const calls = vi.mocked(fetch).mock.calls;
    expect(calls.map(([, init]) => new Headers(init?.headers).get("Authorization"))).toEqual([
      "Bearer local-token",
      "Bearer local-token",
    ]);
  });

  test("a 401 ends the session", async () => {
    respond(401, { detail: "Sign in to continue." });
    const error = (await api.get("/contacts").catch((e) => e)) as ApiError;
    expect(error.status).toBe(401);
    expect(error.message).toBe("Your session has ended. Sign in again.");
    expect(await getAccessToken()).toBeNull();
    expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBeNull();
  });
});

test("the unreachable message names the internet connection", () => {
  expect(new UnreachableError().message).toBe(
    "Can't reach Accountable. Check your internet connection, then try again.",
  );
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { endSession, LOCAL_TOKEN_KEY, resetSession, signOut } from "../lib/session";
import { AuthGate } from "./AuthGate";

// A stand-in for Supabase's client.
const supabase = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: supabase.createClient }));

type Result = { data: object; error: unknown };
const auth = {
  getSession: vi.fn(async () => ({ data: { session: null } })),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe() {} } } })),
  signInWithPassword: vi.fn(async (): Promise<Result> => ({ data: {}, error: null })),
  signOut: vi.fn(async () => ({ error: null })),
};

const TEAMMATES = [
  { id: "sample-alex-rivera", name: "Alex Rivera", email: "alex.rivera@team.example" },
  { id: "sample-jordan-blake", name: "Jordan Blake", email: "jordan.blake@team.example" },
];

function serve(mode: "local" | "supabase") {
  const fetch = vi.fn(async (path: string) => {
    if (path === "/api/auth/config") {
      return Response.json(
        mode === "local"
          ? { mode, people: TEAMMATES }
          : { mode, supabase_url: "https://p.supabase.example", publishable_key: "test-key" },
      );
    }
    if (path === "/api/auth/local") return Response.json({ access_token: "local-token" });
    return Response.json({ detail: "Not Found" }, { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

async function renderGate() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthGate>
        <p>The app</p>
      </AuthGate>
    </QueryClientProvider>,
  );
  return screen.findByRole("heading", { level: 1, name: "Sign in" });
}

beforeEach(() => {
  resetSession();
  localStorage.clear();
  vi.clearAllMocks();
  supabase.createClient.mockImplementation(() => ({ auth }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("the page title is Sign in, and focus is on its h1", async () => {
  serve("supabase");
  const heading = await renderGate();
  expect(document.title).toBe("Sign in · Accountable");
  expect(heading).toHaveFocus();
  expect(screen.getByRole("main")).toBeInTheDocument();
  expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  expect(
    screen.getByText(
      "Need an account or a new password? Ask whoever runs Accountable for your team.",
    ),
  ).toBeInTheDocument();
});

test("empty fields say what to enter under them", async () => {
  const user = userEvent.setup();
  serve("supabase");
  await renderGate();
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  const email = screen.getByLabelText("Email");
  expect(email).toHaveAccessibleDescription("Enter your email.");
  expect(screen.getByLabelText("Password")).toHaveAccessibleDescription("Enter your password.");
  expect(email).toHaveFocus();
  expect(auth.signInWithPassword).not.toHaveBeenCalled();

  await user.type(email, "alex@team.example");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(screen.getByLabelText("Password")).toHaveFocus();
});

test.each([
  [
    { name: "AuthApiError", code: "invalid_credentials" },
    "That email and password don't match. Try again.",
  ],
  [
    { name: "AuthRetryableFetchError", status: 0 },
    "Can't reach the sign-in service. Check your internet connection, then try again.",
  ],
  [
    { name: "AuthApiError", code: "over_request_rate_limit", status: 429 },
    "Couldn't sign in. Try again in a few minutes.",
  ],
])("an error from Supabase shows at the top of the form", async (error, message) => {
  const user = userEvent.setup();
  serve("supabase");
  await renderGate();
  auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error });
  await user.type(screen.getByLabelText("Email"), "alex@team.example");
  await user.type(screen.getByLabelText("Password"), "wrong{Enter}");
  expect(await screen.findByRole("alert")).toHaveTextContent(message);
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
});

test("while it waits, the button says Signing in… and ignores more clicks, then the app shows", async () => {
  const user = userEvent.setup();
  serve("supabase");
  await renderGate();
  let finish: (result: Result) => void = () => {};
  auth.signInWithPassword.mockImplementationOnce(
    () => new Promise<Result>((resolve) => (finish = resolve)),
  );
  await user.type(screen.getByLabelText("Email"), "alex@team.example");
  await user.type(screen.getByLabelText("Password"), "a password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  const button = screen.getByRole("button", { name: /Signing in…/ });
  await user.click(button);
  expect(auth.signInWithPassword).toHaveBeenCalledTimes(1);

  await act(async () => finish({ data: {}, error: null }));
  expect(await screen.findByText("The app")).toBeInTheDocument();
});

test("on a local copy, choosing a teammate signs in with no password", async () => {
  const user = userEvent.setup();
  const fetch = serve("local");
  await renderGate();
  expect(
    screen.getByText("This copy runs on this computer with made-up teammates."),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Sign in as Jordan Blake" })).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Sign in as Alex Rivera" }));
  expect(await screen.findByText("The app")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    "/api/auth/local",
    expect.objectContaining({ body: JSON.stringify({ person_id: "sample-alex-rivera" }) }),
  );
  expect(localStorage.getItem(LOCAL_TOKEN_KEY)).toBe("local-token");
  expect(supabase.createClient).not.toHaveBeenCalled();
});

test("the ended-session message shows until the person signs in", async () => {
  const user = userEvent.setup();
  serve("local");
  localStorage.setItem(LOCAL_TOKEN_KEY, "old-token");
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthGate>
        <p>The app</p>
      </AuthGate>
    </QueryClientProvider>,
  );
  expect(await screen.findByText("The app")).toBeInTheDocument();

  await act(() => endSession());
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Your session has ended. Sign in again.",
  );
  await user.click(screen.getByRole("button", { name: "Sign in as Alex Rivera" }));
  expect(await screen.findByText("The app")).toBeInTheDocument();

  await act(() => signOut());
  expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  expect(screen.queryByText("Your session has ended. Sign in again.")).not.toBeInTheDocument();
});

test("no answer from the backend offers to try again", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))),
  );
  await renderGate();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Can't reach Accountable. Check your internet connection, then try again.",
  );
  serve("local");
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("button", { name: "Sign in as Alex Rivera" })).toBeInTheDocument();
});

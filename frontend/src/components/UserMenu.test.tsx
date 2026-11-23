import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { stubDevice } from "../../test/device";
import type { Me } from "../lib/people";
import { signOut } from "../lib/session";
import { resetTheme, THEME_KEY } from "../lib/theme";
import { UserMenu } from "./UserMenu";

vi.mock(import("../lib/session"), async (importOriginal) => ({
  ...(await importOriginal()),
  signOut: vi.fn(async () => {}),
}));

const html = document.documentElement;
const ALEX: Me = { id: "sample-alex-rivera", email: "alex@team.example", name: "Alex Rivera" };
const SAM: Me = { id: "sam", email: "sam@team.example", name: null };

function renderAs(me: Me | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      me ? Response.json(me) : Response.json({ detail: "Server error" }, { status: 500 }),
    ),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <UserMenu />
    </QueryClientProvider>,
  );
}

const theme = (name: string) => screen.getByRole("menuitemradio", { name });

beforeEach(() => {
  stubDevice(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.mocked(signOut).mockClear();
  localStorage.clear();
  html.removeAttribute("data-theme");
  resetTheme();
});

test("the button shows the initials, and its name and tooltip say whose account it is", async () => {
  const user = userEvent.setup();
  renderAs(ALEX);
  const button = await screen.findByRole("button", { name: "Account: Alex Rivera, AR" });
  expect(button).toHaveTextContent("AR");
  await user.tab();
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Account: Alex Rivera");
});

test("the menu shows the name and email as text, not as menu items", async () => {
  const user = userEvent.setup();
  renderAs(ALEX);
  await user.click(await screen.findByRole("button", { name: "Account: Alex Rivera, AR" }));
  expect(screen.getByRole("menu")).toBeInTheDocument();
  expect(screen.getByText("Alex Rivera")).toBeInTheDocument();
  expect(screen.getByText("alex@team.example")).toBeInTheDocument();
  expect(screen.queryByRole("menuitem", { name: /Alex Rivera/ })).not.toBeInTheDocument();
  expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual([
    "Light",
    "Dark",
    "System",
  ]);
  expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
});

test("a person with no name is shown by their email, once", async () => {
  const user = userEvent.setup();
  renderAs(SAM);
  const button = await screen.findByRole("button", { name: "Account: sam@team.example, S" });
  expect(button).toHaveTextContent("S");
  await user.click(button);
  expect(screen.getAllByText("sam@team.example")).toHaveLength(1);
});

test("the current theme has a check, and choosing one by mouse applies it and closes the menu", async () => {
  const user = userEvent.setup();
  renderAs(ALEX);
  const button = await screen.findByRole("button", { name: "Account: Alex Rivera, AR" });
  await user.click(button);
  expect(theme("Light")).toHaveAttribute("aria-checked", "true");
  expect(theme("Light").querySelector(".lucide-check")).not.toBeNull();
  expect(theme("Dark").querySelector(".lucide-check")).toBeNull();

  await user.click(theme("Dark"));
  expect(html).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());

  await user.click(button);
  expect(theme("Dark")).toHaveAttribute("aria-checked", "true");
  await user.click(theme("Light"));
  expect(html).not.toHaveAttribute("data-theme");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
});

test("each theme can be chosen with the keyboard", async () => {
  const user = userEvent.setup();
  renderAs(ALEX);
  const button = await screen.findByRole("button", { name: "Account: Alex Rivera, AR" });
  button.focus();

  /** Opens the menu with Enter, presses the keys, and waits for focus to come back. */
  async function choose(keys: string) {
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard(keys);
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
  }

  await choose("{End}{ArrowUp}{Enter}");
  expect(localStorage.getItem(THEME_KEY)).toBe("system");
  // The stand-in device is set to dark.
  expect(html).toHaveAttribute("data-theme", "dark");

  await choose("{Home}{ArrowDown}{Enter}");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");

  await choose("{Home}{Enter}");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
  expect(html).not.toHaveAttribute("data-theme");
});

test("Sign out works by mouse", async () => {
  const user = userEvent.setup();
  renderAs(ALEX);
  await user.click(await screen.findByRole("button", { name: "Account: Alex Rivera, AR" }));
  await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
  expect(signOut).toHaveBeenCalledOnce();
});

test("Sign out works by keyboard", async () => {
  const user = userEvent.setup();
  renderAs(ALEX);
  (await screen.findByRole("button", { name: "Account: Alex Rivera, AR" })).focus();
  await user.keyboard("{Enter}");
  await user.keyboard("{End}{Enter}");
  expect(signOut).toHaveBeenCalledOnce();
});

test("if the person can't be loaded, the button is still there, so signing out still works", async () => {
  const user = userEvent.setup();
  renderAs(null);
  await user.click(await screen.findByRole("button", { name: "Account" }));
  await user.click(screen.getByRole("menuitem", { name: "Sign out" }));
  expect(signOut).toHaveBeenCalledOnce();
});

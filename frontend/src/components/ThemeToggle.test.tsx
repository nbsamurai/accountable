import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test } from "vitest";
import { THEME_KEY } from "../lib/theme";
import { ThemeToggle } from "./ThemeToggle";

const html = document.documentElement;

afterEach(() => {
  localStorage.clear();
  html.removeAttribute("data-theme");
});

const toggle = () => screen.getByRole("button", { name: "Dark mode" });

test("a Dark mode button that isn't pressed in light mode", () => {
  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute("aria-pressed", "false");
});

test("pressed when the page is already dark", () => {
  html.setAttribute("data-theme", "dark");
  render(<ThemeToggle />);
  expect(toggle()).toHaveAttribute("aria-pressed", "true");
});

test("a click switches to dark and stores it, and a second click switches back", async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);
  await user.click(toggle());
  expect(toggle()).toHaveAttribute("aria-pressed", "true");
  expect(html).toHaveAttribute("data-theme", "dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");

  await user.click(toggle());
  expect(toggle()).toHaveAttribute("aria-pressed", "false");
  expect(html).not.toHaveAttribute("data-theme");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
});

test("Space and Enter switch it too, and focus shows its name in a tooltip", async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);
  await user.tab();
  expect(toggle()).toHaveFocus();
  expect(await screen.findByRole("tooltip")).toHaveTextContent("Dark mode");
  await user.keyboard(" ");
  expect(toggle()).toHaveAttribute("aria-pressed", "true");
  await user.keyboard("{Enter}");
  expect(toggle()).toHaveAttribute("aria-pressed", "false");
});

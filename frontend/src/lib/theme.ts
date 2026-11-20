import { useSyncExternalStore } from "react";

/** Light or dark mode (spec 4.1). Light is the default. */
export type Theme = "light" | "dark";

/** Where the choice is kept, per browser profile. */
export const THEME_KEY = "accountable-theme";

const html = () => document.documentElement;

/** The stored choice. Light when nothing is stored, the value is unknown, or storage is blocked. */
export function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Shows a theme: dark sets data-theme="dark" on <html>, and light removes it. */
export function applyTheme(theme: Theme) {
  if (theme === "dark") html().setAttribute("data-theme", "dark");
  else html().removeAttribute("data-theme");
}

const listeners = new Set<() => void>();

/** Shows the choice and stores it. When storage is blocked, it lasts until the page reloads. */
export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage is blocked. The page still shows the choice.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function shownTheme(): Theme {
  return html().getAttribute("data-theme") === "dark" ? "dark" : "light";
}

/** The theme on the page, and a function that saves a new one. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  return [useSyncExternalStore(subscribe, shownTheme), saveTheme];
}

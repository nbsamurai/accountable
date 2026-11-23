import { useSyncExternalStore } from "react";

/** Light, Dark or System (spec 4.1). Light is the default. System follows the device. */
export type Theme = "light" | "dark" | "system";

/** What the page shows. System shows the device's light or dark setting. */
export type ShownTheme = "light" | "dark";

/** Where the choice is kept, per browser profile. */
export const THEME_KEY = "accountable-theme";

const THEMES: readonly string[] = ["light", "dark", "system"] satisfies Theme[];
const DEVICE_DARK = "(prefers-color-scheme: dark)";

const html = () => document.documentElement;

/** The stored choice. Light when nothing is stored, the value is unknown, or storage is blocked. */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored && THEMES.includes(stored) ? (stored as Theme) : "light";
  } catch {
    return "light";
  }
}

/** The device's setting. Light when the browser can't tell. */
function device(): MediaQueryList | undefined {
  return typeof window.matchMedia === "function" ? window.matchMedia(DEVICE_DARK) : undefined;
}

function shownFor(theme: Theme): ShownTheme {
  if (theme === "system") return device()?.matches ? "dark" : "light";
  return theme;
}

// The choice, kept here too, so it lasts until a reload when the browser blocks storage.
let choice: Theme | null = null;
const listeners = new Set<() => void>();

const current = (): Theme => (choice ??= readTheme());

/** Shows a theme: dark sets data-theme="dark" on <html>, and light removes it. */
export function applyTheme(theme: Theme) {
  choice = theme;
  if (shownFor(theme) === "dark") html().setAttribute("data-theme", "dark");
  else html().removeAttribute("data-theme");
  listeners.forEach((listener) => listener());
}

/** Shows the choice and stores it. When storage is blocked, it lasts until the page reloads. */
export function saveTheme(theme: Theme) {
  applyTheme(theme);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage is blocked. The page still shows the choice.
  }
}

/**
 * Shows the stored choice before the first render, and while System is chosen, follows the
 * device's setting as it changes. Returns a function that stops following it.
 */
export function startTheme(): () => void {
  applyTheme(readTheme());
  const media = device();
  const follow = () => {
    if (current() === "system") applyTheme("system");
  };
  media?.addEventListener("change", follow);
  return () => media?.removeEventListener("change", follow);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The chosen theme, and a function that saves a new one. */
export function useTheme(): [Theme, (theme: Theme) => void] {
  return [useSyncExternalStore(subscribe, current), saveTheme];
}

/** What the page shows now: light or dark. For parts that need it, such as the messages. */
export function useShownTheme(): ShownTheme {
  return useSyncExternalStore(subscribe, () =>
    html().getAttribute("data-theme") === "dark" ? "dark" : "light",
  );
}

/** Starts again from nothing, for tests. */
export function resetTheme() {
  choice = null;
}

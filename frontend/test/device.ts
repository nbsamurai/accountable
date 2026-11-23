import { vi } from "vitest";

/**
 * A stand-in for the device's light or dark setting, which jsdom doesn't have. `set` changes
 * it and fires `change`, as the browser does when the device switches.
 */
export function stubDevice(dark: boolean) {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const query = {
    get matches() {
      return dark;
    },
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) =>
      listeners.delete(listener),
  };
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => query),
  );
  return {
    set(next: boolean) {
      dark = next;
      listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
    },
    listeners,
  };
}

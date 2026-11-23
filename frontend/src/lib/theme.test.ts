import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { stubDevice } from "../../test/device";
import {
  applyTheme,
  readTheme,
  resetTheme,
  saveTheme,
  startTheme,
  THEME_KEY,
  useShownTheme,
  useTheme,
} from "./theme";

const html = document.documentElement;

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  html.removeAttribute("data-theme");
  resetTheme();
});

test("light when nothing is stored", () => {
  expect(readTheme()).toBe("light");
});

test("light, dark and system are read as stored", () => {
  for (const theme of ["light", "dark", "system"] as const) {
    localStorage.setItem(THEME_KEY, theme);
    expect(readTheme()).toBe(theme);
  }
});

test("light when the stored value is unknown", () => {
  localStorage.setItem(THEME_KEY, "purple");
  expect(readTheme()).toBe("light");
});

test("applying dark sets data-theme on <html>, and applying light removes it", () => {
  applyTheme("dark");
  expect(html).toHaveAttribute("data-theme", "dark");
  applyTheme("light");
  expect(html).not.toHaveAttribute("data-theme");
});

test("System shows the device's setting", () => {
  const device = stubDevice(true);
  applyTheme("system");
  expect(html).toHaveAttribute("data-theme", "dark");
  device.set(false);
  applyTheme("system");
  expect(html).not.toHaveAttribute("data-theme");
});

test("System shows light when the browser can't tell the device's setting", () => {
  vi.stubGlobal("matchMedia", undefined);
  applyTheme("system");
  expect(html).not.toHaveAttribute("data-theme");
});

test("saving stores each choice and shows it", () => {
  stubDevice(true);
  saveTheme("dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  expect(html).toHaveAttribute("data-theme", "dark");
  saveTheme("light");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
  expect(html).not.toHaveAttribute("data-theme");
  saveTheme("system");
  expect(localStorage.getItem(THEME_KEY)).toBe("system");
  expect(html).toHaveAttribute("data-theme", "dark");
});

test("a light or dark stored before System existed still works", () => {
  localStorage.setItem(THEME_KEY, "dark");
  startTheme();
  expect(html).toHaveAttribute("data-theme", "dark");
  const { result } = renderHook(() => useTheme());
  expect(result.current[0]).toBe("dark");
});

test("starting shows the stored choice, and System follows the device while the app is open", () => {
  const device = stubDevice(false);
  localStorage.setItem(THEME_KEY, "system");
  const stop = startTheme();
  expect(html).not.toHaveAttribute("data-theme");
  const { result } = renderHook(() => [useTheme()[0], useShownTheme()] as const);
  expect(result.current).toEqual(["system", "light"]);

  act(() => device.set(true));
  expect(html).toHaveAttribute("data-theme", "dark");
  expect(result.current).toEqual(["system", "dark"]);

  act(() => device.set(false));
  expect(html).not.toHaveAttribute("data-theme");

  stop();
  expect(device.listeners.size).toBe(0);
});

test("a change on the device leaves a Light or Dark choice alone", () => {
  const device = stubDevice(false);
  localStorage.setItem(THEME_KEY, "light");
  startTheme();
  device.set(true);
  expect(html).not.toHaveAttribute("data-theme");
});

test("light, with no error, when reading storage throws", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  expect(readTheme()).toBe("light");
});

test("saving still shows the choice until a reload, with no error, when writing storage throws", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  const { result } = renderHook(() => useTheme());
  expect(() => act(() => result.current[1]("dark"))).not.toThrow();
  expect(html).toHaveAttribute("data-theme", "dark");
  expect(result.current[0]).toBe("dark");
});

test("useTheme gives the choice and updates when it's saved", () => {
  stubDevice(true);
  const { result } = renderHook(() => [useTheme(), useShownTheme()] as const);
  expect(result.current[0][0]).toBe("light");
  act(() => result.current[0][1]("system"));
  expect(result.current[0][0]).toBe("system");
  expect(result.current[1]).toBe("dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("system");
});

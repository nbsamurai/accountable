import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { applyTheme, readTheme, saveTheme, THEME_KEY, useTheme } from "./theme";

const html = document.documentElement;

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  html.removeAttribute("data-theme");
});

test("light when nothing is stored", () => {
  expect(readTheme()).toBe("light");
});

test("dark when dark is stored", () => {
  localStorage.setItem(THEME_KEY, "dark");
  expect(readTheme()).toBe("dark");
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

test("saving stores the choice and shows it", () => {
  saveTheme("dark");
  expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  expect(html).toHaveAttribute("data-theme", "dark");
  saveTheme("light");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
  expect(html).not.toHaveAttribute("data-theme");
});

test("light, with no error, when reading storage throws", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  expect(readTheme()).toBe("light");
});

test("saving still shows the choice, with no error, when writing storage throws", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new DOMException("Blocked", "SecurityError");
  });
  expect(() => saveTheme("dark")).not.toThrow();
  expect(html).toHaveAttribute("data-theme", "dark");
});

test("useTheme follows the theme on the page and updates when it's saved", () => {
  applyTheme("dark");
  const { result } = renderHook(() => useTheme());
  expect(result.current[0]).toBe("dark");
  act(() => result.current[1]("light"));
  expect(result.current[0]).toBe("light");
  expect(localStorage.getItem(THEME_KEY)).toBe("light");
});

import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { APP_URL } from "./playwright.config";

const LIGHT_PAGE = "rgb(240, 244, 245)"; // #F0F4F5
const DARK_PAGE = "rgb(4, 35, 46)"; // #04232E

const toggle = (page: Page) => page.getByRole("banner").getByRole("button", { name: "Dark mode" });
const pageBackground = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function expectDark(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "true");
  expect(await pageBackground(page)).toBe(DARK_PAGE);
}

test("light mode is the default", async ({ page }) => {
  await page.goto("/");
  await expect(toggle(page)).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await pageBackground(page)).toBe(LIGHT_PAGE);
});

test("the toggle switches to dark mode, and the choice is remembered after a reload and on every page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await toggle(page).click();
  await expectDark(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expectDark(page);

  const sections = page.getByRole("navigation", { name: "Sections" });
  for (const name of ["Organizations", "Contacts", "Deals", "Pipeline", "Dashboard"]) {
    await sections.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expectDark(page);
  }

  await page.goto("/organizations");
  await page.getByRole("link", { name: "Northpeak Energy" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Northpeak Energy");
  await expectDark(page);

  await page.goto("/nowhere");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expectDark(page);
});

test("the choice survives a browser restart", async ({ page, browser }) => {
  await page.goto("/");
  await toggle(page).click();
  await expectDark(page);
  const saved = await page.context().storageState();
  await page.context().close();

  // A new browser context with the same profile data, as after a restart.
  const restarted = await browser.newContext({ storageState: saved, baseURL: APP_URL });
  const again = await restarted.newPage();
  await again.goto("/");
  await expect(again.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expectDark(again);

  await toggle(again).click();
  await expect(toggle(again)).toHaveAttribute("aria-pressed", "false");
  await again.reload();
  await expect(again.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expect(toggle(again)).toHaveAttribute("aria-pressed", "false");
  await expect(again.locator("html")).not.toHaveAttribute("data-theme");
  expect(await pageBackground(again)).toBe(LIGHT_PAGE);
  await restarted.close();
});

test("at 320 px the toggle is in the top bar, outside the Menu, and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/contacts");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacts");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  await expect(toggle(page)).toBeVisible();
  await toggle(page).click();
  await expectDark(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
});

/** A token's value as the browser computes it now, as an rgb() color. */
function token(page: Page, name: string) {
  return page.evaluate((property) => {
    const probe = document.createElement("div");
    probe.style.color = `var(${property})`;
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  }, name);
}

test("charts, dialogs and messages follow the mode", async ({ page }) => {
  const axisLabel = page.getByRole("region", { name: "Revenue won by month" }).locator(".recharts-cartesian-axis-tick-value").first();
  const fill = () => axisLabel.evaluate((element) => getComputedStyle(element).fill);
  // The background that shows behind an element: its own, or its nearest ancestor's.
  const background = (selector: string) =>
    page.locator(selector).first().evaluate((element) => {
      for (let at: Element | null = element; at; at = at.parentElement) {
        const color = getComputedStyle(at).backgroundColor;
        if (color !== "rgba(0, 0, 0, 0)") return color;
      }
      return "none";
    });

  await page.goto("/");
  await expect(axisLabel).toBeVisible();
  const lightLabel = await fill();
  await toggle(page).click();
  await expectDark(page);
  expect(await fill()).toBe(await token(page, "--ink-muted"));
  expect(await fill()).not.toBe(lightLabel);

  await page.goto("/organizations");
  await page.getByRole("button", { name: "Edit Northpeak Energy" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const panel = await token(page, "--panel");
  expect(panel).toBe("rgb(0, 0, 0)");
  expect(await background('[role="dialog"]')).toBe(panel);

  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  expect(await background("[data-sonner-toast]")).toBe(panel);
  await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", "dark");
});

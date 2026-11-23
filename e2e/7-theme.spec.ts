import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { APP_URL } from "./playwright.config";

const LIGHT_PAGE = "rgb(240, 244, 245)"; // #F0F4F5
const DARK_PAGE = "rgb(4, 35, 46)"; // #04232E

type Choice = "Light" | "Dark" | "System";

const account = (page: Page) => page.getByRole("banner").getByRole("button", { name: "Account: Alex Rivera" });
const pageBackground = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Chooses a theme from the user menu, which closes once it's chosen. */
async function choose(page: Page, choice: Choice) {
  await account(page).click();
  await page.getByRole("menuitemradio", { name: choice }).click();
  await expect(page.getByRole("menu")).toBeHidden();
}

/** The user menu has a check on this choice, and on no other. */
async function expectChosen(page: Page, choice: Choice) {
  await account(page).click();
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitemradio", { checked: true })).toHaveAccessibleName(choice);
  await expect(menu.getByRole("menuitemradio", { name: choice }).locator(".lucide-check")).toBeVisible();
  await expect(menu.locator(".lucide-check")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
}

async function expectDark(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await pageBackground(page)).toBe(DARK_PAGE);
}

async function expectLight(page: Page) {
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  expect(await pageBackground(page)).toBe(LIGHT_PAGE);
}

test("light is the default", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expectLight(page);
  await expectChosen(page, "Light");
});

test("Light, Dark and System come from the user menu, with a check on the current choice", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");

  await choose(page, "Dark");
  await expectDark(page);
  await expectChosen(page, "Dark");

  await choose(page, "Light");
  await expectLight(page);
  await expectChosen(page, "Light");

  // Chrome is set to dark here, so System shows dark.
  await choose(page, "System");
  await expectDark(page);
  await expectChosen(page, "System");
});

test("System follows Chrome's light and dark settings, and changes while the app is open", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await choose(page, "System");
  await expectLight(page);

  await page.emulateMedia({ colorScheme: "dark" });
  await expectDark(page);
  await page.emulateMedia({ colorScheme: "light" });
  await expectLight(page);

  // A reload on a dark device shows dark. The check for a flash of light is by hand (plan,
  // phase 3, step 3), as the retries here can't tell which script set it.
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "commit" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expectDark(page);
  await expectChosen(page, "System");

  // A Dark or Light choice ignores the device.
  await choose(page, "Light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectLight(page);
});

test("the choice is kept after a reload, and on every screen", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await choose(page, "Dark");
  await expectDark(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expectDark(page);
  await expectChosen(page, "Dark");

  const sections = page.getByRole("navigation", { name: "Sections" });
  for (const name of ["Organizations", "Contacts", "Deals", "Pipeline", "Dashboard"]) {
    await sections.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expectDark(page);
    await expect(account(page)).toBeVisible();
  }

  await page.goto("/organizations");
  await page.getByRole("link", { name: "Northpeak Energy" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Northpeak Energy");
  await expectDark(page);

  await page.goto("/nowhere");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expectDark(page);
  await expect(account(page)).toBeVisible();
});

test("the choice survives a browser restart", async ({ page, browser }) => {
  await page.goto("/");
  await choose(page, "Dark");
  await expectDark(page);
  const saved = await page.context().storageState();
  await page.context().close();

  // A new browser context with the same profile data, as after a restart.
  const restarted = await browser.newContext({ storageState: saved, baseURL: APP_URL });
  const again = await restarted.newPage();
  await again.goto("/");
  await expect(again.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expectDark(again);
  await expectChosen(again, "Dark");

  await choose(again, "Light");
  await again.reload();
  await expect(again.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
  await expectLight(again);
  await expectChosen(again, "Light");
  await restarted.close();
});

test("the choice is kept after signing out, on the sign-in screen too", async ({ page }) => {
  await page.goto("/");
  await choose(page, "Dark");
  await account(page).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await expectDark(page);

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await expectDark(page);
  expect(await page.evaluate(() => localStorage.getItem("accountable-theme"))).toBe("dark");
});

test("at 320 px the initials button is in the top bar, outside the Menu, and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const [path, title] of [
    ["/", "Dashboard"],
    ["/contacts", "Contacts"],
    ["/deals/10", "Website redesign"],
    ["/pipeline", "Pipeline"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
    await expect(account(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBe(320);
  }

  // Opening the Menu doesn't move the initials button into it.
  const menuButton = page.getByRole("button", { name: "Menu" });
  await menuButton.click();
  const sectionsMenu = page.locator(`[id="${await menuButton.getAttribute("aria-controls")}"]`);
  await expect(sectionsMenu.getByRole("link", { name: "Contacts" })).toBeVisible();
  await expect(sectionsMenu.getByRole("button", { name: /^Account/ })).toHaveCount(0);
  await expect(account(page)).toBeVisible();
  await menuButton.click();

  await choose(page, "Dark");
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

test("charts, dialogs and messages follow the theme", async ({ page }) => {
  const axisLabel = page.getByRole("region", { name: "Revenue won by month" }).locator(".recharts-cartesian-axis-tick-value").first();
  const fill = () => axisLabel.evaluate((element) => getComputedStyle(element).fill);
  // The background that shows behind an element: its own, or its nearest ancestor's.
  const background = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((element) => {
        for (let at: Element | null = element; at; at = at.parentElement) {
          const color = getComputedStyle(at).backgroundColor;
          if (color !== "rgba(0, 0, 0, 0)") return color;
        }
        return "none";
      });

  await page.goto("/");
  await expect(axisLabel).toBeVisible();
  const lightLabel = await fill();
  await choose(page, "Dark");
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

test("messages follow System when the device switches", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/organizations");
  await choose(page, "System");
  await page.emulateMedia({ colorScheme: "dark" });
  await expectDark(page);
  await page.getByRole("button", { name: "Edit Northpeak Energy" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Changes saved")).toBeVisible();
  await expect(page.locator("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", "dark");
});

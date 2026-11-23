import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const LABEL = "Search organizations, contacts and deals";

/** Searches, opens the match, and checks its page opened and the box is clear again. */
async function find(page: Page, box: Locator, typed: string, match: string, heading: string, path: RegExp) {
  await box.fill(typed);
  const option = page.getByRole("option", { name: new RegExp(`^${match}`) });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  await expect(page).toHaveURL(path);
  await expect(box).toHaveValue("");
}

test.describe("at full width", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("part of a name in another case finds an organization, a contact and a deal", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("banner").getByRole("combobox", { name: LABEL });
    await expect(box).toBeVisible();
    await expect(page.getByRole("banner").getByRole("search")).toBeVisible();

    await find(page, box, "NORTHPEAK", "Northpeak Energy", "Northpeak Energy", /\/organizations\/4$/);
    await find(page, box, "gRACE l", "Grace Liu", "Grace Liu", /\/contacts\/\d+$/);
    await find(page, box, "site REDES", "Website redesign", "Website redesign", /\/deals\/10$/);
  });

  test("the groups come in order, each match with its detail", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("combobox", { name: LABEL });
    await box.fill("RAN");
    const list = page.getByRole("listbox");
    await expect(list.getByRole("option")).toHaveCount(3);
    const groups = list.getByRole("group");
    await expect(groups).toHaveCount(3);
    await expect(groups.nth(0)).toContainText("Organizations");
    await expect(groups.nth(1)).toContainText("Contacts");
    await expect(groups.nth(2)).toContainText("Deals");
    await expect(list.getByRole("option", { name: /^Granite Bay Foods/ })).toContainText("Manufacturing");
    await expect(list.getByRole("option", { name: /^Lucy Grant/ })).toContainText("Brightlane Retail");
    await expect(list.getByRole("option", { name: /^Branch kiosk pilot/ })).toContainText(" · ");
    await expect(page.getByText("3 matches.")).toBeAttached();
  });

  test("a search with no matches says so", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("combobox", { name: LABEL }).fill("zz");
    await expect(page.getByRole("listbox")).toContainText('No matches for "zz".');
  });
});

test("at 320 px the search box is in the Menu, and the same search works", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/contacts");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacts");
  await expect(page.getByRole("combobox", { name: LABEL })).toBeHidden();

  await page.getByRole("button", { name: "Menu" }).click();
  const box = page.getByRole("combobox", { name: LABEL });
  await expect(box).toBeVisible();
  await box.fill("website");
  await page.getByRole("option", { name: /^Website redesign/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Website redesign");
  await expect(page.getByRole("button", { name: "Menu" })).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

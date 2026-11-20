import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/** Runs axe on the page as it is now, and lists any violations with the elements they're on. */
async function expectNoViolations(page: Page) {
  // Colors are only final once a dialog has finished fading in.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"));
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const found = results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
  expect(found).toEqual([]);
}

// Every test runs in light mode and in dark mode (spec 10.3).
for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} mode`, () => {
    test.use({ theme });

    test.afterEach(async ({ page }) => {
      const shown = await page.locator("html").getAttribute("data-theme");
      expect(shown ?? "light", "the mode the test ran in").toBe(theme);
    });

    const SCREENS = [
      { path: "/", title: "Dashboard" },
      { path: "/organizations", title: "Organizations" },
      { path: "/contacts", title: "Contacts" },
      { path: "/deals", title: "Deals" },
      { path: "/pipeline", title: "Pipeline" },
      { path: "/nowhere", title: "Page not found" },
    ];

    for (const screen of SCREENS) {
      test(`axe finds nothing on ${screen.title}`, async ({ page }) => {
        await page.goto(screen.path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(screen.title);
        if (screen.path === "/") await expect(page.getByRole("region", { name: "Revenue won by month" }).locator("svg.recharts-surface")).toBeVisible();
        if (screen.path === "/pipeline") await expect(page.getByRole("region", { name: "Pipeline board" })).toBeVisible();
        await expectNoViolations(page);
      });
    }

    test("charts and their table views pass axe", async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto("/");
      await expect(page.getByRole("region", { name: "Revenue won by month" }).locator("svg.recharts-surface")).toBeVisible();
      await expect(page.getByRole("region", { name: "Deals won by month" }).locator("svg.recharts-surface")).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("dashboard.png"), fullPage: true });
      for (const name of ["Revenue won by month", "Sales funnel", "Deals won by month"]) {
        const panel = page.getByRole("region", { name, exact: true });
        await panel.getByRole("button", { name: "Show as table" }).click();
        await expect(panel.getByRole("table", { name })).toBeVisible();
        await expectNoViolations(page);
        await panel.getByRole("button", { name: "Show chart" }).click();
      }
    });

    test("the board and open More menu pass axe", async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto("/pipeline");
      await expect(page.getByRole("link", { name: "Website redesign" })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath("pipeline.png"), fullPage: true });
      await page.getByRole("button", { name: "More actions for Route optimization" }).click();
      await expect(page.getByRole("menu", { name: "Actions for Route optimization" })).toBeVisible();
      await expectNoViolations(page);
      await page.screenshot({ path: testInfo.outputPath("pipeline-menu.png"), fullPage: true });
    });

    const TABLES = [
      { path: "/organizations", add: "Add organization", edit: "Edit Northpeak Energy", remove: "Delete Northpeak Energy" },
      { path: "/contacts", add: "Add contact", edit: "Edit Ana Lopez", remove: "Delete Ana Lopez" },
      { path: "/deals", add: "Add deal", edit: "Edit Website redesign", remove: "Delete Website redesign" },
    ];

    for (const table of TABLES) {
      test(`axe finds nothing on ${table.path} with its rows, form dialogs and delete dialog`, async ({ page }) => {
        await page.goto(table.path);
        await expect(page.locator("tbody tr").first()).toBeVisible();
        await expectNoViolations(page);

        await page.getByRole("button", { name: table.add }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expectNoViolations(page);
        // With the errors showing.
        await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
        await expect(page.getByRole("dialog").getByText("Enter a name.")).toBeVisible();
        await expectNoViolations(page);
        await page.keyboard.press("Escape");

        await page.getByRole("button", { name: table.edit }).click();
        await expect(page.getByRole("dialog")).toBeVisible();
        await expectNoViolations(page);
        await page.keyboard.press("Escape");

        await page.getByRole("button", { name: table.remove }).click();
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await expectNoViolations(page);
      });
    }

    test("axe finds nothing with a picker open", async ({ page }) => {
      await page.goto("/deals");
      await page.getByRole("button", { name: "Add deal" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Show main contact options" }).click();
      await expect(page.getByRole("listbox")).toBeVisible();
      await expectNoViolations(page);
    });

    test("record pages reflow and activity dialogs pass axe", async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      for (const [path, name, file] of [
        ["/organizations/4", "Northpeak Energy", "organization"],
        ["/contacts/16", "Grace Liu", "contact"],
        ["/deals/10", "Website redesign", "deal"],
      ]) {
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
        if (file !== "organization") await expect(page.getByRole("region", { name: "Timeline" }).getByRole("listitem").first()).toBeVisible();
        await expectNoViolations(page);
        await page.screenshot({ path: testInfo.outputPath(`${file}.png`), fullPage: true });
        await page.setViewportSize({ width: 320, height: 640 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
        await expectNoViolations(page);
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      const timeline = page.getByRole("region", { name: "Timeline" });
      await timeline.getByRole("button", { name: /^Edit/ }).first().click();
      await expect(page.getByRole("dialog", { name: "Edit activity" })).toBeVisible();
      await expectNoViolations(page);
      await page.keyboard.press("Escape");
      await timeline.getByRole("button", { name: /^Delete/ }).first().click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expectNoViolations(page);
    });

    test("icon buttons show their name in a tooltip on hover and on keyboard focus", async ({ page }) => {
      await page.goto("/organizations");
      const edit = page.getByRole("button", { name: "Edit Brightlane Retail" });
      await expect(edit).toBeVisible();
      // React Aria counts a hover only once the mouse has moved over the page, and Playwright's
      // hover() jumps onto the button in one step. So the mouse travels there, as a hand would.
      const box = (await edit.boundingBox())!;
      await page.mouse.move(box.x - 200, box.y + 40);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
      await expect(page.getByRole("tooltip")).toHaveText("Edit Brightlane Retail");
      await expectNoViolations(page);

      await page.mouse.move(0, 500);
      await expect(page.getByRole("tooltip")).toBeHidden();
      const toggle = page.getByRole("button", { name: "Dark mode" });
      await page.keyboard.press("Tab");
      await toggle.focus();
      await expect(page.getByRole("tooltip")).toHaveText("Dark mode");
      await expectNoViolations(page);
    });

    test("the skip link is the first thing to get focus, and moves focus to the main area", async ({ page }) => {
      await page.goto("/contacts");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacts");
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to main content" });
      await expect(skip).toBeFocused();
      await expect(skip).toBeVisible();
      await page.keyboard.press("Enter");
      await expect(page.locator("main")).toBeFocused();
    });

    test("focus moves to the h1 when a new screen opens", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Deals" }).click();
      const heading = page.getByRole("heading", { level: 1 });
      await expect(heading).toHaveText("Deals");
      await expect(heading).toBeFocused();
      await expect(page).toHaveTitle("Deals · Accountable");
    });

    test("at 320 px wide, the Menu button opens the sections and nothing scrolls sideways", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto("/");
      const menu = page.getByRole("button", { name: "Menu" });
      await menu.click();
      await expect(menu).toHaveAttribute("aria-expanded", "true");
      await page.getByRole("link", { name: "Contacts" }).click();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Contacts");
      await expect(menu).toHaveAttribute("aria-expanded", "false");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBe(0);
      await expectNoViolations(page);
      for (const [path, ready] of [
        ["/", page.getByRole("region", { name: "Key figures" })],
        ["/organizations", page.locator("tbody tr").first()],
        ["/deals", page.locator("tbody tr").first()],
        ["/pipeline", page.getByRole("region", { name: "Pipeline board" })],
        ["/nowhere", page.getByRole("heading", { name: "Page not found" })],
      ] as const) {
        await page.goto(path);
        await expect(ready).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBe(320);
        await expectNoViolations(page);
      }
    });

    test("arrow keys scroll the narrow board and linked tables from their controls", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.goto("/pipeline");
      const board = page.getByRole("region", { name: "Pipeline board" });
      await board.getByRole("button", { name: "Add deal to New" }).press("ArrowRight");
      await expect.poll(() => board.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

      await page.goto("/organizations");
      await page.getByRole("link", { name: "Northpeak Energy" }).click();
      const contacts = page.getByRole("region", { name: "Linked contacts" });
      await contacts.getByRole("link").first().press("ArrowRight");
      await expect.poll(() => contacts.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    });
  });
}

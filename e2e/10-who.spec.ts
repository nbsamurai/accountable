import type { APIRequestContext, Browser, Page } from "@playwright/test";
import { API_URL, expect, JORDAN, localToken, signInContext, test } from "./fixtures";
import { APP_URL } from "./playwright.config";

const timeline = (page: Page) => page.getByRole("region", { name: "Timeline" });

/** A second browser, signed in as Jordan Blake, as a teammate on another computer. */
async function jordansPage(browser: Browser, request: APIRequestContext) {
  const context = await browser.newContext({ baseURL: APP_URL });
  await signInContext(context, await localToken(request, JORDAN));
  return context.newPage();
}

/** Today in the browser's time zone, as the caption writes it: "Nov 22, 2026". */
function today(page: Page) {
  return page.evaluate(() => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }));
}

test("a record added by Alex and changed by Jordan shows both names", async ({ page, browser, request }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Add organization" }).click();
  await page.getByRole("dialog").getByRole("textbox", { name: "Name" }).fill("Whodunit Supplies");
  await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Organization added")).toBeVisible();
  await page.getByRole("link", { name: "Whodunit Supplies" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Whodunit Supplies");
  const date = await today(page);
  const caption = page.getByText(/^Added by/);
  await expect(caption).toHaveText(`Added by Alex Rivera on ${date}.`);

  const jordan = await jordansPage(browser, request);
  await jordan.goto(page.url());
  await jordan.getByRole("button", { name: "Edit" }).click();
  await jordan.getByRole("dialog").getByRole("textbox", { name: "Industry" }).fill("Retail");
  await jordan.getByRole("dialog").getByRole("button", { name: "Save" }).click();
  await expect(jordan.getByText("Changes saved")).toBeVisible();
  await jordan.context().close();

  await page.reload();
  await expect(caption).toHaveText(`Added by Alex Rivera on ${date}. Last changed by Jordan Blake on ${date}.`);
});

test("a call Jordan logs and a deal Jordan moves on the board name Jordan in the timeline", async ({ page, browser, request, api }) => {
  const board = await (await api.get(`${API_URL}/api/pipeline`)).json();
  const card = board.columns.find((column: { stage: string }) => column.stage === "new").cards[0] as { id: number; name: string };
  const jordan = await jordansPage(browser, request);

  await jordan.goto(`/deals/${card.id}`);
  await jordan.getByRole("radiogroup", { name: "Type" }).getByText("Call", { exact: true }).click();
  await jordan.getByRole("textbox", { name: "Description" }).fill("Jordan called about the budget");
  await jordan.getByRole("button", { name: "Log activity" }).click();
  await expect(timeline(jordan).getByRole("listitem").first()).toContainText("Jordan called about the budget");

  await jordan.goto("/pipeline");
  await jordan.getByRole("button", { name: `More actions for ${card.name}` }).click();
  await jordan.getByRole("menuitem", { name: "Qualified", exact: true }).click();
  await expect(jordan.getByText(`${card.name} moved to Qualified.`)).toBeVisible();
  await jordan.context().close();

  await page.goto(`/deals/${card.id}`);
  const [moved, called] = [timeline(page).getByRole("listitem").nth(0), timeline(page).getByRole("listitem").nth(1)];
  await expect(moved).toContainText("Moved from New to Qualified");
  await expect(moved).toContainText(/, \d{1,2}:\d{2} [AP]M by Jordan Blake/);
  await expect(called).toContainText("Jordan called about the budget");
  await expect(called).toContainText("by Jordan Blake");
  await expect(page.getByText(/Last changed by Jordan Blake on/)).toBeVisible();
});

import type { Locator, Page } from "@playwright/test";
import { API_URL, expect, test } from "./fixtures";

const board = (page: Page) => page.getByRole("region", { name: "Pipeline board" });
const column = (page: Page, name: string) => board(page).getByRole("region", { name, exact: true });
const cards = (region: Locator) => region.getByRole("listitem");

async function drag(page: Page, from: Locator, target: Locator, position: "before" | "after") {
  await from.scrollIntoViewIfNeeded();
  const source = (await from.boundingBox())!;
  const destination = (await target.boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x + destination.width / 2, position === "before" ? destination.y + 4 : destination.y + destination.height - 3, { steps: 12 });
  await page.mouse.up();
}

test.use({ viewport: { width: 1440, height: 1000 } });

test("the mouse moves cards between and within columns and recalculates totals before saving", async ({ page }) => {
  await page.goto("/pipeline");
  const summary = page.getByRole("region", { name: "Pipeline summary" });
  const proposal = column(page, "Proposal");
  const negotiation = column(page, "Negotiation");
  const card = page.getByRole("button", { name: "Move Website redesign" });
  await expect(proposal.getByRole("link", { name: "Website redesign" })).toBeVisible();
  await expect(summary).toContainText("$280,825");
  const hold = Promise.withResolvers<void>();
  await page.route("**/api/deals/10/move", async (route) => {
    await hold.promise;
    await route.continue();
  }, { times: 1 });
  try {
    await drag(page, card, cards(negotiation).first(), "before");
    await expect(cards(negotiation).first()).toContainText("Website redesign");
    await expect(cards(negotiation).first()).toContainText("75%");
    await expect(summary).toContainText("$292,825");
  } finally {
    hold.resolve();
  }
  await expect(page.getByText("Website redesign moved to Negotiation.")).toBeVisible();
  await page.reload();
  await expect(cards(negotiation).first()).toContainText("Website redesign");
  const reordered = page.waitForResponse((r) => r.url().endsWith("/deals/10/move") && r.ok());
  await drag(page, card, cards(negotiation).nth(1), "after");
  await reordered;
  await page.reload();
  await expect(cards(negotiation).nth(1)).toContainText("Website redesign");
  await page.goto("/deals?q=website redesign");
  await expect(page.getByRole("row", { name: /Website redesign/ })).toContainText("75%");
  await page.getByRole("link", { name: "Website redesign" }).click();
  await expect(page.getByText("Moved from Proposal to Negotiation")).toBeVisible();
});

test("a failed move restores the card and its totals", async ({ page, allowError }) => {
  allowError(/409/);
  await page.goto("/pipeline");
  const proposal = column(page, "Proposal");
  const card = proposal.getByRole("button", { name: "Move Route optimization" });
  await expect(card).toBeVisible();
  const summary = page.getByRole("region", { name: "Pipeline summary" });
  const before = await summary.innerText();
  await page.route("**/api/deals/*/move", (route) => route.fulfill({ status: 409, json: { detail: "Test failure" } }), { times: 1 });
  await drag(page, card, cards(column(page, "Negotiation")).first(), "before");
  await expect(page.getByText("Couldn't move Route optimization. The card was put back.")).toBeVisible();
  await expect(card).toBeVisible();
  await expect.poll(() => summary.innerText()).toBe(before);
});

test("columns create deals at the top, show recent closures and honor stage changes from a deal page", async ({ page, api }) => {
  await page.goto("/pipeline");
  const won = column(page, "Won");
  const lost = column(page, "Lost");
  await expect(cards(won)).toHaveCount(2);
  await expect(cards(lost)).toHaveCount(1);
  await expect(column(page, "Proposal").getByText("Late")).toBeVisible();
  const qualified = column(page, "Qualified");
  await qualified.getByRole("button", { name: "Add deal to Qualified" }).click();
  const form = page.getByRole("dialog", { name: "Add deal" });
  await expect(form.getByRole("button", { name: /stage/i })).toContainText("Qualified");
  await form.getByRole("textbox", { name: "Name" }).fill("Pipeline test deal");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(cards(qualified).first()).toContainText("Pipeline test deal");
  await page.getByRole("button", { name: "Add deal", exact: true }).click();
  await expect(form.getByRole("button", { name: /stage/i })).toContainText("New");
  await page.keyboard.press("Escape");
  await qualified.getByRole("link", { name: "Pipeline test deal" }).click();
  await page.getByRole("radiogroup", { name: "Deal stage" }).getByText("Proposal", { exact: true }).click();
  await expect(page.getByText("Pipeline test deal moved to Proposal.")).toBeVisible();
  await page.goto("/pipeline");
  await expect(cards(column(page, "Proposal")).first()).toContainText("Pipeline test deal");
  const response = await api.get(`${API_URL}/api/pipeline`);
  expect(response.ok()).toBe(true);
});

test("winning a deal updates the customer and close date, and reopening keeps both", async ({ page, api }) => {
  const created = await api.post(`${API_URL}/api/deals`, { data: { name: "Won from board", stage: "negotiation", organization_id: 4, contact_id: 16 } });
  expect(created.ok()).toBe(true);
  const { deal } = await created.json();
  await page.goto("/pipeline");
  await column(page, "Negotiation").getByRole("button", { name: "More actions for Won from board" }).click();
  await page.getByRole("menuitem", { name: "Won", exact: true }).click();
  await expect(page.getByText("Won from board moved to Won. Grace Liu is now a customer.")).toBeVisible();
  const won = column(page, "Won");
  await expect(cards(won).first()).toContainText("100%");
  const saved = await (await api.get(`${API_URL}/api/deals/${deal.id}`)).json();
  const data = await (await api.get(`${API_URL}/api/pipeline`)).json();
  expect(saved.close_date).toBe(data.today);

  const yesterday = new Date(`${data.today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const earlier = yesterday.toISOString().slice(0, 10);
  await api.patch(`${API_URL}/api/deals/${deal.id}`, { data: { close_date: earlier } });
  await page.reload();
  await won.getByRole("button", { name: "More actions for Won from board" }).click();
  await page.getByRole("menuitem", { name: "Negotiation", exact: true }).click();
  await expect(page.getByText("Won from board moved to Negotiation.")).toBeVisible();
  await expect(cards(column(page, "Negotiation")).first()).toContainText("Late");
  expect((await (await api.get(`${API_URL}/api/deals/${deal.id}`)).json()).close_date).toBe(earlier);
  expect((await (await api.get(`${API_URL}/api/contacts/16`)).json()).status).toBe("customer");
});

test("a deal added in Won says its main contact became a customer", async ({ page, api }) => {
  await page.goto("/pipeline");
  await column(page, "Won").getByRole("button", { name: "Add deal to Won" }).click();
  const form = page.getByRole("dialog", { name: "Add deal" });
  await form.getByRole("textbox", { name: "Name" }).fill("Signed on the spot");
  await form.getByRole("combobox", { name: "Main contact" }).fill("Lucy Grant");
  await page.getByRole("option", { name: /Lucy Grant/ }).click();
  await form.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Deal added. Lucy Grant is now a customer.")).toBeVisible();
  await expect(cards(column(page, "Won")).first()).toContainText("Signed on the spot");
  const contacts = await (await api.get(`${API_URL}/api/contacts`, { params: { q: "Lucy Grant" } })).json();
  expect(contacts.items[0].status).toBe("customer");
});

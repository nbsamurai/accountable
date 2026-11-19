import type { Page } from "@playwright/test";
import { API_URL, expect, seed, test } from "./fixtures";

async function measure(page: Page, path: string, ready: ReturnType<Page["locator"]>) {
  await page.goto(path);
  await expect(ready).toBeVisible();
  await page.goto(path, { waitUntil: "commit" });
  await expect(ready).toBeVisible();
  return await page.evaluate(() => performance.now());
}

test("every screen opens within one second in Chrome on the large data set", async ({ page, request }) => {
  seed(true);
  try {
    const contacts = await (await request.get(`${API_URL}/api/contacts`)).json();
    const deals = await (await request.get(`${API_URL}/api/deals`)).json();
    const contact = contacts.items.find((item: { activity_count: number }) => item.activity_count > 0);
    const deal = deals.items.find((item: { activity_count: number }) => item.activity_count > 0);
    const cases = [
      ["/", page.getByRole("region", { name: "Key figures" })],
      ["/organizations", page.locator("tbody tr").first()],
      ["/contacts", page.locator("tbody tr").first()],
      ["/deals", page.locator("tbody tr").first()],
      ["/organizations/1", page.getByRole("region", { name: "Organization figures" })],
      [`/contacts/${contact.id}`, page.getByRole("region", { name: "Timeline" }).getByRole("listitem").first()],
      [`/deals/${deal.id}`, page.getByRole("region", { name: "Timeline" }).getByRole("listitem").first()],
      ["/pipeline", page.getByRole("region", { name: "Pipeline board" }).getByRole("link").first()],
    ] as const;
    for (const [path, ready] of cases) {
      const elapsed = await measure(page, path, ready);
      console.log(`${path}: ${elapsed.toFixed(0)} ms`);
      expect.soft(elapsed, path).toBeLessThan(1_000);
    }
    const data = await (await request.get(`${API_URL}/api/pipeline`)).json();
    expect(data.totals.count).toBe(1000);
    const proposal = page.getByRole("region", { name: "Proposal", exact: true });
    await expect(proposal.getByRole("listitem")).toHaveCount(50);
    const count = data.columns.find((column: { stage: string }) => column.stage === "proposal").count;
    await proposal.getByRole("button", { name: `Show ${count - 50} more` }).click();
    await expect(proposal.getByRole("listitem")).toHaveCount(count);
    await page.goto("/contacts");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("51–100 of 5,000")).toBeVisible();
  } finally {
    seed();
  }
});

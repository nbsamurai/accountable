import type { Page } from "@playwright/test";
import { API_URL, expect, seed, test } from "./fixtures";

async function measure(page: Page, path: string, ready: ReturnType<Page["locator"]>) {
  await page.goto(path);
  await expect(ready).toBeVisible();
  await page.goto(path, { waitUntil: "commit" });
  await expect(ready).toBeVisible();
  return await page.evaluate(() => performance.now());
}

/** The search box waits this long after typing stops (spec 4.12), which the limit leaves out. */
const SEARCH_WAIT = 250;

/**
 * The time from typing in the top bar's search box to its matches being shown and counted,
 * less the wait. The live region speaks only once the term's own matches have come, not while
 * the last term's still show. "an" is in many names of each kind, so the server has the most
 * to sort. One search first warms the route, as the screens get one load first.
 */
async function measureSearch(page: Page) {
  const search = page.getByRole("banner").getByRole("search");
  const box = search.getByRole("combobox", { name: "Search organizations, contacts and deals" });
  const live = search.locator("[aria-live]");
  await box.fill("er");
  await expect(live).toHaveText("15 matches.");
  await box.fill("");
  await expect(live).toBeEmpty();
  const started = await page.evaluate(() => performance.now());
  await box.fill("an");
  const ended = await live.evaluate(
    (region) =>
      new Promise<number>((resolve) => {
        new MutationObserver(() => {
          if (region.textContent) resolve(performance.now());
        }).observe(region, { childList: true, characterData: true, subtree: true });
      }),
  );
  await expect(live).toHaveText("15 matches.");
  return ended - started - SEARCH_WAIT;
}

// Spec 7: under a second on a developer's computer. GitHub's runners load the dev
// server's modules more slowly, so CI allows 4 seconds, which still catches big slowdowns.
const LIMIT = process.env.CI ? 4_000 : 1_000;

test("every screen opens within the time limit in Chrome on the large data set", async ({ page, api }) => {
  test.slow(!!process.env.CI, "Each page load takes longer on GitHub's runners");
  seed(true);
  try {
    const contacts = await (await api.get(`${API_URL}/api/contacts`)).json();
    const deals = await (await api.get(`${API_URL}/api/deals`)).json();
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
      expect.soft(elapsed, path).toBeLessThan(LIMIT);
    }
    const data = await (await api.get(`${API_URL}/api/pipeline`)).json();
    expect(data.totals.count).toBe(1000);
    const proposal = page.getByRole("region", { name: "Proposal", exact: true });
    await expect(proposal.getByRole("listitem")).toHaveCount(50);
    const count = data.columns.find((column: { stage: string }) => column.stage === "proposal").count;
    await proposal.getByRole("button", { name: `Show ${count - 50} more` }).click();
    await expect(proposal.getByRole("listitem")).toHaveCount(count);
    await page.goto("/contacts");
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("51–100 of 5,000")).toBeVisible();
    // Last, because the open list hides the rest of the page from the checks above.
    const searched = await measureSearch(page);
    console.log(`search: ${searched.toFixed(0)} ms after the wait`);
    expect.soft(searched, "search in the top bar").toBeLessThan(LIMIT);
  } finally {
    seed();
  }
});

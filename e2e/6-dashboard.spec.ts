import { API_URL, expect, test } from "./fixtures";
import { money, number, percent, plural } from "../frontend/src/lib/format";
import { FUNNEL_STAGES, isOpen, OPEN_STAGES, type Stage } from "../frontend/src/lib/stages";

type Deal = { value: number | null; probability: number; stage: Stage; close_date: string | null };

test("the scoreboard, stage bar, and chart tables match the deals API", async ({ page, request }) => {
  const deals: Deal[] = (await (await request.get(`${API_URL}/api/deals`)).json()).items;
  const { today } = await (await request.get(`${API_URL}/api/pipeline`)).json();
  const month = today.slice(0, 7);
  const open = deals.filter((deal) => isOpen(deal.stage));
  const value = (deals: Deal[]) => deals.reduce((sum, deal) => sum + (deal.value ?? 0), 0);
  const expected = Math.round(open.reduce((sum, deal) => sum + (deal.value ?? 0) * deal.probability, 0) / 100);
  const lastYear = new Date(`${month}-01T00:00:00Z`);
  lastYear.setUTCMonth(lastYear.getUTCMonth() - 11);
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(lastYear);
    date.setUTCMonth(date.getUTCMonth() + i);
    return date.toISOString().slice(0, 7);
  });
  const closed = deals.filter((deal) => !isOpen(deal.stage) && months.includes(deal.close_date?.slice(0, 7) ?? ""));
  const won = closed.filter((deal) => deal.stage === "won");
  const wonMonth = won.filter((deal) => deal.close_date?.startsWith(month));
  await page.goto("/");
  const figures = page.getByRole("region", { name: "Key figures" });
  await expect(figures.locator("dd.mono")).toHaveText([money(value(open)), money(expected), money(value(wonMonth)), percent(won.length * 100 / closed.length)]);
  const bar = figures.getByRole("list", { name: "Open pipeline by stage" });
  for (const step of OPEN_STAGES) {
    await expect(bar.getByRole("listitem").filter({ hasText: step.name })).toContainText(money(value(open.filter((deal) => deal.stage === step.key))));
  }
  for (const name of ["Revenue won by month", "Deals won by month"]) {
    const panel = page.getByRole("region", { name, exact: true });
    await panel.getByRole("button", { name: "Show as table" }).click();
    const rows = panel.getByRole("table").locator("tbody tr");
    await expect(rows).toHaveCount(12);
    for (const [index, key] of months.entries()) {
      const monthly = won.filter((deal) => deal.close_date?.startsWith(key));
      const values = name.startsWith("Revenue") ? [money(value(monthly)), number(monthly.length)] : [number(monthly.length)];
      await expect(rows.nth(index).locator("td")).toHaveText(values);
    }
  }
  const funnel = page.getByRole("region", { name: "Sales funnel", exact: true });
  await funnel.getByRole("button", { name: "Show as table" }).click();
  const eligible = deals.filter((deal) => deal.stage !== "lost");
  for (const [index, step] of FUNNEL_STAGES.entries()) {
    const included = FUNNEL_STAGES.slice(index).map((stage) => stage.key);
    const reached = eligible.filter((deal) => included.includes(deal.stage));
    const reachedValue = money(value(reached));
    const share = percent(value(reached) * 100 / value(eligible));
    await expect(funnel.getByRole("row", { name: new RegExp(step.name) }).locator("td")).toHaveText([
      String(reached.length), reachedValue, share,
    ]);
    await expect(funnel.getByText(`${step.name}, ${plural(reached.length, "deal")} worth ${reachedValue} (${share}).`, {
      exact: false,
    })).toBeVisible();
  }
});

test("winning on the board refreshes the dashboard figures and recent activity", async ({ page }) => {
  await page.goto("/");
  const figures = page.getByRole("region", { name: "Key figures" });
  await expect(figures).toContainText("$612,000");
  await expect(figures).toContainText("$18,000");
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Pipeline" }).click();
  await page.getByRole("button", { name: "More actions for Website redesign" }).click();
  await page.getByRole("menuitem", { name: "Won", exact: true }).click();
  await expect(page.getByText("Website redesign moved to Won. Grace Liu is now a customer.")).toBeVisible();
  await page.getByRole("navigation", { name: "Sections" }).getByRole("link", { name: "Dashboard" }).click();
  await expect(figures).toContainText("$564,000");
  await expect(figures).toContainText("$66,000");
  await expect(figures).toContainText("11 won of 15 closed in 12 months");
  await expect(page.getByRole("region", { name: "Recent activity" })).toContainText("Moved from Proposal to Won");
  const revenue = page.getByRole("region", { name: "Revenue won by month", exact: true });
  await revenue.getByRole("button", { name: "Show as table" }).click();
  await expect(revenue.getByRole("row").last()).toContainText("$66,000");
});

test("the dashboard stacks follow-ups above key figures below 1100 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 1099, height: 900 });
  await page.goto("/");
  const followUps = page.getByRole("region", { name: "Follow-ups", exact: true });
  const figures = page.getByRole("region", { name: "Key figures", exact: true });
  await expect(figures).toBeVisible();
  const follow = (await followUps.boundingBox())!;
  const score = (await figures.boundingBox())!;
  expect(score.y).toBeGreaterThan(follow.y + follow.height);
  expect(score.x).toBe(follow.x);
});

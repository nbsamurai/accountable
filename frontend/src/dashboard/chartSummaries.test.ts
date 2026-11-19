import { expect, test } from "vitest";
import { dealsWonSummary, revenueSummary } from "./chartSummaries";

test("chart text shows totals and the best month for each series", () => {
  const months = [
    { month: "2026-01-01", value: 1000, count: 1 },
    { month: "2026-02-01", value: 900, count: 2 },
  ];
  expect(revenueSummary(months)).toBe("Revenue won in the last 12 months: $1,900. Best month: January, $1,000.");
  expect(dealsWonSummary(months)).toBe("3 deals won in the last 12 months. Best month: February, 2 deals.");
});

test("empty months describe the absence of revenue and deals", () => {
  const months = [{ month: "2026-01-01", value: 0, count: 0 }];
  expect(revenueSummary(months)).toBe("No revenue won in the last 12 months.");
  expect(dealsWonSummary(months)).toBe("No deals won in the last 12 months.");
});

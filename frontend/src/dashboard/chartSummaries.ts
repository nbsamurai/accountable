import { money, monthName, plural } from "../lib/format";
import type { Month } from "./queries";

export function revenueSummary(months: Month[]) {
  const total = months.reduce((sum, month) => sum + month.value, 0);
  const best = months.reduce<Month | undefined>((best, month) => !best || month.value > best.value ? month : best, undefined);
  return total > 0 && best
    ? `Revenue won in the last 12 months: ${money(total)}. Best month: ${monthName(best.month)}, ${money(best.value)}.`
    : "No revenue won in the last 12 months.";
}

export function dealsWonSummary(months: Month[]) {
  const total = months.reduce((sum, month) => sum + month.count, 0);
  const best = months.reduce<Month | undefined>((best, month) => !best || month.count > best.count ? month : best, undefined);
  return total > 0 && best
    ? `${plural(total, "deal")} won in the last 12 months. Best month: ${monthName(best.month)}, ${plural(best.count, "deal")}.`
    : "No deals won in the last 12 months.";
}

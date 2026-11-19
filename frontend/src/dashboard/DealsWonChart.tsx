import { Bar, BarChart, CartesianGrid, LabelList, Tooltip, XAxis, YAxis } from "recharts";
import { monthAbbr, monthName, number, plural } from "../lib/format";
import { ChartPanel } from "./ChartPanel";
import { dealsWonSummary } from "./chartSummaries";
import type { Month } from "./queries";
import styles from "./Dashboard.module.css";

const title = "Deals won by month";
const tick = { fill: "var(--ink-muted)", fontSize: 13 };

export function DealsWonChart({ months }: { months: Month[] }) {
  const upper = Math.max(1, ...months.map((month) => month.count)) + 1;
  return (
    <ChartPanel
      title={title} summary={dealsWonSummary(months)}
      chart={
        <BarChart responsive className={styles.wonChart} data={months} accessibilityLayer aria-label={title}
          margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="month" tickFormatter={monthAbbr} tick={{ ...tick, fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={2} />
          <YAxis allowDecimals={false} domain={[0, upper]} width={20} tick={tick} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "var(--subtle)", opacity: 0.5 }} content={({ active, payload }) => {
            const month = payload[0]?.payload as Month | undefined;
            return active && month ? <div className={styles.tooltip} role="status"><strong>{monthName(month.month)}</strong><p>{plural(month.count, "deal")}</p></div> : null;
          }} />
          <Bar dataKey="count" fill="var(--info)" radius={[4, 4, 0, 0]} maxBarSize={24} minPointSize={1} isAnimationActive={false}>
            <LabelList dataKey="count" position="top" fill="var(--ink)" fontSize={12} fontFamily="var(--mono)" />
          </Bar>
        </BarChart>
      }
      table={
        <table aria-label={title}>
          <thead><tr><th scope="col">Month</th><th scope="col">Deals won</th></tr></thead>
          <tbody>{months.map((month) => (
            <tr key={month.month}><th scope="row">{monthName(month.month)} {month.month.slice(0, 4)}</th><td className="mono">{number(month.count)}</td></tr>
          ))}</tbody>
        </table>
      }
    />
  );
}

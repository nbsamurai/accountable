import { useId } from "react";
import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";
import { money, moneyShort, monthAbbr, monthName, number, plural } from "../lib/format";
import { ChartPanel } from "./ChartPanel";
import { revenueSummary } from "./chartSummaries";
import type { Month } from "./queries";
import styles from "./Dashboard.module.css";

const title = "Revenue won by month";
const tick = { fill: "var(--ink-muted)", fontSize: 13 };

export function RevenueChart({ months }: { months: Month[] }) {
  const shade = useId();
  return (
    <ChartPanel
      title={title} summary={revenueSummary(months)}
      chart={
        <AreaChart responsive className={styles.revenueChart} data={months} accessibilityLayer aria-label={title} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={shade} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="month" tickFormatter={monthAbbr} tick={tick} tickLine={false} axisLine={false} minTickGap={12} />
          <YAxis width={50} tick={tick} tickFormatter={moneyShort} tickLine={false} axisLine={false} />
          <Tooltip content={({ active, payload }) => {
            const month = payload[0]?.payload as Month | undefined;
            return active && month ? (
              <div className={styles.tooltip} role="status">
                <strong>{monthName(month.month)}</strong>
                <p><span className="mono">{money(month.value)}</span> · {plural(month.count, "deal")}</p>
              </div>
            ) : null;
          }} />
          <Area type="monotone" dataKey="value" fill={`url(#${shade})`} stroke="var(--primary-ink)" strokeWidth={2.5}
            activeDot={{ r: 4, fill: "var(--primary-ink)", stroke: "var(--panel)" }} isAnimationActive={false} />
        </AreaChart>
      }
      table={
        <table aria-label={title}>
          <thead><tr><th scope="col">Month</th><th scope="col">Revenue</th><th scope="col">Deals won</th></tr></thead>
          <tbody>{months.map((month) => (
            <tr key={month.month}><th scope="row">{monthName(month.month)} {month.month.slice(0, 4)}</th><td className="mono">{money(month.value)}</td><td className="mono">{number(month.count)}</td></tr>
          ))}</tbody>
        </table>
      }
    />
  );
}

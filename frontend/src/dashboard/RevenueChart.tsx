import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, Tooltip, XAxis, YAxis } from "recharts";
import { money, moneyShort, monthAbbr, monthName, number, plural } from "../lib/format";
import { ChartPanel } from "./ChartPanel";
import { revenueSummary } from "./chartSummaries";
import type { Month } from "./queries";
import styles from "./Dashboard.module.css";

const title = "Revenue won by month";
const tick = { fill: "var(--ink-muted)", fontSize: 12, fontFamily: "var(--mono)" };

export function RevenueChart({ months }: { months: Month[] }) {
  const shade = useId();
  const peak = months.reduce<Month | undefined>((highest, month) => !highest || month.value > highest.value ? month : highest, undefined);
  const latest = months.at(-1);
  const markers = peak && peak.value > 0 ? [peak, ...(latest && latest !== peak ? [latest] : [])] : [];
  return (
    <ChartPanel
      title={title} summary={revenueSummary(months)} wide
      chart={
        <AreaChart responsive className={styles.revenueChart} data={months} accessibilityLayer aria-label={title} margin={{ top: 28, right: 20, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={shade} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="month" tickFormatter={monthAbbr} tick={tick} tickLine={false} axisLine={false} height={32} tickMargin={9} minTickGap={8} />
          <YAxis width={56} tick={tick} tickFormatter={moneyShort} tickLine={false} axisLine={false} tickSize={0} tickMargin={10} />
          <Tooltip content={({ active, payload }) => {
            const month = payload[0]?.payload as Month | undefined;
            return active && month ? (
              <div className={styles.tooltip} role="status">
                <strong>{monthName(month.month)}</strong>
                <p><span className="mono">{money(month.value)}</span> · {plural(month.count, "deal")}</p>
              </div>
            ) : null;
          }} />
          <Area type="monotone" dataKey="value" fill={`url(#${shade})`} fillOpacity={1} stroke="var(--primary-ink)" strokeWidth={2}
            activeDot={{ r: 4, fill: "var(--primary-ink)", stroke: "var(--panel)" }} isAnimationActive={false} />
          {markers.map((month) => {
            const atEnd = month === latest;
            const below = atEnd && month !== peak && month.value > 0 && (months.at(-2)?.value ?? 0) > month.value;
            return (
              <ReferenceDot key={month.month} x={month.month} y={month.value} shape={({ cx = 0, cy = 0 }) => (
                <g aria-hidden="true" pointerEvents="none">
                  <circle cx={cx} cy={cy} r={5} fill="var(--primary-ink)" stroke="var(--panel)" strokeWidth={2} />
                  <text x={cx + (atEnd ? 4 : 0)} y={cy + (below ? 22 : -12)} textAnchor={atEnd ? "end" : "middle"}
                    fill="var(--ink)" fontFamily="var(--mono)" fontSize={12} fontWeight={600}>{money(month.value)}</text>
                </g>
              )} />
            );
          })}
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

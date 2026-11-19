import { money, moneyShort, percent, plural } from "../lib/format";
import { stage } from "../lib/stages";
import { ChartPanel } from "./ChartPanel";
import type { FunnelStep } from "./queries";
import styles from "./Dashboard.module.css";

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  return (
    <ChartPanel
      title="Sales funnel" summary="Value of the deals that reached each stage, Won included."
      chart={
        <ol className={styles.funnel} aria-label="Sales funnel by stage">
          {steps.map((step) => {
            const label = stage(step.stage);
            return (
              <li key={step.stage} className={label.className}>
                <p>{label.name}<small>{plural(step.count, "deal")}</small></p>
                <span className={styles.funnelBar} aria-hidden="true" style={{ width: `${step.share}%` }} />
                <p className="mono">{moneyShort(step.value)}<small>{percent(step.share)}</small></p>
              </li>
            );
          })}
        </ol>
      }
      table={
        <table aria-label="Sales funnel">
          <thead><tr><th scope="col">Stage</th><th scope="col">Deals</th><th scope="col">Value</th><th scope="col">Share</th></tr></thead>
          <tbody>{steps.map((step) => (
            <tr key={step.stage}><th scope="row">{stage(step.stage).name}</th><td className="mono">{step.count}</td><td className="mono">{money(step.value)}</td><td className="mono">{percent(step.share)}</td></tr>
          ))}</tbody>
        </table>
      }
    />
  );
}

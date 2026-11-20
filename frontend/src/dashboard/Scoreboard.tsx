import { Panel } from "../components/Panel";
import { StageBar } from "../components/StageBar";
import { money, number, percent, plural } from "../lib/format";
import type { Dashboard } from "./queries";
import styles from "./Dashboard.module.css";

export function Scoreboard({ data }: { data: Dashboard }) {
  const { pipeline, won_this_month: won, win_rate: rate } = data;
  return (
    <Panel aria-label="Key figures">
      <dl className={styles.score}>
        <div><dt>Open pipeline</dt><dd className="mono">{money(pipeline.value)}</dd><dd>{plural(pipeline.count, "open deal")}</dd></div>
        <div><dt>Expected revenue</dt><dd className="mono">{money(pipeline.expected_revenue)}</dd><dd>Value × probability of close</dd></div>
        <div><dt>Won this month</dt><dd className="mono">{money(won.value)}</dd><dd>{plural(won.count, "deal")}</dd></div>
        <div><dt>Win rate</dt><dd className="mono">{percent(rate.percent)}</dd><dd>{number(rate.won)} won of {number(rate.closed)} closed in 12 months</dd></div>
      </dl>
      <StageBar label="Open pipeline by stage" total={pipeline.value} count={pipeline.count} stages={pipeline.stages} />
    </Panel>
  );
}

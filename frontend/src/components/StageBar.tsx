import { money, plural } from "../lib/format";
import { OPEN_STAGES, type Stage } from "../lib/stages";
import styles from "./StageBar.module.css";

export function StageBar({ stages, total, count, label }: {
  stages: { stage: Stage; value: number }[];
  total: number;
  count: number;
  label: string;
}) {
  const segments = OPEN_STAGES.map((stage) => ({ ...stage, value: stages.find((item) => item.stage === stage.key)?.value ?? 0 }));
  return (
    <div className={styles.stageBar}>
      <div className={styles.heading}><strong>{label}</strong><span>{money(total)} in {plural(count, "deal")}</span></div>
      <div className={styles.track} aria-hidden="true">
        {segments.filter((segment) => segment.value > 0).map((segment) => (
          <span key={segment.key} className={segment.className} style={{ flexGrow: segment.value }} />
        ))}
      </div>
      <ul className={styles.legend} aria-label={label}>
        {segments.map((segment) => (
          <li key={segment.key} className={segment.className} style={{ flexGrow: total ? segment.value / total : 0 }}>
            <span className={styles.label}>{segment.name}</span>
            <span className="mono">{money(segment.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

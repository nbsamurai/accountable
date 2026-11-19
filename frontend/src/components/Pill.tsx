import { stage, status, type Stage, type Status } from "../lib/stages";
import styles from "./Pill.module.css";

/** A stage's name on its fill (spec 5.3). The name is always text, so color is never the only sign. */
export function StagePill({ value, count }: { value: Stage; count?: number }) {
  const info = stage(value);
  return (
    <span className={`${styles.pill} ${info.className}`}>
      {info.name}
      {count !== undefined && <span className={`${styles.count} mono`}>{count}</span>}
    </span>
  );
}

export function StatusPill({ value }: { value: Status }) {
  const info = status(value);
  return <span className={`${styles.pill} ${info.className}`}>{info.name}</span>;
}

import { Clock } from "lucide-react";
import styles from "./LateBadge.module.css";

/** Raspberry ink with white text, a clock and the word "Late" (spec 5.3). */
export function LateBadge() {
  return (
    <span className={styles.late}>
      <Clock size={12} aria-hidden="true" strokeWidth={2.5} />
      Late
    </span>
  );
}

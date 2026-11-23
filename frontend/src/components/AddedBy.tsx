import type { Authored } from "../lib/api";
import { dayOf, EMPTY } from "../lib/format";
import styles from "./AddedBy.module.css";

type Props = { record: Authored & { created_at: string; updated_at: string } };

/**
 * The caption under a record's name (spec 3.11): who added it and when, and once it has
 * changed, who last changed it and when. "–" stands for no one recorded.
 */
export function AddedBy({ record }: Props) {
  const changed =
    record.updated_at !== record.created_at || record.updated_by?.id !== record.created_by?.id;
  return (
    <p className={styles.caption}>
      Added by {record.created_by?.name ?? EMPTY} on {dayOf(record.created_at)}.
      {changed &&
        ` Last changed by ${record.updated_by?.name ?? EMPTY} on ${dayOf(record.updated_at)}.`}
    </p>
  );
}

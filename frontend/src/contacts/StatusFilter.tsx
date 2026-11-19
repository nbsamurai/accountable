import { ToggleButton, ToggleButtonGroup } from "react-aria-components";
import { number } from "../lib/format";
import type { StatusCounts } from "./queries";
import styles from "./StatusFilter.module.css";

const OPTIONS = [
  { key: "all", label: "All" },
  { key: "lead", label: "Leads" },
  { key: "qualified", label: "Qualified" },
  { key: "customer", label: "Customers" },
] as const;

type Props = {
  value: string | undefined;
  counts: StatusCounts | undefined;
  onChange: (status: string | null) => void;
};

/** "All 40", "Leads 16", "Qualified 10" and "Customers 14". The counts follow the search. */
export function StatusFilter({ value, counts, onChange }: Props) {
  return (
    <ToggleButtonGroup
      aria-label="Status"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value ?? "all"]}
      onSelectionChange={(keys) => {
        const key = [...keys][0];
        onChange(key === "all" || key === undefined ? null : String(key));
      }}
      className={styles.group}
    >
      {OPTIONS.map((option) => (
        <ToggleButton key={option.key} id={option.key} className={styles.option}>
          {option.label}
          <span className={`${styles.count} mono`}>{counts ? number(counts[option.key]) : ""}</span>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

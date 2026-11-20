import { Table2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import styles from "./Dashboard.module.css";

export function ChartPanel({
  title,
  summary,
  chart,
  table,
  wide = false,
}: {
  title: string;
  summary: string;
  chart: ReactNode;
  table: ReactNode;
  wide?: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  return (
    <Panel aria-label={title}>
      <div className={wide ? `${styles.chartHead} ${styles.chartHeadWide}` : styles.chartHead}>
        <h2>{title}</h2>
        <Button
          variant="quiet"
          icon={<Table2 size={16} aria-hidden="true" />}
          onPress={() => setShowTable(!showTable)}
        >
          {showTable ? "Show chart" : "Show as table"}
        </Button>
        <p className={styles.summary}>{summary}</p>
      </div>
      {showTable ? <div className={styles.chartTable}>{table}</div> : chart}
    </Panel>
  );
}

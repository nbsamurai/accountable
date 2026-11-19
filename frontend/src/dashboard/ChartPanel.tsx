import { Table2 } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import styles from "./Dashboard.module.css";

export function ChartPanel({ title, summary, chart, table }: {
  title: string;
  summary: string;
  chart: ReactNode;
  table: ReactNode;
}) {
  const id = useId();
  const [showTable, setShowTable] = useState(false);
  return (
    <Panel title={title} titleId={id} className={styles.chartPanel}
      actions={<Button variant="quiet" icon={<Table2 size={16} aria-hidden="true" />} onPress={() => setShowTable(!showTable)}>{showTable ? "Show chart" : "Show as table"}</Button>}>
      <p className={styles.summary}>{summary}</p>
      {showTable ? <div className={styles.chartTable}>{table}</div> : chart}
    </Panel>
  );
}

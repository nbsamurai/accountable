import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ActivityForm } from "../activities/ActivityForm";
import { Timeline } from "../activities/Timeline";
import { LateBadge } from "../components/LateBadge";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StagePill } from "../components/Pill";
import { RecordActions, RecordFallback, useRecordId } from "../components/RecordPage";
import styles from "../components/RecordPage.module.css";
import { date, EMPTY, money, percent } from "../lib/format";
import { DealForm, DeleteDealDialog } from "./DealForm";
import { StagePath } from "./StagePath";
import { useDeal, type DealDetail } from "./queries";

export default function DealPage() {
  const id = useRecordId();
  const record = useDeal(id);
  if (!record.data || record.isError) {
    return <RecordFallback kind="deal" section="Deals" error={record.error} missing={!id} onRetry={() => void record.refetch()} />;
  }
  return <DealRecord key={record.data.id} deal={record.data} />;
}

function DealRecord({ deal }: { deal: DealDetail }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | null>(null);
  const navigate = useNavigate();
  const close = () => setDialog(null);
  const target = { area: "deals", id: deal.id } as const;
  return (
    <>
      <PageHeader
        title={deal.name}
        aside={<><StagePill value={deal.stage} />{deal.late && <LateBadge />}</>}
        actions={<RecordActions onEdit={() => setDialog("edit")} onDelete={() => setDialog("delete")} />}
      />
      <div className={styles.stack}>
        <Panel title="Deal details">
          <dl className={styles.facts}>
            <div><dt>Value</dt><dd className="mono">{money(deal.value)}</dd></div>
            <div><dt>Probability</dt><dd className="mono">{percent(deal.probability)}</dd></div>
            <div><dt>Expected revenue</dt><dd className="mono">{money(deal.expected_revenue)}</dd></div>
            <div><dt>Close date</dt><dd>{date(deal.close_date)}</dd></div>
            <div><dt>Organization</dt><dd>{deal.organization ? <Link to={`/organizations/${deal.organization.id}`}>{deal.organization.name}</Link> : EMPTY}</dd></div>
            <div><dt>Main contact</dt><dd>{deal.contact ? <Link to={`/contacts/${deal.contact.id}`}>{deal.contact.name}</Link> : EMPTY}</dd></div>
          </dl>
        </Panel>
        <Panel title="Stage path"><StagePath deal={deal} /></Panel>
        <ActivityForm target={target} />
        <Timeline target={target} />
      </div>
      {dialog === "edit" && <DealForm deal={deal} isOpen onClose={close} />}
      {dialog === "delete" && <DeleteDealDialog deal={deal} onClose={close} onDeleted={() => navigate("/deals")} />}
    </>
  );
}

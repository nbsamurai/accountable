import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/Button";
import { DataTable, type TableColumn } from "../components/DataTable";
import { LateBadge } from "../components/LateBadge";
import { PageHeader } from "../components/PageHeader";
import { StagePill } from "../components/Pill";
import { date, EMPTY, money, percent } from "../lib/format";
import { useUrlState } from "../lib/useUrlState";
import { DealForm, DeleteDealDialog } from "./DealForm";
import { useDeals, type Deal } from "./queries";
import styles from "./DealListPage.module.css";

const COLUMNS: TableColumn<Deal>[] = [
  { id: "name", header: "Name", cell: (d) => <Link to={`/deals/${d.id}`}>{d.name}</Link> },
  {
    id: "organization",
    header: "Organization",
    cell: (d) => (d.organization ? <Link to={`/organizations/${d.organization.id}`}>{d.organization.name}</Link> : EMPTY),
  },
  {
    id: "contact",
    header: "Main contact",
    cell: (d) => (d.contact ? <Link to={`/contacts/${d.contact.id}`}>{d.contact.name}</Link> : EMPTY),
  },
  { id: "stage", header: "Stage", cell: (d) => <StagePill value={d.stage} /> },
  { id: "value", header: "Value", align: "end", cell: (d) => <span className="mono">{money(d.value)}</span> },
  { id: "probability", header: "Probability", align: "end", cell: (d) => <span className="mono">{percent(d.probability)}</span> },
  {
    id: "expected_revenue",
    header: "Expected revenue",
    align: "end",
    cell: (d) => <span className="mono">{money(d.expected_revenue)}</span>,
  },
  {
    id: "close_date",
    header: "Close date",
    cell: (d) => (
      <span className={styles.close}>
        {date(d.close_date)}
        {d.late && <LateBadge />}
      </span>
    ),
  },
];

export default function DealListPage() {
  const [state, update] = useUrlState("name");
  const { data, isLoading, isFetching } = useDeals(state);
  const [editing, setEditing] = useState<Deal | "new" | null>(null);
  const [deleting, setDeleting] = useState<Deal | null>(null);

  return (
    <>
      <PageHeader
        title="Deals"
        actions={
          <Button variant="primary" icon={<Plus size={18} aria-hidden="true" />} onPress={() => setEditing("new")}>
            Add deal
          </Button>
        }
      />
      <DataTable
        noun={{ one: "deal", many: "deals" }}
        columns={COLUMNS}
        rows={data?.items}
        total={data?.total}
        isLoading={isLoading}
        isFetching={isFetching}
        state={state}
        onChange={update}
        addLabel="Add deal"
        onAdd={() => setEditing("new")}
        onEdit={setEditing}
        onDelete={setDeleting}
      />
      <DealForm deal={editing === "new" ? null : editing} isOpen={editing !== null} onClose={() => setEditing(null)} />
      <DeleteDealDialog deal={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/Button";
import { DataTable, type TableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { EMPTY, money, number } from "../lib/format";
import { useUrlState } from "../lib/useUrlState";
import { DeleteOrganizationDialog, OrganizationForm } from "./OrganizationForm";
import { useOrganizations, type Organization } from "./queries";

const COLUMNS: TableColumn<Organization>[] = [
  { id: "name", header: "Name", cell: (o) => <Link to={`/organizations/${o.id}`}>{o.name}</Link> },
  { id: "industry", header: "Industry", cell: (o) => o.industry ?? EMPTY },
  { id: "website", header: "Website", cell: (o) => (o.website ? o.website.replace(/^https?:\/\//, "") : EMPTY) },
  { id: "contacts", header: "Contacts", align: "end", cell: (o) => <span className="mono">{number(o.contact_count)}</span> },
  { id: "open_deals", header: "Open deals", align: "end", cell: (o) => <span className="mono">{number(o.open_deal_count)}</span> },
  {
    id: "open_pipeline",
    header: "Open pipeline (US$)",
    align: "end",
    cell: (o) => <span className="mono">{money(o.open_pipeline)}</span>,
  },
];

export default function OrganizationListPage() {
  const [state, update] = useUrlState("name");
  const { data, isLoading, isFetching } = useOrganizations(state);
  const [editing, setEditing] = useState<Organization | "new" | null>(null);
  const [deleting, setDeleting] = useState<Organization | null>(null);

  return (
    <>
      <PageHeader
        title="Organizations"
        actions={
          <Button variant="primary" icon={<Plus size={18} aria-hidden="true" />} onPress={() => setEditing("new")}>
            Add organization
          </Button>
        }
      />
      <DataTable
        noun={{ one: "organization", many: "organizations" }}
        columns={COLUMNS}
        rows={data?.items}
        total={data?.total}
        isLoading={isLoading}
        isFetching={isFetching}
        state={state}
        onChange={update}
        addLabel="Add organization"
        onAdd={() => setEditing("new")}
        onEdit={setEditing}
        onDelete={setDeleting}
      />
      <OrganizationForm
        organization={editing === "new" ? null : editing}
        isOpen={editing !== null}
        onClose={() => setEditing(null)}
      />
      <DeleteOrganizationDialog organization={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

import { Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "../components/Button";
import { DataTable, type TableColumn } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { StatusPill } from "../components/Pill";
import { EMPTY } from "../lib/format";
import { useUrlState } from "../lib/useUrlState";
import { ContactForm, DeleteContactDialog } from "./ContactForm";
import { useContacts, type Contact } from "./queries";
import { StatusFilter } from "./StatusFilter";

const COLUMNS: TableColumn<Contact>[] = [
  { id: "name", header: "Name", cell: (c) => <Link to={`/contacts/${c.id}`}>{c.name}</Link> },
  {
    id: "organization",
    header: "Organization",
    cell: (c) => (c.organization ? <Link to={`/organizations/${c.organization.id}`}>{c.organization.name}</Link> : EMPTY),
  },
  { id: "job_title", header: "Job title", cell: (c) => c.job_title ?? EMPTY },
  { id: "email", header: "Email", cell: (c) => c.email ?? EMPTY },
  { id: "phone", header: "Phone", cell: (c) => c.phone ?? EMPTY },
  { id: "status", header: "Status", cell: (c) => <StatusPill value={c.status} /> },
];

export default function ContactListPage() {
  const [state, update] = useUrlState("name", ["status"]);
  const { data, isLoading, isFetching } = useContacts(state);
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const [deleting, setDeleting] = useState<Contact | null>(null);

  return (
    <>
      <PageHeader
        title="Contacts"
        actions={
          <Button variant="primary" icon={<Plus size={18} aria-hidden="true" />} onPress={() => setEditing("new")}>
            Add contact
          </Button>
        }
      />
      <DataTable
        noun={{ one: "contact", many: "contacts" }}
        columns={COLUMNS}
        rows={data?.items}
        total={data?.total}
        isLoading={isLoading}
        isFetching={isFetching}
        state={state}
        onChange={update}
        addLabel="Add contact"
        onAdd={() => setEditing("new")}
        onEdit={setEditing}
        onDelete={setDeleting}
        isFiltered={!!state.filters.status}
        filters={
          <StatusFilter
            value={state.filters.status}
            counts={data?.status_counts}
            onChange={(status) => update({ filters: { status } })}
          />
        }
      />
      <ContactForm contact={editing === "new" ? null : editing} isOpen={editing !== null} onClose={() => setEditing(null)} />
      <DeleteContactDialog contact={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

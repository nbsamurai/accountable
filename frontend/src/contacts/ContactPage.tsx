import { Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ActivityForm } from "../activities/ActivityForm";
import { Timeline } from "../activities/Timeline";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/Pill";
import { RecordActions, RecordFallback, useRecordId } from "../components/RecordPage";
import styles from "../components/RecordPage.module.css";
import { DealForm } from "../deals/DealForm";
import { LinkedDeals } from "../deals/LinkedDeals";
import { ContactForm, DeleteContactDialog } from "./ContactForm";
import { useContact, type ContactDetail } from "./queries";

export default function ContactPage() {
  const id = useRecordId();
  const record = useContact(id);
  if (!record.data || record.isError) {
    return <RecordFallback kind="contact" section="Contacts" error={record.error} missing={!id} onRetry={() => void record.refetch()} />;
  }
  return <ContactRecord key={record.data.id} contact={record.data} />;
}

function ContactRecord({ contact }: { contact: ContactDetail }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | "deal" | null>(null);
  const navigate = useNavigate();
  const close = () => setDialog(null);
  const { organization } = contact;
  const target = { area: "contacts", id: contact.id } as const;

  return (
    <>
      <PageHeader title={contact.name} aside={<StatusPill value={contact.status} />} actions={<RecordActions onEdit={() => setDialog("edit")} onDelete={() => setDialog("delete")} />}>
        <div className={styles.meta}>
          {(contact.job_title || organization) && (
            <span>
              {contact.job_title}{contact.job_title && organization && " at "}
              {organization && <Link to={`/organizations/${organization.id}`}>{organization.name}</Link>}
            </span>
          )}
          {contact.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
        </div>
      </PageHeader>
      <div className={styles.split}>
        <div className={styles.stack}>
          <ActivityForm target={target} />
          <Timeline target={target} />
        </div>
        <Panel title="Deals" titleId="contact-deals" actions={<Button onPress={() => setDialog("deal")} icon={<Plus size={16} aria-hidden="true" />}>Add deal</Button>}>
          <LinkedDeals deals={contact.deals} />
        </Panel>
      </div>
      {dialog === "edit" && <ContactForm contact={contact} isOpen onClose={close} />}
      {dialog === "delete" && <DeleteContactDialog contact={contact} onClose={close} onDeleted={() => navigate("/contacts")} />}
      {dialog === "deal" && <DealForm deal={null} defaults={{ contact: { id: contact.id, name: contact.name, organization_id: organization?.id ?? null, organization_name: organization?.name ?? null } }} isOpen onClose={close} />}
    </>
  );
}

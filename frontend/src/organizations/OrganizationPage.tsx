import { ExternalLink, Plus } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "../components/Button";
import { PageHeader } from "../components/PageHeader";
import { Panel } from "../components/Panel";
import { StatusPill } from "../components/Pill";
import { RecordActions, RecordFallback, useRecordId } from "../components/RecordPage";
import styles from "../components/RecordPage.module.css";
import { ContactForm } from "../contacts/ContactForm";
import { DealForm } from "../deals/DealForm";
import { LinkedDeals } from "../deals/LinkedDeals";
import { EMPTY, money } from "../lib/format";
import { DeleteOrganizationDialog, OrganizationForm } from "./OrganizationForm";
import { useOrganization, type OrganizationDetail } from "./queries";

export default function OrganizationPage() {
  const id = useRecordId();
  const record = useOrganization(id);
  if (!record.data || record.isError) {
    return (
      <RecordFallback
        kind="organization"
        section="Organizations"
        error={record.error}
        missing={!id}
        onRetry={() => void record.refetch()}
      />
    );
  }
  return <OrganizationRecord key={record.data.id} organization={record.data} />;
}

function OrganizationRecord({ organization }: { organization: OrganizationDetail }) {
  const [dialog, setDialog] = useState<"edit" | "delete" | "contact" | "deal" | null>(null);
  const navigate = useNavigate();
  const close = () => setDialog(null);
  const { figures } = organization;

  return (
    <>
      <PageHeader
        title={organization.name}
        actions={
          <RecordActions onEdit={() => setDialog("edit")} onDelete={() => setDialog("delete")} />
        }
      >
        {(organization.industry || organization.website) && (
          <div className={styles.meta}>
            {organization.industry && <span>{organization.industry}</span>}
            {organization.website && (
              <a href={organization.website} target="_blank" rel="noreferrer">
                {organization.website} <span className="sr-only">(opens in a new tab)</span>
                <ExternalLink aria-hidden="true" size={13} style={{ display: "inline" }} />
              </a>
            )}
          </div>
        )}
      </PageHeader>
      <div className={styles.stack}>
        <Panel aria-label="Organization figures">
          <dl className={styles.facts}>
            <div>
              <dt>Open pipeline</dt>
              <dd className="mono">{money(figures.open_pipeline)}</dd>
            </div>
            <div>
              <dt>Expected revenue</dt>
              <dd className="mono">{money(figures.expected_revenue)}</dd>
            </div>
            <div>
              <dt>Won to date</dt>
              <dd className="mono">{money(figures.won_to_date)}</dd>
            </div>
          </dl>
        </Panel>
        {organization.notes && (
          <Panel title="Notes">
            <p className={styles.notes}>{organization.notes}</p>
          </Panel>
        )}
        <Panel
          title="Contacts"
          titleId="organization-contacts"
          actions={
            <Button
              onPress={() => setDialog("contact")}
              icon={<Plus size={16} aria-hidden="true" />}
            >
              Add contact
            </Button>
          }
        >
          {organization.contacts.length ? (
            <div className={styles.tableScroll} role="region" aria-label="Linked contacts">
              <table className={styles.relatedTable} aria-label="Contacts">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Job title</th>
                    <th scope="col">Status</th>
                    <th scope="col">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {organization.contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>
                        <Link to={`/contacts/${contact.id}`}>{contact.name}</Link>
                      </td>
                      <td>{contact.job_title || EMPTY}</td>
                      <td>
                        <StatusPill value={contact.status} />
                      </td>
                      <td>
                        {contact.email ? (
                          <a href={`mailto:${contact.email}`}>{contact.email}</a>
                        ) : (
                          EMPTY
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.muted}>No contacts yet.</p>
          )}
        </Panel>
        <Panel
          title="Deals"
          titleId="organization-deals"
          actions={
            <Button onPress={() => setDialog("deal")} icon={<Plus size={16} aria-hidden="true" />}>
              Add deal
            </Button>
          }
        >
          <LinkedDeals deals={organization.deals} showCloseDate />
        </Panel>
      </div>
      {dialog === "edit" && <OrganizationForm organization={organization} onClose={close} />}
      {dialog === "delete" && (
        <DeleteOrganizationDialog
          organization={organization}
          onClose={close}
          onDeleted={() => navigate("/organizations")}
        />
      )}
      {dialog === "contact" && (
        <ContactForm contact={null} organization={organization} onClose={close} />
      )}
      {dialog === "deal" && <DealForm deal={null} defaults={{ organization }} onClose={close} />}
    </>
  );
}

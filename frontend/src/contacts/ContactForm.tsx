import { useEffect, useState } from "react";
import { Label, Radio, RadioGroup } from "react-aria-components";
import { toast } from "sonner";
import { DeleteDialog } from "../components/DeleteDialog";
import { fieldStyles, TextInput } from "../components/Field";
import { FormDialog } from "../components/FormDialog";
import { Picker, searchOrganizations, type OrganizationOption } from "../components/Picker";
import type { Ref } from "../lib/api";
import { contactMessage } from "../lib/deleteMessages";
import { STATUSES, type Status } from "../lib/stages";
import { useFormErrors } from "../lib/useSave";
import { useContact, useDeleteContact, useSaveContact, type Contact, type ContactDetail } from "./queries";
import styles from "./ContactForm.module.css";

type FormValues = {
  name: string;
  email: string;
  phone: string;
  job_title: string;
  organization: OrganizationOption | null;
  status: Status;
};

function valuesOf(contact: Contact | null, organization: Ref | null): FormValues {
  return {
    name: contact?.name ?? "",
    email: contact?.email ?? "",
    phone: contact?.phone ?? "",
    job_title: contact?.job_title ?? "",
    organization: contact ? contact.organization : organization,
    status: contact?.status ?? "lead",
  };
}

type FormProps = {
  /** The contact to edit, or null to add one. */
  contact: Contact | null;
  /** For a new contact, the organization to fill in, such as from its page. */
  organization?: Ref | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (saved: ContactDetail) => void;
};

/** Name, Email, Phone, Job title, Organization and Status (spec 4.8). */
export function ContactForm({ contact, organization = null, isOpen, onClose, onSaved }: FormProps) {
  const [values, setValues] = useState(() => valuesOf(contact, organization));
  const errors = useFormErrors();
  const save = useSaveContact();

  useEffect(() => {
    if (isOpen) {
      setValues(valuesOf(contact, organization));
      errors.clear();
    }
    // Only when the dialog opens, so typing isn't reset by a refresh behind it.
  }, [isOpen]);

  const set = (field: "name" | "email" | "phone" | "job_title") => (value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  function submit() {
    const { organization: picked, ...rest } = values;
    save.mutate(
      { id: contact?.id, values: { ...rest, organization_id: picked?.id ?? null } },
      {
        onSuccess: (saved) => {
          toast.success(contact ? "Changes saved" : "Contact added");
          onClose();
          onSaved?.(saved);
        },
        onError: errors.show,
      },
    );
  }

  return (
    <FormDialog
      title={contact ? "Edit contact" : "Add contact"}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={submit}
      isPending={save.isPending}
      fieldErrors={errors.fieldErrors}
      formError={errors.formError}
    >
      <TextInput name="name" label="Name" value={values.name} onChange={set("name")} requiredMessage="Enter a name." autoFocus />
      <div className={fieldStyles.row}>
        <TextInput name="email" label="Email" value={values.email} onChange={set("email")} inputMode="email" />
        <TextInput name="phone" label="Phone" value={values.phone} onChange={set("phone")} inputMode="tel" />
      </div>
      <TextInput name="job_title" label="Job title" value={values.job_title} onChange={set("job_title")} />
      <Picker
        label="Organization"
        name="organization_id"
        selected={values.organization}
        onChange={(picked) => setValues((v) => ({ ...v, organization: picked }))}
        search={searchOrganizations}
        searchKey={[]}
        noneLabel="No organization"
      />
      <RadioGroup
        name="status"
        value={values.status}
        onChange={(status) => setValues((v) => ({ ...v, status: status as Status }))}
        orientation="horizontal"
        className={fieldStyles.field}
      >
        <Label className={fieldStyles.label}>Status</Label>
        <div className={styles.radios}>
          {STATUSES.map((status) => (
            <Radio key={status.key} value={status.key} className={styles.radio}>
              {status.name}
            </Radio>
          ))}
        </div>
      </RadioGroup>
    </FormDialog>
  );
}

type DeleteProps = {
  contact: { id: number; name: string } | null;
  onClose: () => void;
  onDeleted?: () => void;
};

/** "Delete Jane Doe? Their 2 deals will be kept, without a main contact. Their 6 activities will be deleted." */
export function DeleteContactDialog({ contact, onClose, onDeleted }: DeleteProps) {
  const { data } = useContact(contact?.id);
  const remove = useDeleteContact();
  const message = data && contact ? contactMessage(data.name, data.deal_count, data.activity_count) : null;

  return (
    <DeleteDialog
      message={message}
      isOpen={!!contact && !!message}
      onClose={onClose}
      isPending={remove.isPending}
      onConfirm={() =>
        contact &&
        remove.mutate(contact.id, {
          onSuccess: () => {
            toast.success("Contact deleted");
            onClose();
            onDeleted?.();
          },
          onError: (error) => toast.error(error.message, { duration: Infinity }),
        })
      }
    />
  );
}

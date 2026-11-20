import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DeleteDialog } from "../components/DeleteDialog";
import { TextInput } from "../components/Field";
import { FormDialog } from "../components/FormDialog";
import { organizationMessage } from "../lib/deleteMessages";
import { useFormErrors } from "../lib/useSave";
import {
  useDeleteOrganization,
  useOrganization,
  useSaveOrganization,
  type Organization,
  type OrganizationDetail,
  type OrganizationValues,
} from "./queries";

const EMPTY: OrganizationValues = { name: "", website: "", industry: "", notes: "" };

function valuesOf(organization: Organization | null): OrganizationValues {
  if (!organization) return EMPTY;
  return {
    name: organization.name,
    website: organization.website ?? "",
    industry: organization.industry ?? "",
    notes: organization.notes ?? "",
  };
}

type FormProps = {
  /** The organization to edit, or null to add one. */
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (saved: OrganizationDetail) => void;
};

/** Name, Website, Industry and Notes (spec 4.8). */
export function OrganizationForm({ organization, isOpen, onClose, onSaved }: FormProps) {
  const [values, setValues] = useState(EMPTY);
  const errors = useFormErrors();
  const save = useSaveOrganization();

  useEffect(() => {
    if (isOpen) {
      setValues(valuesOf(organization));
      errors.clear();
    }
    // Only when the dialog opens, so typing isn't reset by a refresh behind it.
  }, [isOpen]);

  const set = (field: keyof OrganizationValues) => (value: string) => setValues((v) => ({ ...v, [field]: value }));

  function submit() {
    save.mutate(
      { id: organization?.id, values },
      {
        onSuccess: (saved) => {
          toast.success(organization ? "Changes saved" : "Organization added");
          onClose();
          onSaved?.(saved);
        },
        onError: errors.show,
      },
    );
  }

  return (
    <FormDialog
      title={organization ? "Edit organization" : "Add organization"}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={submit}
      isPending={save.isPending}
      fieldErrors={errors.fieldErrors}
      formError={errors.formError}
    >
      <TextInput name="name" label="Name" value={values.name} onChange={set("name")} requiredMessage="Enter a name." autoFocus />
      <TextInput name="website" label="Website" value={values.website} onChange={set("website")} inputMode="url" />
      <TextInput name="industry" label="Industry" value={values.industry} onChange={set("industry")} />
      <TextInput name="notes" label="Notes" value={values.notes} onChange={set("notes")} multiline />
    </FormDialog>
  );
}

type DeleteProps = {
  organization: { id: number; name: string } | null;
  onClose: () => void;
  onDeleted?: () => void;
};

/** "Delete Northpeak? Its 4 contacts and 3 deals will be kept, without an organization." */
export function DeleteOrganizationDialog({ organization, onClose, onDeleted }: DeleteProps) {
  const { data } = useOrganization(organization?.id);
  const remove = useDeleteOrganization();
  const message = data && organization ? organizationMessage(data.name, data.contact_count, data.deal_count) : null;

  return (
    <DeleteDialog
      message={message}
      isOpen={!!organization && !!message}
      onClose={onClose}
      isPending={remove.isPending}
      onConfirm={() =>
        organization &&
        remove.mutate(organization.id, {
          onSuccess: () => {
            toast.success("Organization deleted");
            onClose();
            onDeleted?.();
          },
          onError: (error) => toast.error(error.message, { duration: Infinity }),
        })
      }
    />
  );
}

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Button as AriaButton, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components";
import { toast } from "sonner";
import { DateField } from "../components/DateField";
import { DeleteDialog } from "../components/DeleteDialog";
import { fieldStyles, TextInput } from "../components/Field";
import { FormDialog } from "../components/FormDialog";
import { Picker, searchContacts, searchOrganizations } from "../components/Picker";
import pickerStyles from "../components/Picker.module.css";
import { dealMessage } from "../lib/deleteMessages";
import { todayIso } from "../lib/format";
import { STAGES, type Stage } from "../lib/stages";
import { useFormErrors } from "../lib/useSave";
import {
  changeStage,
  check,
  contactScope,
  fromDeal,
  newDeal,
  pickContact,
  pickOrganization,
  toValues,
  type DealDefaults,
  type DealFormState,
} from "./dealFormRules";
import { useDeal, useDeleteDeal, useSaveDeal, type Deal, type DealChange } from "./queries";
import styles from "./DealForm.module.css";

type FormProps = {
  /** The deal to edit, or null to add one. */
  deal: Deal | null;
  /** For a new deal: the organization, contact or stage to start with. */
  defaults?: DealDefaults;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (change: DealChange) => void;
};

/** Name, Organization, Main contact, Stage, Value, Probability and Close date (spec 4.8). */
export function DealForm({ deal, defaults, isOpen, onClose, onSaved }: FormProps) {
  const today = todayIso();
  const [form, setForm] = useState<DealFormState>(() => (deal ? fromDeal(deal) : newDeal(defaults, today)));
  const errors = useFormErrors();
  const save = useSaveDeal();

  useEffect(() => {
    if (isOpen) {
      const start = deal ? fromDeal(deal) : newDeal(defaults, today);
      setForm(start);
      // A main contact who has moved shows straight away (spec 3.4).
      const moved = check(start).contact_id;
      errors.setFieldErrors(moved ? { contact_id: moved } : {});
    }
    // Only when the dialog opens, so typing isn't reset by a refresh behind it.
  }, [isOpen]);

  function update(next: DealFormState) {
    setForm(next);
    const moved = check(next).contact_id;
    errors.setFieldErrors(moved ? { contact_id: moved } : {});
  }

  function submit() {
    const problems = check(form);
    if (Object.keys(problems).length > 0) {
      errors.setFieldErrors(problems);
      return;
    }
    save.mutate(
      { id: deal?.id, values: toValues(form) },
      {
        onSuccess: (change) => {
          const customer = change.contact ? ` ${change.contact.name} is now a customer.` : "";
          toast.success(deal ? `Changes saved.${customer}` : `Deal added.${customer}`);
          onClose();
          onSaved?.(change);
        },
        onError: errors.show,
      },
    );
  }

  const set = (field: "name" | "value" | "probability") => (value: string) => setForm((f) => ({ ...f, [field]: value }));
  const scope = contactScope(form);

  return (
    <FormDialog
      title={deal ? "Edit deal" : "Add deal"}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={submit}
      isPending={save.isPending}
      fieldErrors={errors.fieldErrors}
      formError={errors.formError}
    >
      <TextInput name="name" label="Name" value={form.name} onChange={set("name")} requiredMessage="Enter a name." autoFocus />
      <Picker
        label="Organization"
        name="organization_id"
        selected={form.organization}
        onChange={(organization) => update(pickOrganization(form, organization))}
        search={searchOrganizations}
        searchKey={[]}
        noneLabel="No organization"
      />
      <Picker
        label="Main contact"
        name="contact_id"
        selected={form.contact}
        onChange={(contact) => update(pickContact(form, contact))}
        search={(q) => searchContacts(q, scope)}
        searchKey={[scope ?? "everyone"]}
        noneLabel="No main contact"
        description={form.organization ? `People at ${form.organization.name}` : "Everyone, with their organization"}
      />
      <div className={fieldStyles.row}>
        <Select
          name="stage"
          value={form.stage}
          onChange={(stage) => stage && setForm((f) => changeStage(f, stage as Stage, today))}
          className={fieldStyles.field}
        >
          <Label className={fieldStyles.label}>Stage</Label>
          <AriaButton className={`${fieldStyles.control} ${styles.select} st-${form.stage}`}>
            <SelectValue />
            <ChevronDown size={16} aria-hidden="true" />
          </AriaButton>
          <Popover className={pickerStyles.popover} offset={4}>
            <ListBox className={pickerStyles.list}>
              {STAGES.map((stage) => (
                <ListBoxItem key={stage.key} id={stage.key} textValue={stage.name} className={`${pickerStyles.item} ${stage.className}`}>
                  <span className={styles.option}>
                    <span className={styles.swatch} aria-hidden="true" />
                    {stage.name}
                  </span>
                </ListBoxItem>
              ))}
            </ListBox>
          </Popover>
        </Select>
        <DateField name="close_date" label="Close date" value={form.close_date} onChange={(close_date) => setForm((f) => ({ ...f, close_date }))} />
      </div>
      <div className={fieldStyles.row}>
        <TextInput name="value" label="Value (US$)" value={form.value} onChange={set("value")} inputMode="numeric" />
        <TextInput name="probability" label="Probability (%)" value={form.probability} onChange={set("probability")} inputMode="numeric" />
      </div>
    </FormDialog>
  );
}

type DeleteProps = {
  deal: { id: number; name: string } | null;
  onClose: () => void;
  onDeleted?: () => void;
};

/** "Delete Website redesign? Its 5 activities will be deleted, including its stage changes." */
export function DeleteDealDialog({ deal, onClose, onDeleted }: DeleteProps) {
  const { data } = useDeal(deal?.id);
  const remove = useDeleteDeal();
  const message = data && deal ? dealMessage(data.name, data.activity_count, data.stage_change_count) : null;

  return (
    <DeleteDialog
      message={message}
      isOpen={!!deal && !!message}
      onClose={onClose}
      isPending={remove.isPending}
      onConfirm={() =>
        deal &&
        remove.mutate(deal.id, {
          onSuccess: () => {
            toast.success("Deal deleted");
            onClose();
            onDeleted?.();
          },
          onError: (error) => toast.error(error.message, { duration: Infinity }),
        })
      }
    />
  );
}

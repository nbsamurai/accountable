import { useState, type FormEvent } from "react";
import { Form, Label, Radio, RadioGroup } from "react-aria-components";
import { toast } from "sonner";
import { Button } from "../components/Button";
import { DateField } from "../components/DateField";
import { fieldStyles, TextInput } from "../components/Field";
import { Panel } from "../components/Panel";
import { localDateTime } from "../lib/format";
import { useFormErrors } from "../lib/useSave";
import { ActivityIcon, activityLabel } from "./ActivityIcon";
import { useSaveActivity, type ActivityTarget, type ActivityValues, type EditableActivity, type LoggedType } from "./queries";
import styles from "./ActivityForm.module.css";

const LOGGED_TYPES: LoggedType[] = ["note", "call", "email"];
type Draft = { type: LoggedType; description: string; when: string | null; whenChanged: boolean; followUp: string | null };

export function activityDraft(activity?: EditableActivity): Draft {
  return {
    type: activity?.type ?? "note",
    description: activity?.description ?? "",
    when: localDateTime(activity ? new Date(activity.occurred_at) : new Date()),
    whenChanged: false,
    followUp: activity?.follow_up_date ?? null,
  };
}

export function activityValues(draft: Draft, original?: EditableActivity): ActivityValues | undefined {
  if (!draft.when) return undefined;
  return {
    type: draft.type,
    description: draft.description.trim(),
    occurred_at: draft.whenChanged ? new Date(draft.when).toISOString() : original?.occurred_at,
    follow_up_date: draft.followUp,
  };
}

export function ActivityFields({ draft, onChange, autoFocus }: { draft: Draft; onChange: (value: Draft) => void; autoFocus?: boolean }) {
  return (
    <>
      <RadioGroup name="type" value={draft.type} onChange={(type) => onChange({ ...draft, type: type as LoggedType })} orientation="horizontal" className={fieldStyles.field}>
        <Label className={fieldStyles.label}>Type</Label>
        <div className={styles.types}>
          {LOGGED_TYPES.map((type) => (
            <Radio key={type} value={type} className={styles.radio}>
              <ActivityIcon type={type} /> {activityLabel(type)}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <TextInput name="description" label="Description" value={draft.description} onChange={(description) => onChange({ ...draft, description })} requiredMessage="Enter a description." multiline autoFocus={autoFocus} />
      <div className={fieldStyles.row}>
        <DateField name="occurred_at" label="When" value={draft.when} onChange={(when) => onChange({ ...draft, when, whenChanged: true })} includeTime required />
        <DateField name="follow_up_date" label="Follow-up date" value={draft.followUp} onChange={(followUp) => onChange({ ...draft, followUp })} />
      </div>
    </>
  );
}

export function ActivityForm({ target }: { target: ActivityTarget }) {
  const [draft, setDraft] = useState(activityDraft);
  const errors = useFormErrors();
  const save = useSaveActivity();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = activityValues(draft);
    if (!values || save.isPending) return;
    errors.clear();
    save.mutate({ target, values }, {
      onSuccess: () => {
        setDraft(activityDraft());
        toast.success("Activity logged");
      },
      onError: errors.show,
    });
  }

  return (
    <Panel title="Log activity" titleId="log-activity">
      <Form onSubmit={submit} validationErrors={errors.fieldErrors} className={styles.form}>
        {errors.formError && <p role="alert" className={fieldStyles.error}>{errors.formError}</p>}
        <ActivityFields draft={draft} onChange={setDraft} />
        <div><Button variant="primary" type="submit" isPending={save.isPending}>Log activity</Button></div>
      </Form>
    </Panel>
  );
}

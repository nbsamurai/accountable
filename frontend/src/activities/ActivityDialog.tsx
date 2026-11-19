import { useState } from "react";
import { toast } from "sonner";
import { DeleteDialog } from "../components/DeleteDialog";
import { FormDialog } from "../components/FormDialog";
import { activityMessage } from "../lib/deleteMessages";
import { todayIso } from "../lib/format";
import { useFormErrors } from "../lib/useSave";
import { ActivityFields, activityDraft, activityValues } from "./ActivityForm";
import { useDeleteActivity, usePatchActivity, type EditableActivity } from "./queries";

export function EditActivityDialog({ activity, onClose }: { activity: EditableActivity; onClose: () => void }) {
  const [draft, setDraft] = useState(() => activityDraft(activity));
  const errors = useFormErrors();
  const save = usePatchActivity();

  function submit() {
    const values = activityValues(draft, activity);
    if (!values) return;
    errors.clear();
    save.mutate({ id: activity.id, values }, {
      onSuccess: () => {
        toast.success("Changes saved");
        onClose();
      },
      onError: errors.show,
    });
  }

  return (
    <FormDialog title="Edit activity" isOpen onClose={onClose} onSubmit={submit} isPending={save.isPending} fieldErrors={errors.fieldErrors} formError={errors.formError}>
      <ActivityFields draft={draft} onChange={setDraft} autoFocus />
    </FormDialog>
  );
}

export function DeleteActivityDialog({ activity, onClose, onDeleted }: { activity: EditableActivity; onClose: () => void; onDeleted: () => void }) {
  const remove = useDeleteActivity();

  return (
    <DeleteDialog
      message={activityMessage(activity.type, activity.occurred_at, todayIso())}
      isOpen onClose={onClose} isPending={remove.isPending}
      onConfirm={() => remove.mutate(activity.id, {
        onSuccess: () => {
          toast.success("Activity deleted");
          onDeleted();
        },
        onError: (error) => toast.error(error.message, { duration: Infinity }),
      })}
    />
  );
}

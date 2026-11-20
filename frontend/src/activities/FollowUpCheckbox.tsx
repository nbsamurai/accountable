import { Checkbox } from "react-aria-components";
import { toast } from "sonner";
import { usePatchActivity, type Activity } from "./queries";
import styles from "./Timeline.module.css";

export function FollowUpCheckbox({
  activity,
  showLabel = true,
}: {
  activity: Activity;
  showLabel?: boolean;
}) {
  const patch = usePatchActivity();
  const done = patch.isPending ? (patch.variables?.values.done ?? activity.done) : activity.done;
  return (
    <Checkbox
      className={styles.check}
      data-icon-only={!showLabel || undefined}
      isSelected={done}
      isReadOnly={patch.isPending}
      aria-label={`Done, ${activity.description}`}
      onChange={(done) =>
        patch.mutate(
          { id: activity.id, values: { done } },
          {
            onSuccess: () => toast.success(done ? "Follow-up marked done" : "Follow-up reopened"),
            onError: (error) => toast.error(error.message, { duration: Infinity }),
          },
        )
      }
    >
      <span className={styles.box} aria-hidden="true">
        {done ? "✓" : ""}
      </span>
      {showLabel && "Done"}
    </Checkbox>
  );
}

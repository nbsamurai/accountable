import { useRef, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { Panel } from "../components/Panel";
import { SkeletonLines } from "../components/Skeleton";
import { dateNear, dateTime, todayIso } from "../lib/format";
import { DeleteActivityDialog, EditActivityDialog } from "./ActivityDialog";
import { ActivityIcon, activityLabel } from "./ActivityIcon";
import { FollowUpCheckbox } from "./FollowUpCheckbox";
import { useTimeline, type ActivityTarget, type EditableActivity } from "./queries";
import styles from "./Timeline.module.css";

type ActivityAction = { kind: "edit" | "delete"; activity: EditableActivity };

export function Timeline({ target }: { target: ActivityTarget }) {
  const timeline = useTimeline(target);
  const [dialog, setDialog] = useState<ActivityAction | null>(null);
  const entries = timeline.data?.pages.flatMap(({ items }) => items) ?? [];
  const today = todayIso();
  const anchor = useRef<HTMLDivElement>(null);

  return (
    <Panel title="Timeline" titleId="timeline">
      <div ref={anchor} tabIndex={-1} aria-label="Timeline entries">
        {timeline.isPending && <SkeletonLines label="Loading timeline" />}
        {timeline.isError && (
          <div className={styles.error} role="status">
            <p>Couldn't load {entries.length ? "more timeline entries" : "the timeline"}.</p>
            <Button onPress={() => void (timeline.isFetchNextPageError ? timeline.fetchNextPage() : timeline.refetch())}>Try again</Button>
          </div>
        )}
        {timeline.isSuccess && !entries.length && <p className={styles.muted}>Nothing logged yet.</p>}
        <ol className={styles.entries} aria-label="Activities">
          {entries.map((activity) => {
            const editable: EditableActivity | null = activity.type === "stage_change" ? null : { ...activity, type: activity.type };
            return (
              <li key={activity.id} className={styles.entry}>
                <ActivityIcon type={activity.type} circle />
                <div className={styles.body}>
                  {editable ? <h3>{activityLabel(activity.type)}</h3> : <span className="sr-only">Stage change</span>}
                  <p className={styles.description}>{activity.description}</p>
                  <p className={styles.muted}>
                    <time dateTime={activity.occurred_at}>{dateTime(activity.occurred_at)}</time>
                    {target.area === "contacts" && activity.deal && <> on <Link to={`/deals/${activity.deal.id}`}>{activity.deal.name}</Link></>}
                  </p>
                  {activity.follow_up_date && (
                    <div className={styles.followUp}>
                      <span>Follow up <time dateTime={activity.follow_up_date}>{dateNear(activity.follow_up_date, today)}</time></span>
                      {!activity.done && activity.follow_up_date < today && <strong className={styles.overdue}>Overdue</strong>}
                      <FollowUpCheckbox activity={activity} />
                    </div>
                  )}
                </div>
                {editable && (
                  <div className={styles.actions}>
                    <IconButton label={`Edit ${activityLabel(activity.type).toLowerCase()}`} icon={<Pencil size={16} aria-hidden="true" />} onPress={() => setDialog({ kind: "edit", activity: editable })} />
                    <IconButton label={`Delete ${activityLabel(activity.type).toLowerCase()}`} icon={<Trash2 size={16} aria-hidden="true" />} onPress={() => setDialog({ kind: "delete", activity: editable })} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        {timeline.hasNextPage && !timeline.isFetchNextPageError && (
          <Button className={styles.older} isPending={timeline.isFetchingNextPage} isDisabled={timeline.isRefetching} onPress={() => void timeline.fetchNextPage()}>
            Show older
          </Button>
        )}
      </div>
      {dialog?.kind === "edit" && <EditActivityDialog activity={dialog.activity} onClose={() => setDialog(null)} />}
      {dialog?.kind === "delete" && (
        <DeleteActivityDialog activity={dialog.activity} onClose={() => setDialog(null)} onDeleted={() => {
          setDialog(null);
          requestAnimationFrame(() => anchor.current?.focus());
        }} />
      )}
    </Panel>
  );
}

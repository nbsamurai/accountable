import { ActivityIcon, activityLabel } from "../activities/ActivityIcon";
import type { Activity } from "../activities/queries";
import { Panel } from "../components/Panel";
import { when } from "../lib/format";
import styles from "./Dashboard.module.css";
import { ActivityLink } from "./FollowUps";

export function RecentActivity({ activities, today }: { activities: Activity[]; today: string }) {
  return (
    <Panel aria-label="Recent activity">
      <h2>Recent activity</h2>
      {activities.length ? (
        <ol className={styles.recent}>
          {activities.map((activity) => (
            <li key={activity.id}>
              <ActivityIcon type={activity.type} circle compact />
              <div>
                <p className={styles.todoText}>
                  <span className="sr-only">{activityLabel(activity.type)}. </span>
                  {activity.description}
                </p>
                <p className={styles.meta}>
                  <ActivityLink activity={activity} />,{" "}
                  <time dateTime={activity.occurred_at}>{when(activity.occurred_at, today)}</time>
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className={styles.summary}>Nothing logged yet.</p>
      )}
    </Panel>
  );
}

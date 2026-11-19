import { useState } from "react";
import { Link } from "react-router";
import { FollowUpCheckbox } from "../activities/FollowUpCheckbox";
import type { Activity } from "../activities/queries";
import { Button } from "../components/Button";
import { Panel } from "../components/Panel";
import { due, number } from "../lib/format";
import { FOLLOW_UP_LIMIT, followUpGroups } from "./followUpGroups";
import styles from "./Dashboard.module.css";

export function ActivityLink({ activity }: { activity: Activity }) {
  const ref = activity.deal ?? activity.contact;
  if (!ref) return null;
  const area = activity.deal ? "deals" : "contacts";
  return <Link to={`/${area}/${ref.id}`}>{ref.name}</Link>;
}

function FollowUp({ activity, overdue, today }: { activity: Activity; overdue?: boolean; today: string }) {
  return (
    <li className={styles.todo}>
      <FollowUpCheckbox activity={activity} showLabel={false} />
      <div>
        <p className={styles.todoText}>{activity.description}</p>
        <p className={styles.meta}>
          <ActivityLink activity={activity} />
          {overdue && activity.follow_up_date && <>, <span className={styles.overdue}>{due(activity.follow_up_date, today)}</span></>}
        </p>
      </div>
    </li>
  );
}

export function FollowUps({ activities, today }: { activities: Activity[]; today: string }) {
  const [showOverdue, setShowOverdue] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const { overdue, upcoming } = followUpGroups(activities, today);
  const upcomingCount = upcoming.reduce((sum, group) => sum + group.activities.length, 0);
  let remaining = showUpcoming ? upcomingCount : FOLLOW_UP_LIMIT;
  const visible = upcoming.flatMap((group) => {
    const shown = group.activities.slice(0, remaining);
    remaining -= shown.length;
    return shown.length ? [{ ...group, activities: shown }] : [];
  });
  return (
    <Panel title="Follow-ups" titleId="follow-ups">
      <p className={styles.summary} role="status">
        {overdue.length || upcomingCount ? `${number(overdue.length)} overdue and ${number(upcomingCount)} due in the next 7 days.` : "Nothing overdue or due in the next 7 days."}
      </p>
      {overdue.length > 0 && (
        <section className={styles.day} aria-labelledby="follow-ups-overdue">
          <h3 className={styles.overdue} id="follow-ups-overdue">Overdue<small>{overdue.length} to do</small></h3>
          <div>
            <ul>{overdue.slice(0, showOverdue ? overdue.length : FOLLOW_UP_LIMIT).map((activity) => <FollowUp key={activity.id} activity={activity} today={today} overdue />)}</ul>
            {overdue.length > FOLLOW_UP_LIMIT && <Button variant="quiet" onPress={() => setShowOverdue(!showOverdue)} aria-expanded={showOverdue}>{showOverdue ? "Show fewer" : `Show all ${overdue.length}`}</Button>}
          </div>
        </section>
      )}
      {visible.map((group) => (
        <section className={styles.day} key={group.day} aria-labelledby={`follow-up-${group.day}`}>
          <h3 id={`follow-up-${group.day}`}>{group.title}</h3>
          <ul>{group.activities.map((activity) => <FollowUp key={activity.id} activity={activity} today={today} />)}</ul>
        </section>
      ))}
      {upcomingCount > FOLLOW_UP_LIMIT && <Button variant="quiet" onPress={() => setShowUpcoming(!showUpcoming)} aria-expanded={showUpcoming}>{showUpcoming ? "Show fewer" : `Show all ${upcomingCount}`}</Button>}
    </Panel>
  );
}

import type { Activity } from "../activities/queries";
import { daysBetween, weekday } from "../lib/format";

export const FOLLOW_UP_LIMIT = 5;
export type FollowUpGroup = { day: string; title: string; activities: Activity[] };

export function followUpGroups(activities: Activity[], today: string) {
  const overdue: Activity[] = [];
  const upcoming = new Map<string, FollowUpGroup>();
  const sorted = activities
    .filter((activity) => activity.follow_up_date && !activity.done)
    .toSorted((a, b) => a.follow_up_date!.localeCompare(b.follow_up_date!));
  for (const activity of sorted) {
    const day = activity.follow_up_date!;
    const days = daysBetween(today, day);
    if (days < 0) {
      overdue.push(activity);
    } else if (days < 7) {
      const group = upcoming.get(day) ?? {
        day,
        title: days === 0 ? "Today" : days === 1 ? "Tomorrow" : weekday(day),
        activities: [],
      };
      group.activities.push(activity);
      upcoming.set(day, group);
    }
  }
  return { overdue, upcoming: [...upcoming.values()] };
}

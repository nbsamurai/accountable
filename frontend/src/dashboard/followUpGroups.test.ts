import { expect, test } from "vitest";
import type { Activity } from "../activities/queries";
import { followUpGroups } from "./followUpGroups";

function activity(id: number, follow_up_date: string, done = false): Activity {
  return {
    id,
    type: "note",
    description: String(id),
    occurred_at: "2026-11-18T00:00:00Z",
    follow_up_date,
    done,
    contact: null,
    deal: null,
  };
}

test("groups follow-ups chronologically and skips done and day seven", () => {
  const groups = followUpGroups(
    [
      activity(1, "2026-11-18"),
      activity(2, "2026-11-17"),
      activity(3, "2026-11-19"),
      activity(4, "2026-11-20"),
      activity(5, "2026-11-23"),
      activity(6, "2026-11-26"),
      activity(7, "2026-11-19", true),
    ],
    "2026-11-19",
  );
  expect(groups.overdue.map(({ id }) => id)).toEqual([2, 1]);
  expect(groups.upcoming.map(({ title }) => title)).toEqual(["Today", "Tomorrow", "Mon, Nov 23"]);
  expect(groups.upcoming.flatMap(({ activities }) => activities.map(({ id }) => id))).toEqual([
    3, 4, 5,
  ]);
});

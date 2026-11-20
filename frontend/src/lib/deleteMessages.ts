// The words in each delete dialog (spec 4.10), with the record's real counts.
// Parts with a count of 0 are left out.

import { dateNear, isoDay, plural } from "./format";

export type DeleteMessage = { title: string; body: string; button: string };

const UNDONE = "This can't be undone.";

export function organizationMessage(name: string, contacts: number, deals: number): DeleteMessage {
  const kept = [contacts && plural(contacts, "contact"), deals && plural(deals, "deal")]
    .filter(Boolean)
    .join(" and ");
  const body = kept ? `Its ${kept} will be kept, without an organization. ${UNDONE}` : UNDONE;
  return { title: `Delete ${name}?`, body, button: "Delete organization" };
}

export function contactMessage(name: string, deals: number, activities: number): DeleteMessage {
  const parts = [];
  if (deals) parts.push(`Their ${plural(deals, "deal")} will be kept, without a main contact.`);
  if (activities)
    parts.push(`Their ${plural(activities, "activity", "activities")} will be deleted.`);
  parts.push(UNDONE);
  return { title: `Delete ${name}?`, body: parts.join(" "), button: "Delete contact" };
}

export function dealMessage(name: string, activities: number, stageChanges: number): DeleteMessage {
  let body = UNDONE;
  if (activities) {
    const including = stageChanges ? ", including its stage changes" : "";
    body = `Its ${plural(activities, "activity", "activities")} will be deleted${including}. ${UNDONE}`;
  }
  return { title: `Delete ${name}?`, body, button: "Delete deal" };
}

const TYPE_NAMES: Record<string, string> = { note: "note", call: "call", email: "email" };

/** "Delete this call from Nov 12?" */
export function activityMessage(type: string, occurredAt: string, today: string): DeleteMessage {
  const when = dateNear(isoDay(new Date(occurredAt)), today);
  return {
    title: `Delete this ${TYPE_NAMES[type] ?? "activity"} from ${when}?`,
    body: UNDONE,
    button: "Delete activity",
  };
}

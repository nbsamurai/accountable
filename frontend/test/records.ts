import type { Activity } from "../src/activities/queries";
import type { ContactDetail } from "../src/contacts/queries";
import type { Dashboard } from "../src/dashboard/queries";
import type { DealDetail } from "../src/deals/queries";
import { STAGES } from "../src/lib/stages";
import type { OrganizationDetail } from "../src/organizations/queries";
import type { BoardData } from "../src/pipeline/queries";

export const today = "2026-11-19";
const timestamp = `${today}T15:00:00Z`;
const dates = { created_at: timestamp, updated_at: timestamp };
const company = { id: 1, name: "Northpeak Energy" };
const person = { id: 2, name: "Jane Doe" };

export const deal: DealDetail = {
  id: 3,
  name: "Website redesign",
  organization: company,
  contact: { ...person, organization_id: company.id, organization_name: company.name },
  stage: "new",
  value: 4000,
  probability: 10,
  expected_revenue: 400,
  close_date: "2026-11-17",
  late: true,
  board_position: 1,
  activity_count: 2,
  stage_change_count: 1,
  ...dates,
};

export const contact: ContactDetail = {
  ...person,
  organization: company,
  email: "jane@northpeak.example",
  phone: "+1 555 0101",
  job_title: "Buyer",
  status: "lead",
  deal_count: 1,
  activity_count: 1,
  deals: [deal],
  ...dates,
};

export const organization: OrganizationDetail = {
  ...company,
  website: "https://northpeak.example",
  industry: "Energy",
  notes: "Review scope next week.",
  contact_count: 1,
  open_deal_count: 1,
  open_pipeline: 4000,
  deal_count: 1,
  figures: { open_pipeline: 4000, expected_revenue: 400, won_to_date: 0 },
  contacts: [contact],
  deals: [deal],
  ...dates,
};

export const note = {
  id: 4,
  type: "note",
  description: "Send quote",
  occurred_at: timestamp,
  follow_up_date: "2026-11-18",
  done: false,
  contact: person,
  deal: null,
} satisfies Activity;

export const stageChange: Activity = {
  ...note,
  id: 5,
  type: "stage_change",
  description: "Moved from Qualified to New",
  follow_up_date: null,
  contact: null,
  deal: { id: deal.id, name: deal.name },
};

export function page<T>(...items: T[]) {
  return { items, total: items.length };
}

export const contacts = {
  ...page(contact),
  status_counts: { all: 1, lead: 1, qualified: 0, customer: 0 },
};

export const dashboard: Dashboard = {
  today,
  pipeline: {
    count: 1,
    value: 4000,
    expected_revenue: 400,
    stages: STAGES.filter((stage) => stage.open).map(({ key }) => ({
      stage: key,
      value: key === "new" ? 4000 : 0,
    })),
  },
  won_this_month: { month: "2026-11-01", count: 1, value: 2500 },
  win_rate: { closed: 2, won: 1, percent: 50 },
  months: [
    { month: "2026-10-01", count: 0, value: 0 },
    { month: "2026-11-01", count: 1, value: 2500 },
  ],
  funnel: [{ stage: "new", count: 2, value: 6500, share: 100 }],
  follow_ups: [note, { ...note, id: 6, description: "Call buyer", follow_up_date: today }],
  recent_activity: [note, stageChange],
};

export const pipeline: BoardData = {
  today,
  totals: { count: 1, value: 4000, expected_revenue: 400 },
  columns: STAGES.map(({ key }) => ({
    stage: key,
    ...(key === "new"
      ? { count: 1, value: 4000, expected_revenue: 400, cards: [deal] }
      : { count: 0, value: 0, expected_revenue: 0, cards: [] }),
  })),
};

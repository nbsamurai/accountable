// The stages and statuses (spec 3.1 and 5.3). Colors come from the CSS classes in tokens.css.

export type Stage = "new" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type Status = "lead" | "qualified" | "customer";

export type StageInfo = {
  key: Stage;
  name: string;
  probability: number;
  open: boolean;
  /** The class that sets --st (the fill) and --st-on (the text on it). */
  className: string;
};

export const STAGES: StageInfo[] = [
  { key: "new", name: "New", probability: 10, open: true, className: "st-new" },
  { key: "qualified", name: "Qualified", probability: 25, open: true, className: "st-qualified" },
  { key: "proposal", name: "Proposal", probability: 50, open: true, className: "st-proposal" },
  {
    key: "negotiation",
    name: "Negotiation",
    probability: 75,
    open: true,
    className: "st-negotiation",
  },
  { key: "won", name: "Won", probability: 100, open: false, className: "st-won" },
  { key: "lost", name: "Lost", probability: 0, open: false, className: "st-lost" },
];

export const OPEN_STAGES = STAGES.filter((s) => s.open);
export const FUNNEL_STAGES = STAGES.filter((s) => s.key !== "lost");

const BY_KEY = Object.fromEntries(STAGES.map((s) => [s.key, s])) as Record<Stage, StageInfo>;

export function stage(key: Stage): StageInfo {
  return BY_KEY[key];
}

export function isOpen(key: Stage): boolean {
  return BY_KEY[key].open;
}

export function isClosed(key: Stage): boolean {
  return !BY_KEY[key].open;
}

/** Each stage's colors, as CSS custom properties: the fill, and the text on it. */
export const STAGE_COLORS: Record<Stage, { fill: string; text: string }> = {
  new: { fill: "var(--primary)", text: "var(--ink)" },
  qualified: { fill: "var(--secondary)", text: "var(--ink)" },
  proposal: { fill: "var(--tertiary)", text: "var(--ink)" },
  negotiation: { fill: "var(--info-ink)", text: "var(--on-dark)" },
  won: { fill: "var(--ink)", text: "var(--on-dark)" },
  lost: { fill: "var(--subtle)", text: "var(--ink)" },
};

export type StatusInfo = { key: Status; name: string; plural: string; className: string };

export const STATUSES: StatusInfo[] = [
  { key: "lead", name: "Lead", plural: "Leads", className: "status-lead" },
  { key: "qualified", name: "Qualified", plural: "Qualified", className: "status-qualified" },
  { key: "customer", name: "Customer", plural: "Customers", className: "status-customer" },
];

export function status(key: Status): StatusInfo {
  return STATUSES.find((s) => s.key === key)!;
}

import { expect, test } from "vitest";
import { STAGES, type Stage } from "../lib/stages";
import { announce } from "./announcements";
import type { BoardData, CardDeal } from "./queries";

function card(id: number, name: string, stage: Stage): CardDeal {
  return { id, name, stage, value: 100, probability: 50, close_date: null, late: false, contact: null, organization: null };
}

// Spec 6's example: Website redesign is second of five in Proposal, and Negotiation has two cards.
const website = card(2, "Website redesign", "proposal");
const columns: Partial<Record<Stage, CardDeal[]>> = {
  proposal: [card(1, "Route optimization", "proposal"), website, card(3, "Student CRM", "proposal"), card(4, "Lab results", "proposal"), card(5, "Kiosks", "proposal")],
  negotiation: [card(6, "Payments gateway", "negotiation"), card(7, "Fleet telematics", "negotiation")],
};
const board: BoardData = {
  today: "2026-11-19",
  totals: { count: 7, value: 700, expected_revenue: 350 },
  columns: STAGES.map(({ key }) => {
    const cards = columns[key] ?? [];
    return { stage: key, count: cards.length, value: cards.length * 100, expected_revenue: cards.length * 50, cards };
  }),
};

test("picking up a card says its name, column and place", () => {
  expect(announce("picked", board, website, { stage: "proposal", before_id: 3 })).toBe(
    "Picked up Website redesign, in Proposal, position 2 of 5",
  );
});

test("moving over another column counts the card in that column", () => {
  expect(announce("over", board, website, { stage: "negotiation", before_id: 6 })).toBe("Over Negotiation, position 1 of 3");
  expect(announce("over", board, website, { stage: "negotiation", before_id: null })).toBe("Over Negotiation, position 3 of 3");
});

test("dropping a card says where it landed", () => {
  expect(announce("dropped", board, website, { stage: "negotiation", before_id: 6 })).toBe("Dropped in Negotiation, position 1 of 3");
});

test("putting a card back says where it went back to", () => {
  expect(announce("canceled", board, website, { stage: "proposal", before_id: 3 })).toBe(
    "Put back Website redesign in Proposal, position 2 of 5",
  );
});

import { expect, test } from "vitest";
import { STAGES, type Stage } from "../lib/stages";
import { announce } from "./announcements";
import { applyMove, firstDrop, keyboardDrop } from "./boardState";
import type { BoardData, CardDeal } from "./queries";

function card(id: number, stage: Stage): CardDeal {
  return {
    id,
    name: `Deal ${id}`,
    stage,
    value: 100,
    probability: 50,
    close_date: null,
    late: false,
    contact: null,
    organization: null,
  };
}

const first = card(1, "proposal");
const second = card(2, "proposal");
const initial: BoardData = {
  today: "2026-11-19",
  totals: { count: 2, value: 200, expected_revenue: 100 },
  columns: STAGES.map(({ key }) =>
    key === "proposal"
      ? { stage: key, count: 2, value: 200, expected_revenue: 100, cards: [first, second] }
      : { stage: key, count: 0, value: 0, expected_revenue: 0, cards: [] },
  ),
};

test("moving across stages and closing updates totals while retaining the original board", () => {
  const target = applyMove(initial, first, { stage: "negotiation", before_id: null });
  expect(target.totals).toEqual({ count: 2, value: 200, expected_revenue: 125 });
  const moved = target.columns.find(({ stage }) => stage === "negotiation")!.cards[0]!;
  const closed = applyMove(target, moved, { stage: "won", before_id: null });
  expect(closed.totals).toEqual({ count: 1, value: 100, expected_revenue: 50 });
  expect(closed.columns.find(({ stage }) => stage === "won")!.cards[0]).toMatchObject({
    probability: 100,
    close_date: initial.today,
  });
  expect(initial.columns.find(({ stage }) => stage === "proposal")!.cards).toEqual([first, second]);
});

test("keyboard slots reorder within a column and announce an empty target", () => {
  const start = firstDrop(initial, first);
  expect(announce("picked", initial, first, start)).toBe(
    "Picked up Deal 1, in Proposal, position 1 of 2",
  );
  const down = keyboardDrop(initial, first, start, "ArrowDown", {});
  expect(
    applyMove(initial, first, down).columns.find(({ stage }) => stage === "proposal")!.cards,
  ).toEqual([second, first]);
  const right = keyboardDrop(initial, first, down, "ArrowRight", {});
  expect(announce("over", initial, first, right)).toBe("Over Negotiation, position 1 of 1");
  expect(announce("dropped", initial, first, right)).toBe(
    "Dropped in Negotiation, position 1 of 1",
  );
  expect(announce("canceled", initial, first, start)).toBe(
    "Put back Deal 1 in Proposal, position 1 of 2",
  );
});

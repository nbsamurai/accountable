import { expect, test } from "vitest";
import {
  FUNNEL_STAGES,
  isClosed,
  isOpen,
  OPEN_STAGES,
  STAGE_COLORS,
  STAGES,
  stage,
  status,
} from "./stages";

test("the stages in pipeline order", () => {
  expect(STAGES.map((s) => s.name)).toEqual([
    "New",
    "Qualified",
    "Proposal",
    "Negotiation",
    "Won",
    "Lost",
  ]);
});

test("each stage's usual probability", () => {
  expect(Object.fromEntries(STAGES.map((s) => [s.key, s.probability]))).toEqual({
    new: 10,
    qualified: 25,
    proposal: 50,
    negotiation: 75,
    won: 100,
    lost: 0,
  });
});

test("open and closed", () => {
  expect(OPEN_STAGES.map((s) => s.key)).toEqual(["new", "qualified", "proposal", "negotiation"]);
  expect(FUNNEL_STAGES.map((s) => s.key)).toEqual([
    "new",
    "qualified",
    "proposal",
    "negotiation",
    "won",
  ]);
  expect(isOpen("negotiation")).toBe(true);
  expect(isClosed("won")).toBe(true);
  expect(isClosed("lost")).toBe(true);
});

test("each stage's colors follow spec 5.3", () => {
  expect(STAGE_COLORS.new).toEqual({ fill: "var(--primary)", text: "var(--ink)" });
  expect(STAGE_COLORS.qualified).toEqual({ fill: "var(--secondary)", text: "var(--ink)" });
  expect(STAGE_COLORS.proposal).toEqual({ fill: "var(--tertiary)", text: "var(--ink)" });
  expect(STAGE_COLORS.negotiation).toEqual({ fill: "var(--info-ink)", text: "var(--on-dark)" });
  expect(STAGE_COLORS.won).toEqual({ fill: "var(--ink)", text: "var(--on-dark)" });
  expect(STAGE_COLORS.lost).toEqual({ fill: "var(--subtle)", text: "var(--ink)" });
  expect(stage("proposal").className).toBe("st-proposal");
});

test("statuses", () => {
  expect(status("lead").name).toBe("Lead");
  expect(status("customer").plural).toBe("Customers");
});

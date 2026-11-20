import { expect, test } from "vitest";
import { FUNNEL_STAGES, isClosed, isOpen, OPEN_STAGES, STAGES, stage, status } from "./stages";

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

test("each stage has a class for its colors in tokens.css", () => {
  expect(stage("proposal").className).toBe("st-proposal");
});

test("statuses", () => {
  expect(status("lead").name).toBe("Lead");
  expect(status("customer").plural).toBe("Customers");
});

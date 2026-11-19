import { expect, test } from "vitest";
import { activityMessage, contactMessage, dealMessage, organizationMessage } from "./deleteMessages";

test("an organization", () => {
  expect(organizationMessage("Northpeak", 4, 3)).toEqual({
    title: "Delete Northpeak?",
    body: "Its 4 contacts and 3 deals will be kept, without an organization. This can't be undone.",
    button: "Delete organization",
  });
  expect(organizationMessage("Northpeak", 1, 0).body).toBe(
    "Its 1 contact will be kept, without an organization. This can't be undone.",
  );
  expect(organizationMessage("Northpeak", 0, 2).body).toBe(
    "Its 2 deals will be kept, without an organization. This can't be undone.",
  );
  expect(organizationMessage("Northpeak", 0, 0).body).toBe("This can't be undone.");
});

test("a contact", () => {
  expect(contactMessage("Jane Doe", 2, 6)).toEqual({
    title: "Delete Jane Doe?",
    body: "Their 2 deals will be kept, without a main contact. Their 6 activities will be deleted. This can't be undone.",
    button: "Delete contact",
  });
  expect(contactMessage("Jane Doe", 1, 0).body).toBe(
    "Their 1 deal will be kept, without a main contact. This can't be undone.",
  );
  expect(contactMessage("Jane Doe", 0, 1).body).toBe("Their 1 activity will be deleted. This can't be undone.");
  expect(contactMessage("Jane Doe", 0, 0).body).toBe("This can't be undone.");
});

test("a deal", () => {
  expect(dealMessage("Website redesign", 5, 1)).toEqual({
    title: "Delete Website redesign?",
    body: "Its 5 activities will be deleted, including its stage changes. This can't be undone.",
    button: "Delete deal",
  });
  expect(dealMessage("Website redesign", 2, 0).body).toBe("Its 2 activities will be deleted. This can't be undone.");
  expect(dealMessage("Website redesign", 1, 0).body).toBe("Its 1 activity will be deleted. This can't be undone.");
  expect(dealMessage("Website redesign", 0, 0).body).toBe("This can't be undone.");
});

test("an activity", () => {
  const nov12 = new Date(2026, 10, 12, 14, 0).toISOString();
  expect(activityMessage("call", nov12, "2026-11-19")).toEqual({
    title: "Delete this call from Nov 12?",
    body: "This can't be undone.",
    button: "Delete activity",
  });
  expect(activityMessage("note", nov12, "2027-01-03").title).toBe("Delete this note from Nov 12, 2026?");
});

import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { alex, jordan } from "../../test/records";
import { AddedBy } from "./AddedBy";

// Midday UTC, so the local date is the same in any time zone the tests run in.
const added = "2026-11-03T12:00:00Z";
const later = "2026-11-19T12:00:00Z";

test("says who added the record and when", () => {
  render(
    <AddedBy
      record={{ created_at: added, updated_at: added, created_by: alex, updated_by: alex }}
    />,
  );
  expect(screen.getByText("Added by Alex Rivera on Nov 3, 2026.")).toBeInTheDocument();
  expect(screen.queryByText(/Last changed/)).not.toBeInTheDocument();
});

test("goes on to say who last changed it, once it has changed", () => {
  render(
    <AddedBy
      record={{ created_at: added, updated_at: later, created_by: alex, updated_by: jordan }}
    />,
  );
  expect(
    screen.getByText(
      "Added by Alex Rivera on Nov 3, 2026. Last changed by Jordan Blake on Nov 19, 2026.",
    ),
  ).toBeInTheDocument();
});

test("a change by someone else on the same day counts as a change", () => {
  render(
    <AddedBy
      record={{ created_at: added, updated_at: added, created_by: alex, updated_by: jordan }}
    />,
  );
  expect(screen.getByText(/Last changed by Jordan Blake on Nov 3, 2026\./)).toBeInTheDocument();
});

test("shows – for no one recorded", () => {
  render(
    <AddedBy
      record={{ created_at: added, updated_at: later, created_by: null, updated_by: null }}
    />,
  );
  expect(
    screen.getByText("Added by – on Nov 3, 2026. Last changed by – on Nov 19, 2026."),
  ).toBeInTheDocument();
});

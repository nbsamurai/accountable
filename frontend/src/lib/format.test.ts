import { describe, expect, test } from "vitest";
import {
  date,
  dateFull,
  dateNear,
  dateTime,
  due,
  EMPTY,
  initials,
  money,
  moneyShort,
  percent,
  plural,
  when,
} from "./format";

const TODAY = "2026-11-19";

describe("money", () => {
  test("whole dollars with separators", () => {
    expect(money(48000)).toBe("$48,000");
    expect(money(0)).toBe("$0");
    expect(money(280825)).toBe("$280,825");
  });
  test("the short form", () => {
    expect(moneyShort(40000)).toBe("$40K");
    expect(moneyShort(1_200_000)).toBe("$1.2M");
    expect(moneyShort(962_000)).toBe("$962K");
    expect(moneyShort(0)).toBe("$0");
    expect(moneyShort(500)).toBe("$500");
  });
  test("empty", () => {
    expect(money(null)).toBe(EMPTY);
    expect(EMPTY).toBe("–");
  });
});

test("percent", () => {
  expect(percent(75)).toBe("75%");
  expect(percent(undefined)).toBe("–");
});

test("plural", () => {
  expect(plural(1, "deal")).toBe("1 deal");
  expect(plural(2, "deal")).toBe("2 deals");
  expect(plural(2, "activity", "activities")).toBe("2 activities");
});

describe("dates", () => {
  test("a date with no time never shifts", () => {
    expect(date("2026-11-19")).toBe("Nov 19, 2026");
    expect(date("2027-01-01")).toBe("Jan 1, 2027");
    expect(date(null)).toBe("–");
  });
  test("near dates drop the year in the current year", () => {
    expect(dateNear("2026-12-10", TODAY)).toBe("Dec 10");
    expect(dateNear("2027-01-15", TODAY)).toBe("Jan 15, 2027");
  });
  test("a timestamp in local time", () => {
    const local = new Date(2026, 10, 19, 14, 30).toISOString();
    expect(dateTime(local)).toBe("Nov 19, 2026, 2:30 PM");
  });
  test("recent activity", () => {
    expect(when(new Date(2026, 10, 19, 10, 42).toISOString(), TODAY)).toBe("Today, 10:42 AM");
    expect(when(new Date(2026, 10, 18, 16, 30).toISOString(), TODAY)).toBe("Yesterday, 4:30 PM");
    expect(when(new Date(2026, 10, 17, 15, 48).toISOString(), TODAY)).toBe("Nov 17, 3:48 PM");
  });
  test("today in full", () => {
    expect(dateFull(TODAY)).toBe("Thursday, November 19, 2026");
  });
});

describe("follow-ups", () => {
  test("due and overdue", () => {
    expect(due("2026-11-19", TODAY)).toBe("Due today");
    expect(due("2026-11-20", TODAY)).toBe("Due tomorrow");
    expect(due("2026-11-23", TODAY)).toBe("Due Mon, Nov 23");
    expect(due("2026-11-16", TODAY)).toBe("3 days overdue");
    expect(due("2026-11-18", TODAY)).toBe("1 day overdue");
  });
  test("across a month and a clock change", () => {
    expect(due("2026-11-01", "2026-11-03")).toBe("2 days overdue");
    expect(due("2026-12-01", "2026-11-30")).toBe("Due tomorrow");
  });
});

test("initials", () => {
  expect(initials("Jane Doe")).toBe("JD");
  expect(initials("Liam O'Brien")).toBe("LO");
  expect(initials("Cher")).toBe("C");
  expect(initials("Mary Ann Smith")).toBe("MA");
});

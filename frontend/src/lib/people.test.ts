import { expect, test } from "vitest";
import { initials, personName } from "./people";

const named = (name: string | null, email = "someone@team.example") => ({ name, email });

test("a name gives the first letters of its first and last words", () => {
  expect(initials(named("Alex Rivera"))).toBe("AR");
  expect(initials(named("Mary Jane Watson"))).toBe("MW");
  expect(initials(named("  casey   morgan "))).toBe("CM");
});

test("a one-word name gives one letter", () => {
  expect(initials(named("Cher"))).toBe("C");
});

test("with no name, the email's first two parts before the @ give the letters", () => {
  expect(initials(named(null, "jo.lee@team.example"))).toBe("JL");
  expect(initials(named(null, "sam@team.example"))).toBe("S");
  expect(initials(named(null, "ana-maria_lopez@team.example"))).toBe("AM");
  expect(initials(named(null, "kim_park@team.example"))).toBe("KP");
  expect(initials(named("", "lee.ward@team.example"))).toBe("LW");
});

test("letters beyond A to Z are kept whole and made capitals", () => {
  expect(initials(named("émile Ōta"))).toBe("ÉŌ");
});

test("a person shows as their name, or their email when they have no name", () => {
  expect(personName(named("Alex Rivera", "alex@team.example"))).toBe("Alex Rivera");
  expect(personName(named(null, "sam@team.example"))).toBe("sam@team.example");
  expect(personName(named("  ", "sam@team.example"))).toBe("sam@team.example");
});

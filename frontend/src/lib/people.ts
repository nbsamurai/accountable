// The signed-in person, and how a person shows (spec 2, Person).

import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { queryKeys } from "./queryKeys";

/** The signed-in person, from /api/me (spec 9.4). `name` is null when they have none. */
export type Me = { id: string; email: string; name: string | null };

type Named = Pick<Me, "email" | "name">;

/** How a person shows: their name, or their email when they have no name. */
export function personName(person: Named): string {
  return person.name?.trim() || person.email;
}

/** The first letter of each word, as capitals. Array.from keeps a letter outside the BMP whole. */
function firstLetters(words: string[]): string {
  return words.map((word) => Array.from(word)[0]?.toUpperCase() ?? "").join("");
}

/**
 * Up to two capitals for the initials button. A name gives the first letters of its first and
 * last words, so "Alex Rivera" gives "AR" and "Cher" gives "C". An email gives the first
 * letters of the first two parts before the @, split at dots, dashes and underscores, so
 * "jo.lee@team.example" gives "JL" and "sam@team.example" gives "S".
 */
export function initials(person: Named): string {
  const words = person.name?.trim().split(/\s+/);
  if (words?.[0]) return firstLetters(words.length > 1 ? [words[0], words.at(-1)!] : words);
  const local = person.email.split("@")[0] ?? "";
  return firstLetters(
    local
      .split(/[._-]+/)
      .filter(Boolean)
      .slice(0, 2),
  );
}

/** The signed-in person, for the user menu. */
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: () => api.get<Me>("/me") });
}

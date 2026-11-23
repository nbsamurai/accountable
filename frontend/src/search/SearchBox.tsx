import { Search as SearchIcon } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import {
  Collection,
  ComboBox,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  type Key,
} from "react-aria-components";
import { useNavigate } from "react-router";
import { EMPTY, plural } from "../lib/format";
import { stage } from "../lib/stages";
import { useDebounced } from "../lib/useDebounced";
import { useSearch, type SearchResults } from "./queries";
import styles from "./SearchBox.module.css";

/** The tables wait the same time after typing stops (spec 4.3). */
export const SEARCH_WAIT = 250;
export const SEARCH_LABEL = "Search organizations, contacts and deals";

type Match = { id: string; path: string; name: string; detail: string };
type Group = { id: string; name: string; matches: Match[] };

/** The three groups in order, each match with its one detail, and the empty groups left out. */
export function groupsOf(results: SearchResults | undefined): Group[] {
  if (!results) return [];
  const groups: Group[] = [
    {
      id: "organizations",
      name: "Organizations",
      matches: results.organizations.map((o) => ({
        id: `organization-${o.id}`,
        path: `/organizations/${o.id}`,
        name: o.name,
        detail: o.industry ?? EMPTY,
      })),
    },
    {
      id: "contacts",
      name: "Contacts",
      matches: results.contacts.map((c) => ({
        id: `contact-${c.id}`,
        path: `/contacts/${c.id}`,
        name: c.name,
        detail: c.organization ?? EMPTY,
      })),
    },
    {
      id: "deals",
      name: "Deals",
      matches: results.deals.map((d) => ({
        id: `deal-${d.id}`,
        path: `/deals/${d.id}`,
        name: d.name,
        detail: [d.organization ?? EMPTY, stage(d.stage).name].join(" · "),
      })),
    },
  ];
  return groups.filter((group) => group.matches.length > 0);
}

/** What the live region reads out once the matches for `term` have come. */
export function announcement(count: number, term: string): string {
  return count === 0 ? `No matches for "${term}".` : `${plural(count, "match", "matches")}.`;
}

/**
 * The search box in the top bar (spec 4.12): a combobox that finds organizations, contacts
 * and deals by part of their name, 250 ms after typing stops. Choosing a match opens it and
 * clears the box. Escape closes the list, then clears the box.
 */
export function SearchBox({ className }: { className?: string }) {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const typed = input.trim();
  const term = useDebounced(typed, SEARCH_WAIT);
  const search = useSearch(term);
  const groups = useMemo(() => groupsOf(term ? search.data : undefined), [term, search.data]);
  const settled = term !== "" && term === typed && search.isSuccess && !search.isPlaceholderData;
  const count = groups.reduce((total, group) => total + group.matches.length, 0);

  function choose(key: Key | null) {
    const match = groups.flatMap((group) => group.matches).find((found) => found.id === key);
    if (!match) return;
    setInput("");
    void navigate(match.path);
  }

  // The first Escape closes the list. The next one, with the list closed, clears the box.
  function clearOnEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && !open) setInput("");
  }

  return (
    <div role="search" className={[styles.search, className].filter(Boolean).join(" ")}>
      <ComboBox
        aria-label={SEARCH_LABEL}
        items={groups}
        inputValue={input}
        onInputChange={setInput}
        value={null}
        onChange={choose}
        onOpenChange={setOpen}
        allowsCustomValue
        allowsEmptyCollection
        className={styles.combobox}
      >
        <div className={styles.field}>
          <SearchIcon size={16} aria-hidden="true" className={styles.icon} />
          <Input placeholder="Search" className={styles.input} onKeyDown={clearOnEscape} />
        </div>
        <Popover className={styles.popover} offset={6} placement="bottom end">
          <ListBox<Group>
            className={styles.list}
            renderEmptyState={() => (
              <p className={styles.empty}>{settled ? `No matches for "${term}".` : "Searching…"}</p>
            )}
          >
            {(group) => (
              // The label names the group when VoiceOver says the focus has entered it.
              <ListBoxSection id={group.id} aria-label={group.name} className={styles.section}>
                <Header className={styles.header}>{group.name}</Header>
                <Collection items={group.matches}>
                  {(match) => (
                    <ListBoxItem id={match.id} textValue={match.name} className={styles.item}>
                      <span className={styles.name}>{match.name}</span>
                      <span className={styles.detail}>{match.detail}</span>
                    </ListBoxItem>
                  )}
                </Collection>
              </ListBoxSection>
            )}
          </ListBox>
        </Popover>
      </ComboBox>
      <p className="sr-only" aria-live="polite">
        {settled ? announcement(count, term) : ""}
      </p>
    </div>
  );
}

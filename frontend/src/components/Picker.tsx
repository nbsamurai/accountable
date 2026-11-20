import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  ComboBox,
  FieldError,
  Group,
  Input,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  type Key,
} from "react-aria-components";
import { api } from "../lib/api";
import { fieldStyles } from "./Field";
import styles from "./Picker.module.css";

export const PICKER_SIZE = 20;
const NONE = "none";

export type PickerItem = { id: number; name: string; description?: string | null };
type Option = { id: number | typeof NONE; name: string; description?: string | null };

type Props<T extends PickerItem> = {
  label: string;
  name: string;
  selected: T | null;
  onChange: (item: T | null) => void;
  /** Asks the server for up to 20 matches. */
  search: (q: string) => Promise<T[]>;
  /** What the search depends on besides the text, such as an organization. */
  searchKey: unknown[];
  /** An option for choosing nothing, such as "No organization". */
  noneLabel?: string;
  description?: string;
};

function useDebounced<T>(value: T, delay: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/** A searchable picker (spec 4.8): it searches the server as the person types. */
export function Picker<T extends PickerItem>({
  label,
  name,
  selected,
  onChange,
  search,
  searchKey,
  noneLabel,
  description,
}: Props<T>) {
  const shown = selected?.name ?? noneLabel ?? "";
  const [input, setInput] = useState(shown);
  const [lastShown, setLastShown] = useState(shown);

  // When the choice changes from outside, such as a rule in the deal form, show it.
  if (shown !== lastShown) {
    setLastShown(shown);
    setInput(shown);
  }

  const searching = input.trim() !== "" && input !== shown;
  const term = useDebounced(searching ? input.trim() : "", 200);
  const { data, isFetching } = useQuery({
    queryKey: ["picker", name, ...searchKey, term],
    queryFn: () => search(term),
    staleTime: 10_000,
  });

  const items = useMemo(() => {
    const found = data ?? [];
    const list: Option[] = [...found];
    // The current choice stays in the list, so the input can show its name again on blur.
    if (selected && !term && !found.some((item) => item.id === selected.id)) list.unshift(selected);
    // "No organization" shows only when the person isn't typing a search.
    if (noneLabel && !searching) list.unshift({ id: NONE, name: noneLabel });
    return list;
  }, [data, selected, noneLabel, term, searching]);

  // With both the choice and the text controlled, the text must change in the same update
  // as the choice. A later change would look like typing, and the list would open again.
  function choose(key: Key | null) {
    if (key === null) return;
    if (key === NONE) {
      setInput(noneLabel ?? "");
      return onChange(null);
    }
    const item = items.find((candidate) => candidate.id === key);
    if (item && item.id !== NONE) {
      setInput(item.name);
      onChange(item as unknown as T);
    }
  }

  return (
    <ComboBox
      name={name}
      items={items}
      value={selected ? selected.id : noneLabel ? NONE : null}
      onChange={choose}
      inputValue={input}
      onInputChange={setInput}
      // Leaving the field without choosing shows the current choice again.
      onBlur={() => setInput(shown)}
      allowsEmptyCollection
      className={fieldStyles.field}
    >
      <Label className={fieldStyles.label}>{label}</Label>
      <Group className={`${fieldStyles.control} ${styles.group}`}>
        <Input className={styles.input} onFocus={(event) => event.currentTarget.select()} />
        <Button className={styles.button} aria-label={`Show ${label.toLowerCase()} options`}>
          <ChevronDown size={16} aria-hidden="true" />
        </Button>
      </Group>
      {description && <p className={fieldStyles.description}>{description}</p>}
      <FieldError className={fieldStyles.error} />
      <Popover className={styles.popover} offset={4}>
        <ListBox<Option>
          className={styles.list}
          renderEmptyState={() => (
            <p className={styles.empty}>{isFetching ? "Searching" : "No matches"}</p>
          )}
        >
          {(item) => (
            <ListBoxItem id={item.id} textValue={item.name} className={styles.item}>
              <span className={item.id === NONE ? styles.none : undefined}>{item.name}</span>
              {item.description && (
                <span className={styles.itemDescription}>{item.description}</span>
              )}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  );
}

// The searches the pickers make. Two areas use each, so they live here.

type Listed = { id: number; name: string };

export type OrganizationOption = PickerItem;

export async function searchOrganizations(q: string): Promise<OrganizationOption[]> {
  const page = await api.get<{ items: (Listed & { industry: string | null })[] }>(
    "/organizations",
    {
      q,
      page_size: PICKER_SIZE,
    },
  );
  return page.items.map((o) => ({ id: o.id, name: o.name, description: o.industry }));
}

export type ContactOption = PickerItem & {
  organization_id: number | null;
  organization_name: string | null;
};

/** People at `organizationId`, or everyone with their organization when it's undefined. */
export async function searchContacts(q: string, organizationId?: number): Promise<ContactOption[]> {
  const page = await api.get<{ items: (Listed & { organization: Listed | null })[] }>("/contacts", {
    q,
    organization_id: organizationId,
    page_size: PICKER_SIZE,
  });
  return page.items.map((c) => ({
    id: c.id,
    name: c.name,
    organization_id: c.organization?.id ?? null,
    organization_name: c.organization?.name ?? null,
    description: organizationId === undefined ? (c.organization?.name ?? "No organization") : null,
  }));
}

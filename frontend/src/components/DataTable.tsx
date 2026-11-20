import {
  createColumnHelper,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button as AriaButton, Input, SearchField } from "react-aria-components";
import { number, plural } from "../lib/format";
import type { TableState } from "../lib/useUrlState";
import { Button } from "./Button";
import styles from "./DataTable.module.css";
import { IconButton } from "./IconButton";
import { Skeleton } from "./Skeleton";

export const PAGE_SIZE = 50;
const SEARCH_DELAY = 250;

export type TableColumn<T> = {
  /** The server's name for the column, which is also its sort key. */
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Money and counts line up on the right. */
  align?: "end";
  sortable?: boolean;
};

type Row = { id: number; name: string };

type Props<T extends Row> = {
  noun: { one: string; many: string };
  columns: TableColumn<T>[];
  rows: T[] | undefined;
  total: number | undefined;
  isLoading: boolean;
  /** True while a new page is on its way. The table says it's busy until it arrives. */
  isFetching?: boolean;
  state: TableState;
  onChange: (
    change: Partial<TableState>,
    options?: { replace?: boolean; flushSync?: boolean },
  ) => void;
  /** The add button in the empty state. The page header has the main one. */
  addLabel: string;
  onAdd: () => void;
  onEdit: (row: T) => void;
  onDelete: (row: T) => void;
  /** Filters shown above the table, such as the contacts' status. */
  filters?: ReactNode;
  /** Whether a filter narrows the rows, for the empty message. */
  isFiltered?: boolean;
};

const features = tableFeatures({ rowSortingFeature });

/**
 * The table design Organizations, Contacts and Deals share (spec 4.3). TanStack Table runs in
 * manual mode, as the server searches, sorts and pages.
 */
export function DataTable<T extends Row>(props: Props<T>) {
  const { noun, columns, rows, total, isLoading, isFetching, state, onChange } = props;

  const tableColumns = useMemo(() => {
    const helper = createColumnHelper<typeof features, T>();
    return helper.columns(
      columns.map((column) =>
        helper.display({
          id: column.id,
          header: column.header,
          cell: ({ row }) => column.cell(row.original),
          enableSorting: column.sortable !== false,
        }),
      ),
    );
  }, [columns]);

  const table = useTable({
    features,
    columns: tableColumns,
    data: rows ?? [],
    getRowId: (row) => String(row.id),
    manualSorting: true,
    state: { sorting: [{ id: state.sort, desc: state.dir === "desc" }] },
  });

  function sortBy(id: string) {
    const again = state.sort === id;
    onChange({ sort: id, dir: again && state.dir === "asc" ? "desc" : "asc" });
  }

  const byId = new Map(columns.map((column) => [column.id, column]));
  const lastPage = Math.max(1, Math.ceil((total ?? 0) / PAGE_SIZE));
  const pageOutOfRange = total !== undefined && state.page > lastPage;

  useEffect(() => {
    if (pageOutOfRange && !isFetching) {
      onChange({ page: lastPage }, { replace: true, flushSync: false });
    }
  }, [pageOutOfRange, isFetching, lastPage, onChange]);

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        <SearchBox
          noun={noun.many}
          value={state.q}
          onSearch={(q) => onChange({ q }, { replace: true })}
        />
        {props.filters}
      </div>

      <p className="sr-only" role="status">
        {total === undefined ? "" : plural(total, noun.one, noun.many)}
      </p>

      <div className={styles.panel}>
        {total === 0 && !isLoading && !pageOutOfRange ? (
          <Empty {...props} />
        ) : (
          <div className={styles.scroller}>
            <table className={styles.table} aria-busy={isFetching || pageOutOfRange}>
              <thead>
                {table.getHeaderGroups().map((group) => (
                  <tr key={group.id}>
                    {group.headers.map((header) => {
                      const column = byId.get(header.column.id)!;
                      const sorted = header.column.getIsSorted();
                      const sortable = column.sortable !== false;
                      return (
                        <th
                          key={header.id}
                          scope="col"
                          aria-sort={
                            sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined
                          }
                          className={column.align === "end" ? styles.end : undefined}
                        >
                          {sortable ? (
                            <AriaButton className={styles.sort} onPress={() => sortBy(column.id)}>
                              {column.header}
                              {sorted === "asc" && <ArrowUp size={14} aria-hidden="true" />}
                              {sorted === "desc" && <ArrowDown size={14} aria-hidden="true" />}
                            </AriaButton>
                          ) : (
                            column.header
                          )}
                        </th>
                      );
                    })}
                    <th scope="col" className={styles.actionsHead}>
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                ))}
              </thead>
              <tbody>
                {(isLoading && !rows) || pageOutOfRange
                  ? Array.from({ length: 6 }, (_, i) => (
                      <tr key={i} aria-hidden="true">
                        {columns.map((column) => (
                          <td key={column.id}>
                            <Skeleton width={column.align === "end" ? "60%" : "75%"} />
                          </td>
                        ))}
                        <td />
                      </tr>
                    ))
                  : table.getRowModel().rows.map((row) => (
                      <tr key={row.id}>
                        {row.getAllCells().map((cell) => (
                          <td
                            key={cell.id}
                            className={
                              byId.get(cell.column.id)?.align === "end" ? styles.end : undefined
                            }
                          >
                            <table.FlexRender cell={cell} />
                          </td>
                        ))}
                        <td className={styles.actions}>
                          <IconButton
                            label={`Edit ${row.original.name}`}
                            icon={<Pencil size={16} aria-hidden="true" />}
                            onPress={() => props.onEdit(row.original)}
                          />
                          <IconButton
                            label={`Delete ${row.original.name}`}
                            icon={<Trash2 size={16} aria-hidden="true" />}
                            onPress={() => props.onDelete(row.original)}
                          />
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {total && !pageOutOfRange ? (
        <Paging page={state.page} total={total} onPage={(page) => onChange({ page })} />
      ) : null}
    </div>
  );
}

/** Searches 250 ms after typing stops. */

function Paging({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const first = (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);

  return (
    <nav className={styles.paging} aria-label="Pages">
      <p className="mono">
        {number(first)}–{number(last)} of {number(total)}
      </p>
      <div className={styles.pageButtons}>
        <Button
          variant="quiet"
          icon={<ChevronLeft size={16} aria-hidden="true" />}
          isDisabled={page <= 1}
          onPress={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button variant="quiet" isDisabled={last >= total} onPress={() => onPage(page + 1)}>
          Next
          <ChevronRight size={16} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

function SearchBox({
  noun,
  value,
  onSearch,
}: {
  noun: string;
  value: string;
  onSearch: (q: string) => void;
}) {
  const [text, setText] = useState(value);
  const sent = useRef(value);

  // Back, a refresh or "Clear search" changes the address: show what it says.
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(() => {
    if (text.trim() === sent.current) return;
    const timer = setTimeout(() => {
      sent.current = text.trim();
      onSearch(text);
    }, SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [text, onSearch]);

  return (
    <SearchField
      value={text}
      onChange={setText}
      aria-label={`Search ${noun}`}
      className={styles.search}
    >
      <Search size={16} aria-hidden="true" className={styles.searchIcon} />
      <Input placeholder={`Search ${noun}`} className={styles.searchInput} />
      {text && (
        <AriaButton className={styles.clear} aria-label="Clear search box">
          <X size={14} aria-hidden="true" />
        </AriaButton>
      )}
    </SearchField>
  );
}

function Empty<T extends Row>({ noun, state, onChange, onAdd, addLabel, isFiltered }: Props<T>) {
  if (state.q) {
    return (
      <div className={styles.empty}>
        <p>
          No {noun.many} match "{state.q}".
        </p>
        <Button variant="secondary" onPress={() => onChange({ q: "" })}>
          Clear search
        </Button>
      </div>
    );
  }
  if (isFiltered) {
    return (
      <div className={styles.empty}>
        <p>No {noun.many} here yet.</p>
      </div>
    );
  }
  return (
    <div className={styles.empty}>
      <p>No {noun.many} yet.</p>
      <Button variant="primary" icon={<Plus size={18} aria-hidden="true" />} onPress={onAdd}>
        {addLabel}
      </Button>
    </div>
  );
}

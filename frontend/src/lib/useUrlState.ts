import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

export type Direction = "asc" | "desc";

export type TableState = {
  q: string;
  sort: string;
  dir: Direction;
  page: number;
  /** Any filters, such as the contacts' `status`. */
  filters: Record<string, string>;
};

type Change = Partial<Omit<TableState, "filters">> & { filters?: Record<string, string | null> };
const NO_FILTERS: readonly string[] = [];

/**
 * A table's search, sort, page and filters, kept in the address (spec 4.3), such as
 * `/contacts?q=ann&status=lead&sort=name&dir=asc&page=2`. A refresh or Back brings them back.
 * Typing in the search box replaces the address instead of adding to the history.
 */
export function useUrlState(defaultSort = "name", filterNames: readonly string[] = NO_FILTERS) {
  const [params, setParams] = useSearchParams();

  const state = useMemo<TableState>(() => {
    const page = Number(params.get("page") ?? 1);
    const filters: Record<string, string> = {};
    for (const name of filterNames) {
      const value = params.get(name);
      if (value) filters[name] = value;
    }
    return {
      q: params.get("q") ?? "",
      sort: params.get("sort") ?? defaultSort,
      dir: params.get("dir") === "desc" ? "desc" : "asc",
      page: Number.isSafeInteger(page) && page > 0 ? page : 1,
      filters,
    };
  }, [params, defaultSort, filterNames]);

  const update = useCallback(
    (change: Change, options: { replace?: boolean } = {}) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          const set = (
            key: string,
            value: string | number | null | undefined,
            empty: string | number = "",
          ) => {
            if (value === null || value === undefined || value === empty) next.delete(key);
            else next.set(key, String(value));
          };
          if (change.q !== undefined) set("q", change.q.trim());
          if (change.sort !== undefined) set("sort", change.sort, defaultSort);
          if (change.dir !== undefined) set("dir", change.dir, "asc");
          for (const [name, value] of Object.entries(change.filters ?? {})) set(name, value);
          // A new search, sort or filter starts again at the first page.
          const page =
            change.page ??
            (change.q !== undefined || change.sort !== undefined || change.filters ? 1 : undefined);
          if (page !== undefined) set("page", page, 1);
          return next;
        },
        { replace: options.replace ?? false, preventScrollReset: true },
      );
    },
    [setParams, defaultSort],
  );

  return [state, update] as const;
}

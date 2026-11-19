// The name of every query, so a change in one area can refresh another's data
// without the two importing each other.

import type { QueryClient } from "@tanstack/react-query";
import type { Params } from "./api";

export const queryKeys = {
  organizations: {
    all: ["organizations"] as const,
    list: (params: Params) => ["organizations", "list", params] as const,
    detail: (id: number) => ["organizations", "detail", id] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    list: (params: Params) => ["contacts", "list", params] as const,
    detail: (id: number) => ["contacts", "detail", id] as const,
    timeline: (id: number) => ["contacts", "timeline", id] as const,
  },
  deals: {
    all: ["deals"] as const,
    list: (params: Params) => ["deals", "list", params] as const,
    detail: (id: number) => ["deals", "detail", id] as const,
    timeline: (id: number) => ["deals", "timeline", id] as const,
  },
  pipeline: ["pipeline"] as const,
  dashboard: ["dashboard"] as const,
};

const RECORD_AREAS = ["organizations", "contacts", "deals", "pipeline", "dashboard"];

/**
 * Fetches again every query the filter matches. A fetch already on its way may have read the
 * data before the change, so it's cancelled first: TanStack Query would otherwise reuse it for
 * a query that has no data yet, and the screen would keep the old rows.
 */
async function refresh(client: QueryClient, matches: (key: readonly unknown[]) => boolean) {
  const filters = { predicate: (query: { queryKey: readonly unknown[] }) => matches(query.queryKey) };
  await client.cancelQueries(filters);
  await client.invalidateQueries(filters);
}

/**
 * Records are linked, so a change to one can change what another screen shows: a deal moved
 * to Won changes its contact, its organization's figures, the board and the dashboard.
 * Every change refreshes them all. Only the queries on screen fetch again; the rest
 * fetch when they next show.
 */
export function refreshAfterChange(client: QueryClient): Promise<void> {
  return refresh(client, (key) => RECORD_AREAS.includes(String(key[0])));
}

/**
 * After a delete, refreshes everything except the deleted record's own queries, such as its
 * page and timeline. Fetching those again would only get a 404 while their screen closes.
 */
export function refreshAfterDelete(client: QueryClient, area: "organizations" | "contacts" | "deals", id: number) {
  return refresh(client, ([first, kind, key]) => {
    const own = first === area && (kind === "detail" || kind === "timeline") && key === id;
    return !own && RECORD_AREAS.includes(String(first));
  });
}

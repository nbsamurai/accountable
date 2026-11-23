import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Stage } from "../lib/stages";

/** Up to 5 matches of each kind, each with its detail (spec 4.12). */
export type SearchResults = {
  organizations: { id: number; name: string; industry: string | null }[];
  contacts: { id: number; name: string; organization: string | null }[];
  deals: { id: number; name: string; organization: string | null; stage: Stage }[];
};

/** The top bar's search for `term`, which waits until there's something to search for. */
export function useSearch(term: string) {
  return useQuery({
    queryKey: queryKeys.search(term),
    queryFn: () => api.get<SearchResults>("/search", { q: term }),
    enabled: term !== "",
    placeholderData: keepPreviousData,
  });
}

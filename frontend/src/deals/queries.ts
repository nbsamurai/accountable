import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Authored, type Page, type Ref } from "../lib/api";
import { queryKeys, refreshAfterChange, refreshAfterDelete } from "../lib/queryKeys";
import type { Stage } from "../lib/stages";
import type { TableState } from "../lib/useUrlState";

export type DealContact = Ref & {
  organization_id: number | null;
  organization_name: string | null;
};

export type Deal = {
  id: number;
  name: string;
  organization: Ref | null;
  contact: DealContact | null;
  stage: Stage;
  value: number | null;
  probability: number;
  expected_revenue: number;
  close_date: string | null;
  late: boolean;
  board_position: number;
  activity_count: number;
  created_at: string;
  updated_at: string;
};

export type DealDetail = Deal & Authored & { stage_change_count: number };

/** A deal after a change, and the contact it made a customer, if any. */
export type DealChange = {
  deal: DealDetail;
  contact: { id: number; name: string; status: string } | null;
};

export type DealValues = {
  name: string;
  organization_id: number | null;
  contact_id: number | null;
  stage: Stage;
  value: number | null;
  probability: number;
  close_date: string | null;
};

export function useDeals(state: TableState) {
  const params = { q: state.q, sort: state.sort, dir: state.dir, page: state.page };
  return useQuery({
    queryKey: queryKeys.deals.list(params),
    queryFn: () => api.get<Page<Deal>>("/deals", params),
    placeholderData: keepPreviousData,
  });
}

export function useDeal(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.deals.detail(id ?? 0),
    queryFn: () => api.get<DealDetail>(`/deals/${id}`),
    enabled: id !== undefined,
  });
}

export function useSaveDeal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: number; values: Partial<DealValues> }) =>
      id ? api.patch<DealChange>(`/deals/${id}`, values) : api.post<DealChange>("/deals", values),
    onSuccess: () => refreshAfterChange(client),
  });
}

export function useDeleteDeal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/deals/${id}`),
    onSuccess: (_, id) => refreshAfterDelete(client, "deals", id),
  });
}

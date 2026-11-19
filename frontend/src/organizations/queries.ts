import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Page } from "../lib/api";
import { queryKeys, refreshAfterChange, refreshAfterDelete } from "../lib/queryKeys";
import type { TableState } from "../lib/useUrlState";
import type { ContactSummary } from "../contacts/queries";
import type { Deal } from "../deals/queries";

export type Organization = {
  id: number;
  name: string;
  website: string | null;
  industry: string | null;
  notes: string | null;
  contact_count: number;
  open_deal_count: number;
  open_pipeline: number;
  created_at: string;
  updated_at: string;
};

export type OrganizationDetail = Organization & {
  deal_count: number;
  figures: { open_pipeline: number; expected_revenue: number; won_to_date: number };
  contacts: ContactSummary[];
  deals: Deal[];
};

export type OrganizationValues = {
  name: string;
  website: string;
  industry: string;
  notes: string;
};

export function useOrganizations(state: TableState) {
  const params = { q: state.q, sort: state.sort, dir: state.dir, page: state.page };
  return useQuery({
    queryKey: queryKeys.organizations.list(params),
    queryFn: () => api.get<Page<Organization>>("/organizations", params),
    placeholderData: keepPreviousData,
  });
}

export function useOrganization(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.organizations.detail(id ?? 0),
    queryFn: () => api.get<OrganizationDetail>(`/organizations/${id}`),
    enabled: id !== undefined,
  });
}

export function useSaveOrganization() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: number; values: OrganizationValues }) =>
      id
        ? api.patch<OrganizationDetail>(`/organizations/${id}`, values)
        : api.post<OrganizationDetail>("/organizations", values),
    onSuccess: () => refreshAfterChange(client),
  });
}

export function useDeleteOrganization() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/organizations/${id}`),
    onSuccess: (_, id) => refreshAfterDelete(client, "organizations", id),
  });
}

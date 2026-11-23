import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Deal } from "../deals/queries";
import { api, type Authored, type Page, type Ref } from "../lib/api";
import { queryKeys, refreshAfterChange, refreshAfterDelete } from "../lib/queryKeys";
import type { Status } from "../lib/stages";
import type { TableState } from "../lib/useUrlState";

export type Contact = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  organization: Ref | null;
  status: Status;
  deal_count: number;
  activity_count: number;
  created_at: string;
  updated_at: string;
};

export type ContactDetail = Contact & Authored & { deals: Deal[] };

/** A contact in an organization's Contacts panel. */
export type ContactSummary = {
  id: number;
  name: string;
  job_title: string | null;
  status: Status;
  email: string | null;
};

export type StatusCounts = { all: number; lead: number; qualified: number; customer: number };

export type ContactPage = Page<Contact> & { status_counts: StatusCounts };

export type ContactValues = {
  name: string;
  email: string;
  phone: string;
  job_title: string;
  organization_id: number | null;
  status: Status;
};

export function useContacts(state: TableState) {
  const params = {
    q: state.q,
    status: state.filters.status,
    sort: state.sort,
    dir: state.dir,
    page: state.page,
  };
  return useQuery({
    queryKey: queryKeys.contacts.list(params),
    queryFn: () => api.get<ContactPage>("/contacts", params),
    placeholderData: keepPreviousData,
  });
}

export function useContact(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id ?? 0),
    queryFn: () => api.get<ContactDetail>(`/contacts/${id}`),
    enabled: id !== undefined,
  });
}

export function useSaveContact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id?: number; values: ContactValues }) =>
      id
        ? api.patch<ContactDetail>(`/contacts/${id}`, values)
        : api.post<ContactDetail>("/contacts", values),
    onSuccess: () => refreshAfterChange(client),
  });
}

export function useDeleteContact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/contacts/${id}`),
    onSuccess: (_, id) => refreshAfterDelete(client, "contacts", id),
  });
}

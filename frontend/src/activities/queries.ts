import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Page, type Ref } from "../lib/api";
import { queryKeys, refreshAfterChange } from "../lib/queryKeys";

export type LoggedType = "note" | "call" | "email";
export type ActivityType = LoggedType | "stage_change";
export type Activity = {
  id: number;
  type: ActivityType;
  description: string;
  occurred_at: string;
  follow_up_date: string | null;
  done: boolean;
  contact: Ref | null;
  deal: Ref | null;
};

export type EditableActivity = Activity & { type: LoggedType };
export type ActivityTarget = { area: "contacts" | "deals"; id: number };
export type ActivityValues = {
  type: LoggedType;
  description: string;
  occurred_at?: string;
  follow_up_date: string | null;
};

export function useTimeline({ area, id }: ActivityTarget) {
  return useInfiniteQuery({
    queryKey: queryKeys[area].timeline(id),
    queryFn: ({ pageParam }) =>
      api.get<Page<Activity>>(`/${area}/${id}/timeline`, { offset: pageParam, limit: 50 }),
    initialPageParam: 0,
    getNextPageParam: (page, _, offset) => {
      const next = offset + page.items.length;
      return page.items.length && next < page.total ? next : undefined;
    },
  });
}

export function useSaveActivity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ values, target }: { values: ActivityValues; target: ActivityTarget }) => {
      const parent =
        target.area === "contacts" ? { contact_id: target.id } : { deal_id: target.id };
      return api.post<Activity>("/activities", { ...values, ...parent });
    },
    onSuccess: () => refreshAfterChange(client),
  });
}

export function usePatchActivity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: number;
      values: Partial<ActivityValues & { done: boolean }>;
    }) => api.patch<Activity>(`/activities/${id}`, values),
    onSuccess: () => refreshAfterChange(client),
  });
}

export function useDeleteActivity() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/activities/${id}`),
    onSuccess: () => refreshAfterChange(client),
  });
}

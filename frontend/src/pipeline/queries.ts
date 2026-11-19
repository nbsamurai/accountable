import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DealChange } from "../deals/queries";
import { api, type Ref } from "../lib/api";
import { queryKeys, refreshAfterChange } from "../lib/queryKeys";
import type { Stage } from "../lib/stages";

export type CardDeal = {
  id: number;
  name: string;
  stage: Stage;
  value: number | null;
  probability: number;
  close_date: string | null;
  late: boolean;
  organization: Ref | null;
  contact: Ref | null;
};

export type BoardTotals = { count: number; value: number; expected_revenue: number };
export type ColumnData = BoardTotals & { stage: Stage; cards: CardDeal[] };
export type BoardData = { today: string; totals: BoardTotals; columns: ColumnData[] };
export type Drop = { stage: Stage; before_id: number | null };

export function usePipeline() {
  return useQuery({ queryKey: queryKeys.pipeline, queryFn: () => api.get<BoardData>("/pipeline") });
}

export function useMoveCard() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, drop }: { id: number; drop: Drop }) => api.post<DealChange>(`/deals/${id}/move`, drop),
    onSuccess: () => refreshAfterChange(client),
  });
}

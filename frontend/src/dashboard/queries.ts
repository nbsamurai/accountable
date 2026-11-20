import { useQuery } from "@tanstack/react-query";
import type { Activity } from "../activities/queries";
import { api } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import type { Stage } from "../lib/stages";

export type Month = { month: string; count: number; value: number };
export type FunnelStep = { stage: Stage; count: number; value: number; share: number };
export type Dashboard = {
  today: string;
  pipeline: {
    count: number;
    value: number;
    expected_revenue: number;
    stages: { stage: Stage; value: number }[];
  };
  won_this_month: Month;
  win_rate: { closed: number; won: number; percent: number | null };
  months: Month[];
  funnel: FunnelStep[];
  follow_ups: Activity[];
  recent_activity: Activity[];
};

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get<Dashboard>("/dashboard"),
  });
}

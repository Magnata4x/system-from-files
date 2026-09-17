import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";

export interface AlertSettings {
  channels: {
    telegram: { on: boolean; username: string | null };
    email: { on: boolean; address: string };
    push: { on: boolean };
    discord: { on: boolean; webhook: string };
    whatsapp: { on: boolean };
  };
  types: Record<string, boolean>;
  minScore: number;
  frequency: "realtime" | "15min" | "hourly" | "daily";
  quietHours: { on: boolean; from: string; to: string };
  assets: string[];
  bot4x: boolean;
}

export interface AlertFeedItem {
  id: string;
  kind: "manipulation" | "signal" | "volatility" | "profit";
  type: string;
  asset: string;
  description: string;
  at: number;
  read: boolean;
}

export function useAlertSettings() {
  return useQuery({
    queryKey: ["alerts", "settings"],
    queryFn: () => api.get<AlertSettings>("/alerts/settings"),
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSaveAlertSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AlertSettings>) => api.put<AlertSettings>("/alerts/settings", patch),
    onSuccess: (data) => qc.setQueryData(["alerts", "settings"], data),
  });
}

export function useAlertFeed() {
  return useQuery({
    queryKey: ["alerts", "feed"],
    queryFn: () => api.get<AlertFeedItem[]>("/alerts/feed"),
    staleTime: 15_000,
    refetchInterval: 30_000,
    retry: 1,
  });
}

export function useMarkAlerts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { id?: string; all?: boolean }) => api.post("/alerts/feed", payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", "feed"] }),
  });
}

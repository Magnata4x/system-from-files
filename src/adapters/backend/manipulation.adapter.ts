// src/adapters/backend/manipulation.adapter.ts
import { api } from "./api.adapter";
import type { Alert, Severity, AlertType } from "@/lib/manipulation-data";

export interface BackendManipulationAlert {
  id: string;
  severity: string;
  type: string;
  pair: string;
  timeframe: string;
  confidence: number;
  description: string;
  action: string;
  detail?: string;
  createdAt: string;
}

export interface BackendManipulationSnapshot {
  pair: string;
  score: number;
  type: string;
  confidence: number;
  detectedAt: string;
}

function formatAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "agora";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function mapAlert(b: BackendManipulationAlert): Alert {
  return {
    id: b.id,
    severity: (b.severity?.toUpperCase() ?? "MEDIUM") as Severity,
    type: (b.type ?? "STOP HUNT") as AlertType,
    asset: b.pair,
    tf: b.timeframe ?? "1H",
    confidence: b.confidence ?? 50,
    ago: formatAgo(b.createdAt),
    desc: b.description ?? "",
    action: b.action ?? "",
    detail: b.detail ?? "",
  };
}

export const manipulationAdapter = {
  async getAlerts(limit = 20): Promise<Alert[]> {
    try {
      const data = await api.get<BackendManipulationAlert[]>(
        `/manipulation/alerts?limit=${limit}`,
      );
      return (data ?? []).map(mapAlert);
    } catch {
      return [];
    }
  },

  async getSnapshot(pair: string): Promise<BackendManipulationSnapshot | null> {
    try {
      return await api.get<BackendManipulationSnapshot>(
        `/manipulation/snapshot/${pair}`,
      );
    } catch {
      return null;
    }
  },
};

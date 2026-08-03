// src/adapters/backend/manipulation.adapter.ts
import { api } from "./api.adapter";
import type { Alert, Severity, AlertType } from "@/lib/manipulation-data";

// Shape real do backend NestJS (rota autenticada em /api/manipulation/*).
export interface BackendManipulationAlert {
  id: string;
  symbol: string;
  price: number;
  volume: number;
  score: number;
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | string;
  patterns: string[];
  timestamp: string;
}

export interface BackendManipulationSnapshot {
  symbol: string;
  latestAlert: BackendManipulationAlert | null;
  last24h: { alertCount: number; avgScore: number; maxScore: number };
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | string;
  updatedAt: string;
}

function formatAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "agora";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

const ALERT_TYPES: AlertType[] = [
  "STOP HUNT",
  "LIQUIDITY GRAB",
  "FAKE BREAKOUT",
  "SPOOFING",
  "ABSORPTION",
  "PUMP&DUMP",
];

function normalizePattern(p?: string): AlertType {
  if (!p) return "STOP HUNT";
  const up = p.toUpperCase().replace(/[_-]/g, " ").trim();
  const found = ALERT_TYPES.find((t) => t === up);
  return (found ?? "STOP HUNT") as AlertType;
}

export function mapAlert(b: BackendManipulationAlert): Alert {
  const primary = b.patterns?.[0];
  const extras = (b.patterns ?? []).slice(1).join(", ");
  return {
    id: b.id,
    severity: (String(b.riskLevel).toUpperCase() as Severity) || "MEDIUM",
    type: normalizePattern(primary),
    asset: b.symbol,
    tf: "1H",
    confidence: Math.round(b.score ?? 0),
    ago: formatAgo(b.timestamp),
    desc: `Price ${b.price} · Volume ${b.volume}${primary ? ` · ${primary}` : ""}`,
    action: `Risk ${b.riskLevel}`,
    detail: extras ? `Patterns: ${extras}` : "",
  };
}

export const manipulationAdapter = {
  async getAlerts(
    opts: { symbol?: string; riskLevel?: string; limit?: number } = {},
  ): Promise<Alert[]> {
    const params = new URLSearchParams();
    if (opts.symbol) params.set("symbol", opts.symbol);
    if (opts.riskLevel) params.set("riskLevel", opts.riskLevel);
    params.set("limit", String(opts.limit ?? 20));
    // Erros propagam para o React Query renderizar o estado de erro na UI.
    const data = await api.get<BackendManipulationAlert[]>(
      `/manipulation/alerts?${params.toString()}`,
    );
    return (data ?? []).map(mapAlert);
  },

  async getSnapshot(pair: string): Promise<BackendManipulationSnapshot | null> {
    return await api.get<BackendManipulationSnapshot>(
      `/manipulation/snapshot/${encodeURIComponent(pair)}`,
    );
  },
};

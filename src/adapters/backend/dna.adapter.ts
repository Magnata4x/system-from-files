// Mapeia DnaProfile do backend para o shape consumido pelo dashboard DNA.
import { api, endpoints } from "./api.adapter";

export interface BackendDnaProfile {
  userId: string;
  hasProfile: boolean;
  consistency: number | null;
  discipline: number | null;
  riskControl: number | null;
  timing: number | null;
  emotionalControl: number | null;
  avgWinRate: number | null;
  bestSession: string | null;
  worstSession: string | null;
  overtradingRisk: boolean | null;
  tradingStyle: "conservative" | "moderate" | "aggressive" | null;
  [k: string]: unknown;
}

export interface DnaProfileUI {
  userId: string;
  hasProfile: boolean;
  dnaConsistency: number | null;
  dnaDiscipline: number | null;
  dnaRiskControl: number | null;
  dnaTiming: number | null;
  dnaEmotionalControl: number | null;
  avgWinRate: number | null;
  bestSession: string | null;
  worstSession: string | null;
  overtradingRisk: boolean | null;
  style: "conservative" | "moderate" | "aggressive" | null;
  raw?: BackendDnaProfile;
}

export function mapDnaProfile(p: BackendDnaProfile): DnaProfileUI {
  return {
    userId: p.userId,
    hasProfile: p.hasProfile,
    dnaConsistency: p.consistency,
    dnaDiscipline: p.discipline,
    dnaRiskControl: p.riskControl,
    dnaTiming: p.timing,
    dnaEmotionalControl: p.emotionalControl,
    avgWinRate: p.avgWinRate,
    bestSession: p.bestSession,
    worstSession: p.worstSession,
    overtradingRisk: p.overtradingRisk,
    style: p.tradingStyle,
    raw: p,
  };
}

export const dnaAdapter = {
  async profile(userId: string): Promise<DnaProfileUI | null> {
    const data = await api.get<BackendDnaProfile | null>(endpoints.dna.profile(userId));
    return data ? mapDnaProfile(data) : null;
  },
};

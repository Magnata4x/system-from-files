// Mapeia DnaProfile do backend para o shape consumido pelo dashboard DNA.
import { api, endpoints } from "./api.adapter";

export interface BackendDnaProfile {
  userId: string;
  consistency?: number;
  discipline?: number;
  riskControl?: number;
  timing?: number;
  emotionalControl?: number;
  avgWinRate?: number;
  bestSession?: string;
  worstSession?: string;
  overtradingRisk?: boolean;
  tradingStyle?: "conservative" | "moderate" | "aggressive";
  [k: string]: unknown;
}

export interface DnaProfileUI {
  userId: string;
  dnaConsistency?: number;
  dnaDiscipline?: number;
  dnaRiskControl?: number;
  dnaTiming?: number;
  dnaEmotionalControl?: number;
  avgWinRate?: number;
  bestSession?: string;
  worstSession?: string;
  overtradingRisk?: boolean;
  style?: "conservative" | "moderate" | "aggressive";
  raw?: BackendDnaProfile;
}

export function mapDnaProfile(p: BackendDnaProfile): DnaProfileUI {
  return {
    userId: p.userId,
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

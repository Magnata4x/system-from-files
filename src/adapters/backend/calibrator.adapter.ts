// Adaptador para o Bot4x Calibration Engine (BCE).
// Mapeia o JSON canônico do Calibrador para o consumo no frontend.
// NÃO substitui o store local — apenas expõe os dados do backend.
import { api } from "./api.adapter";

export type CalibratorState = "OPTIMAL" | "WARNING" | "RISK_DRIFT" | "PROTECTION" | "SHUTDOWN";

export type CalibratorTradeAllowance = "LOW" | "MEDIUM" | "HIGH" | "BLOCKED";

export interface BackendCalibratorPayload {
  state: CalibratorState;
  risk_multiplier: number;
  trade_allowance: CalibratorTradeAllowance;
  behavioral_flags?: string[];
  actions?: string[];
  dna_feedback?: {
    pattern_detected?: string;
    correction?: string;
    expected_improvement?: string;
  };
  commentary?: string;
  // Mapeamento para o perfil local do tab-calibrador (opcional)
  profile?: "conservador" | "rsi" | "aiscore" | "agressivo" | "scalper" | "intraday" | "swing" | "position";
  updatedAt?: string;
}

export interface CalibratorStateUI {
  state: CalibratorState;
  riskMultiplier: number;
  tradeAllowance: CalibratorTradeAllowance;
  behavioralFlags: string[];
  actions: string[];
  dnaFeedback: {
    patternDetected: string;
    correction: string;
    expectedImprovement: string;
  };
  commentary: string;
  profile?: BackendCalibratorPayload["profile"];
  updatedAt?: string;
  raw?: BackendCalibratorPayload;
}

export function mapCalibratorState(p: BackendCalibratorPayload): CalibratorStateUI {
  return {
    state: p.state,
    riskMultiplier: p.risk_multiplier,
    tradeAllowance: p.trade_allowance,
    behavioralFlags: p.behavioral_flags ?? [],
    actions: p.actions ?? [],
    dnaFeedback: {
      patternDetected: p.dna_feedback?.pattern_detected ?? "",
      correction: p.dna_feedback?.correction ?? "",
      expectedImprovement: p.dna_feedback?.expected_improvement ?? "",
    },
    commentary: p.commentary ?? "",
    profile: p.profile,
    updatedAt: p.updatedAt,
    raw: p,
  };
}

export const calibratorEndpoints = {
  state: (userId: string) => `/calibrator/state/${userId}`,
  feedback: (userId: string) => `/calibrator/feedback/${userId}`,
  simulate: (userId: string) => `/calibrator/simulate/${userId}`,
} as const;

export type SimulationProfile =
  | "conservador"
  | "rsi"
  | "aiscore"
  | "agressivo"
  | "scalper"
  | "intraday"
  | "swing"
  | "position";

export interface BackendSimulationRequest {
  profile: SimulationProfile;
  symbol: string;
  period_days: number;
  initial_balance?: number;
  /** Alavancagem aplicada por trade (1× a 125×). */
  leverage?: number;
  /** ISO date (YYYY-MM-DD) — fim da janela do backtest (inclusivo). */
  end_date?: string;
  /** ISO date (YYYY-MM-DD) — início da janela do backtest. */
  start_date?: string;
}

export interface BackendSimulationPoint {
  t: string;
  equity: number;
}

export interface BackendSimulationResponse {
  trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  pnl: number;
  pnl_pct: number;
  max_drawdown: number;
  sharpe?: number;
  equity_curve: BackendSimulationPoint[];
  dna_feedback?: BackendCalibratorPayload["dna_feedback"];
  commentary?: string;
}

export interface PairStatUI {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
}
export interface RiskSummaryUI {
  dayStops: number;
  dayTakes: number;
  haltedDays: number;
  liquidated: boolean;
}

export interface SimulationResultUI {
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnl: number;
  pnlPct: number;
  maxDrawdown: number;
  sharpe: number;
  equityCurve: { t: string; equity: number }[];
  dnaFeedback: {
    patternDetected: string;
    correction: string;
    expectedImprovement: string;
  };
  commentary: string;
  byPair?: PairStatUI[];
  risk?: RiskSummaryUI;
  raw?: BackendSimulationResponse;
}

export function mapSimulationResult(
  r: BackendSimulationResponse & { by_pair?: PairStatUI[]; risk?: RiskSummaryUI },
): SimulationResultUI {
  return {
    trades: r.trades,
    wins: r.wins,
    losses: r.losses,
    winRate: r.win_rate,
    pnl: r.pnl,
    pnlPct: r.pnl_pct,
    maxDrawdown: r.max_drawdown,
    sharpe: r.sharpe ?? 0,
    equityCurve: r.equity_curve ?? [],
    dnaFeedback: {
      patternDetected: r.dna_feedback?.pattern_detected ?? "",
      correction: r.dna_feedback?.correction ?? "",
      expectedImprovement: r.dna_feedback?.expected_improvement ?? "",
    },
    commentary: r.commentary ?? "",
    byPair: r.by_pair,
    risk: r.risk,
    raw: r,
  };
}

export const calibratorAdapter = {
  async getState(userId: string): Promise<CalibratorStateUI | null> {
    try {
      const data = await api.get<BackendCalibratorPayload | null>(calibratorEndpoints.state(userId));
      return data ? mapCalibratorState(data) : null;
    } catch {
      return null;
    }
  },
  async sendFeedback(userId: string, payload: Record<string, unknown>) {
    try {
      return await api.post(calibratorEndpoints.feedback(userId), payload);
    } catch {
      return null;
    }
  },
  async simulate(userId: string, req: BackendSimulationRequest): Promise<SimulationResultUI> {
    try {
      const data = await api.post<BackendSimulationResponse>(calibratorEndpoints.simulate(userId), req);
      return mapSimulationResult(data);
    } catch (e: any) {
      const isNetwork = !e?.response || e?.code === "ERR_NETWORK" || e?.message === "Network Error";
      if (!isNetwork) throw e;
      const { fetchKlines, planFetch } = await import("@/lib/market-data");
      const { runBacktest } = await import("@/lib/calibrator-backtest");
      const plan = planFetch(req.period_days);
      const endTime = req.end_date ? Date.parse(`${req.end_date}T23:59:59Z`) : undefined;
      const startTime = req.start_date ? Date.parse(`${req.start_date}T00:00:00Z`) : undefined;
      const candles = await fetchKlines(req.symbol, plan.interval, plan.limit, {
        startTime: Number.isFinite(startTime) ? startTime : undefined,
        endTime: Number.isFinite(endTime) ? endTime : undefined,
      });
      const result = runBacktest({
        profile: req.profile,
        symbol: req.symbol,
        candles,
        initialBalance: req.initial_balance ?? 10000,
        leverage: req.leverage ?? 1,
      });
      return mapSimulationResult(result);
    }
  },
  /**
   * Portfolio backtest: roda N pares simultâneos com gestão de risco
   * unificada — máx 10 operações simultâneas, 10% do equity por slot,
   * SL/TP por trade e circuit breakers diários (-1.5% / +3%).
   *
   * MODELO DE RISCO (sync com bot4x-store.ts):
   *   banca → allocationPct → capital ativo → 10% por slot → slot size
   *   Pior caso: 10 slots × 10% × SL 0.5% = 0.5% do capital ativo.
   */
  async simulatePortfolio(
    _userId: string,
    req: Omit<BackendSimulationRequest, "symbol"> & { symbols: string[] },
  ): Promise<SimulationResultUI> {
    const { fetchKlines, planFetch } = await import("@/lib/market-data");
    const { runPortfolioBacktest } = await import("@/lib/calibrator-backtest");
    const plan = planFetch(req.period_days);
    const endTime = req.end_date ? Date.parse(`${req.end_date}T23:59:59Z`) : undefined;
    const startTime = req.start_date ? Date.parse(`${req.start_date}T00:00:00Z`) : undefined;
    const symbols = await Promise.all(
      req.symbols.map(async (sym) => {
        try {
          const candles = await fetchKlines(sym, plan.interval, plan.limit, {
            startTime: Number.isFinite(startTime) ? startTime : undefined,
            endTime: Number.isFinite(endTime) ? endTime : undefined,
          });
          return { symbol: sym, candles };
        } catch {
          return { symbol: sym, candles: [] };
        }
      }),
    );
    const result = runPortfolioBacktest({
      profile: req.profile,
      symbols: symbols.filter((s) => s.candles.length > 0),
      initialBalance: req.initial_balance ?? 10000,
      leverage: req.leverage ?? 1,
    });
    return mapSimulationResult(result);
  },
};

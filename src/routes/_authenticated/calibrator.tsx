import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import {
  calibratorAdapter,
  type SimulationProfile,
  type SimulationResultUI,
} from "@/adapters/backend/calibrator.adapter";
import { TOP_20_USDT_PAIRS, planFetch } from "@/lib/market-data";
import { recordSimulation } from "@/lib/calibrator-history-store";
import { Switch } from "@/components/ui/switch";
import { FlaskConical, Loader2, TrendingUp, TrendingDown, Activity, AlertCircle, History, Zap, Layers } from "lucide-react";

interface MultiPairRow {
  symbol: string;
  label: string;
  status: "pending" | "ok" | "error";
  result?: SimulationResultUI;
  error?: string;
}

const VALID_PROFILES: SimulationProfile[] = ["conservador", "rsi", "aiscore", "agressivo", "scalper", "intraday", "swing", "position"];

type CalibratorSearch = {
  profile?: SimulationProfile;
  symbol?: string;
  period_days?: number;
  initial_balance?: number;
  leverage?: number;
  autorun?: number;
};

export const Route = createFileRoute("/_authenticated/calibrator")({
  head: () => ({
    meta: [
      { title: "Calibrator — AISignalRadar" },
      { name: "description", content: "Run historical backtests to calibrate your trading DNA via the Bot4x Calibration Engine." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>): CalibratorSearch => {
    const rawProfile = typeof search.profile === "string" ? search.profile : undefined;
    const profile = rawProfile && (VALID_PROFILES as string[]).includes(rawProfile)
      ? (rawProfile as SimulationProfile)
      : undefined;
    const symbol = typeof search.symbol === "string" ? search.symbol : undefined;
    const periodDaysNum = Number(search.period_days);
    const period_days = Number.isFinite(periodDaysNum) && periodDaysNum > 0 ? periodDaysNum : undefined;
    const balanceNum = Number(search.initial_balance);
    const initial_balance = Number.isFinite(balanceNum) && balanceNum > 0 ? balanceNum : undefined;
    const leverageNum = Number(search.leverage);
    const leverage = Number.isFinite(leverageNum) && leverageNum >= 1 ? leverageNum : undefined;
    const autorunNum = Number(search.autorun);
    const autorun = Number.isFinite(autorunNum) && autorunNum > 0 ? 1 : undefined;
    return { profile, symbol, period_days, initial_balance, leverage, autorun };
  },
  component: CalibratorPage,
});

const PROFILES: { value: SimulationProfile; label: string }[] = [
  { value: "conservador", label: "Conservador" },
  { value: "rsi", label: "RSI" },
  { value: "aiscore", label: "AI Score" },
  { value: "agressivo", label: "Agressivo" },
  { value: "scalper", label: "Scalper (M1-M5 · Bot4x)" },
  { value: "intraday", label: "Intraday (M15-H1 · Bot4x)" },
  { value: "swing", label: "Swing (H4-D1 · Bot4x)" },
  { value: "position", label: "Position (D1-W1 · Bot4x)" },
];

function CalibratorPage() {
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<SimulationProfile>(search.profile ?? "rsi");
  const [symbol, setSymbol] = useState(search.symbol ?? "BTCUSDT");
  const [periodDays, setPeriodDays] = useState(search.period_days ?? 30);
  const [initialBalance, setInitialBalance] = useState(search.initial_balance ?? 10000);
  const [leverage, setLeverage] = useState(search.leverage ?? 1);
  const [timeframeMode, setTimeframeMode] = useState<"preset" | "custom">("preset");
  const todayIso = new Date().toISOString().slice(0, 10);
  const defaultStartIso = new Date(Date.now() - (search.period_days ?? 30) * 86400000)
    .toISOString()
    .slice(0, 10);
  const [customStart, setCustomStart] = useState<string>(defaultStartIso);
  const [customEnd, setCustomEnd] = useState<string>(todayIso);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResultUI | null>(null);
  const [multiPair, setMultiPair] = useState(false);
  const [multiResults, setMultiResults] = useState<MultiPairRow[] | null>(null);
  const autorunHandledRef = useRef(false);

  async function runSimulation() {
    if (!user?.id) {
      setError("Usuário não autenticado.");
      return;
    }
    setLoading(true);
    setError(null);
    let effectivePeriodDays = periodDays;
    let startDate: string | undefined;
    let endDate: string | undefined;
    if (timeframeMode === "custom") {
      const s = Date.parse(`${customStart}T00:00:00Z`);
      const e = Date.parse(`${customEnd}T23:59:59Z`);
      if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) {
        setError("Intervalo customizado inválido: a data final deve ser posterior à inicial.");
        setLoading(false);
        return;
      }
      effectivePeriodDays = Math.max(1, Math.ceil((e - s) / 86400000));
      startDate = customStart;
      endDate = customEnd;
    }
    const baseReq = {
      profile,
      period_days: effectivePeriodDays,
      initial_balance: initialBalance,
      leverage,
      start_date: startDate,
      end_date: endDate,
    };

    if (multiPair) {
      setResult(null);
      setMultiResults(null);
      try {
        const res = await calibratorAdapter.simulatePortfolio(user.id, {
          ...baseReq,
          symbols: TOP_20_USDT_PAIRS.map((p) => p.symbol),
        });
        setResult(res);
        void recordSimulation(user.id, {
          profile,
          symbol: "PORTFOLIO_20",
          periodDays: effectivePeriodDays,
          initialBalance,
          leverage,
        }, res).catch((err) => console.error("[calibrator] recordSimulation error:", err));

      } catch (e: any) {
        setError(e?.message ?? "Falha ao executar simulação multi-par.");
      } finally {
        setLoading(false);
      }
      return;
    }


    const params = {
      profile,
      symbol: symbol.trim().toUpperCase(),
      periodDays: effectivePeriodDays,
      initialBalance,
      leverage,
    };
    try {
      setMultiResults(null);
      const res = await calibratorAdapter.simulate(user.id, {
        ...baseReq,
        symbol: params.symbol,
      });
      setResult(res);
      void recordSimulation(user.id, params, res).catch((err) => console.error("[calibrator] recordSimulation error:", err));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? "Falha ao executar simulação.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (autorunHandledRef.current) return;
    if (search.autorun && user?.id) {
      autorunHandledRef.current = true;
      runSimulation();
      // limpa a flag da URL para não reexecutar em refresh
      navigate({
        to: "/calibrator",
        search: {
          profile: search.profile,
          symbol: search.symbol,
          period_days: search.period_days,
          initial_balance: search.initial_balance,
          leverage: search.leverage,
        },
        replace: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.autorun, user?.id]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FlaskConical className="size-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Calibrator</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Backtest histórico de perfis para calibrar o DNA via Bot4x Calibration Engine.
                </p>
              </div>
            </div>
            <Link to="/calibrator/history">
              <Button variant="outline" size="sm">
                <History className="size-4 mr-2" /> Histórico
              </Button>
            </Link>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Form */}
            <Card className="p-5 lg:col-span-1 space-y-4">
              <h2 className="text-sm font-semibold">Configuração da simulação</h2>

              <div className="space-y-2">
                <Label htmlFor="profile">Perfil</Label>
                <Select value={profile} onValueChange={(v) => setProfile(v as SimulationProfile)}>
                  <SelectTrigger id="profile">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-md border border-border bg-muted/30 p-2.5">
                <div className="space-y-0.5">
                  <Label htmlFor="multi" className="flex items-center gap-1.5 text-xs font-medium">
                    <Layers className="size-3.5 text-primary" /> Calibrar 20 pares simultâneos
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Executa o backtest em paralelo no Top 20 USDT.
                  </p>
                </div>
                <Switch id="multi" checked={multiPair} onCheckedChange={setMultiPair} />
              </div>

              {!multiPair && (
                <div className="space-y-2">
                  <Label htmlFor="symbol">Par (Top 20 vs USDT)</Label>
                  <Select value={symbol} onValueChange={setSymbol}>
                    <SelectTrigger id="symbol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TOP_20_USDT_PAIRS.map((p) => (
                        <SelectItem key={p.symbol} value={p.symbol}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Janela do backtest</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[7, 30, 90, 180, 365].map((d) => {
                    const active = timeframeMode === "preset" && periodDays === d;
                    return (
                      <Button
                        key={d}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="h-7 px-2.5 text-xs"
                        onClick={() => {
                          setTimeframeMode("preset");
                          setPeriodDays(d);
                        }}
                      >
                        {d}d
                      </Button>
                    );
                  })}
                  <Button
                    type="button"
                    size="sm"
                    variant={timeframeMode === "custom" ? "default" : "outline"}
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setTimeframeMode("custom")}
                  >
                    Custom
                  </Button>
                </div>

                {timeframeMode === "preset" ? (
                  <div className="space-y-1.5 pt-1">
                    <Label htmlFor="period" className="text-[11px] text-muted-foreground">
                      Ou informe outro valor (dias)
                    </Label>
                    <Input
                      id="period"
                      type="number"
                      min={1}
                      max={365}
                      value={periodDays}
                      onChange={(e) => setPeriodDays(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="dstart" className="text-[11px] text-muted-foreground">Início</Label>
                      <Input
                        id="dstart"
                        type="date"
                        max={customEnd || todayIso}
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dend" className="text-[11px] text-muted-foreground">Fim</Label>
                      <Input
                        id="dend"
                        type="date"
                        min={customStart}
                        max={todayIso}
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                    <p className="col-span-2 text-[11px] text-muted-foreground">
                      Janela: {Math.max(1, Math.ceil((Date.parse(`${customEnd}T23:59:59Z`) - Date.parse(`${customStart}T00:00:00Z`)) / 86400000)) || 0} dia(s).
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="balance">Saldo inicial (USDT)</Label>
                <Input
                  id="balance"
                  type="number"
                  min={100}
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(Number(e.target.value) || 100)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="leverage" className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-amber-500" /> Alavancagem ({leverage}×)
                </Label>
                <Input
                  id="leverage"
                  type="number"
                  min={1}
                  max={125}
                  step={1}
                  value={leverage}
                  onChange={(e) => setLeverage(Math.max(1, Math.min(125, Number(e.target.value) || 1)))}
                />
                <p className="text-[11px] text-muted-foreground">
                  1× a 125×. Alavancagem alta = liquidação possível.
                </p>
              </div>

              {(() => {
                const days =
                  timeframeMode === "custom"
                    ? Math.max(
                        1,
                        Math.ceil(
                          (Date.parse(`${customEnd}T23:59:59Z`) -
                            Date.parse(`${customStart}T00:00:00Z`)) /
                            86400000,
                        ) || 0,
                      )
                    : periodDays;
                if (!Number.isFinite(days) || days <= 0) return null;
                const plan = planFetch(days);
                const theoretical =
                  plan.interval === "1h" ? days * 24 : plan.interval === "4h" ? days * 6 : days;
                const clamped = theoretical > 1000;
                const intervalLabel =
                  plan.interval === "1h" ? "1 hora" : plan.interval === "4h" ? "4 horas" : "1 dia";
                return (
                  <div className="rounded-md border border-border bg-muted/30 p-2.5 text-[11px] space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Candles estimados</span>
                      <span className="font-semibold tabular-nums">
                        ~{plan.limit.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      Timeframe: <span className="text-foreground">{intervalLabel}</span> · Janela:{" "}
                      <span className="text-foreground">{days}d</span>
                    </div>
                    {clamped && (
                      <div className="text-amber-500">
                        Limite da Binance: 1000 candles por requisição (de {theoretical.toLocaleString("pt-BR")} possíveis).
                      </div>
                    )}
                  </div>
                );
              })()}


              <Button onClick={runSimulation} disabled={loading} className="w-full">
                {loading ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Executando…</>
                ) : (
                  <><FlaskConical className="size-4 mr-2" /> Rodar simulação</>
                )}
              </Button>

              {error && (
                <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-md p-2">
                  <AlertCircle className="size-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
            </Card>

            {/* Results */}
            <div className="lg:col-span-2 space-y-5">
              {!result && !multiResults && !loading && (
                <Card className="p-10 text-center text-sm text-muted-foreground">
                  Configure os parâmetros à esquerda e execute uma simulação para visualizar os resultados.
                </Card>
              )}

              {multiResults && !loading && (
                <MultiPairPanel rows={multiResults} initialBalance={initialBalance} />
              )}

              {loading && (
                <Card className="p-10 flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="size-5 animate-spin" />
                  Executando backtest no Calibrador…
                </Card>
              )}

              {result && !multiResults && !loading && (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Metric label="Trades" value={String(result.trades)} icon={<Activity className="size-4" />} />
                    <Metric label="Win Rate" value={`${(result.winRate * 100).toFixed(1)}%`} tone={result.winRate >= 0.5 ? "pos" : "neg"} />
                    <Metric
                      label="PnL"
                      value={`${result.pnl >= 0 ? "+" : ""}${result.pnl.toFixed(2)} (${result.pnlPct.toFixed(2)}%)`}
                      tone={result.pnl >= 0 ? "pos" : "neg"}
                      icon={result.pnl >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                    />
                    <Metric label="Max Drawdown" value={`${(result.maxDrawdown * 100).toFixed(2)}%`} tone="neg" />
                  </div>

                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold">Equity curve</h3>
                      <span className="text-xs text-muted-foreground">{result.equityCurve.length} pontos</span>
                    </div>
                    <EquitySparkline points={result.equityCurve} />
                  </Card>

                  {result.risk && (
                    <Card className="p-5">
                      <h3 className="text-sm font-semibold mb-3">Gestão de risco</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <RiskCell label="SL diários acionados" value={String(result.risk.dayStops)} tone={result.risk.dayStops > 0 ? "neg" : undefined} />
                        <RiskCell label="TP diários acionados" value={String(result.risk.dayTakes)} tone={result.risk.dayTakes > 0 ? "pos" : undefined} />
                        <RiskCell label="Dias em pausa (24h)" value={String(result.risk.haltedDays)} />
                        <RiskCell label="Liquidado" value={result.risk.liquidated ? "Sim" : "Não"} tone={result.risk.liquidated ? "neg" : "pos"} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-3">
                        {profile === "scalper"
                          ? "Regras: SL 0,25% / TP 0,50% por trade · SL diário 1,5% (pausa 24h) · TP diário 3% com trailing de 1% · máx 6 operações simultâneas · ~16,7% da banca por operação."
                          : "Regras: SL 0,5% / TP 1% por trade · SL diário 1,5% (pausa 24h) · TP diário 3% com trailing de 1% · máx 3 operações simultâneas · 33% da banca por operação."}
                      </p>
                    </Card>
                  )}

                  {result.byPair && result.byPair.length > 0 && (
                    <Card className="p-5">
                      <h3 className="text-sm font-semibold mb-3">Resultado por par</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="text-muted-foreground">
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Par</th>
                              <th className="text-right py-2 font-medium">Trades</th>
                              <th className="text-right py-2 font-medium">Wins</th>
                              <th className="text-right py-2 font-medium">Losses</th>
                              <th className="text-right py-2 font-medium">PnL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...result.byPair].sort((a, b) => b.pnl - a.pnl).map((r) => (
                              <tr key={r.symbol} className="border-b border-border/50 hover:bg-muted/30">
                                <td className="py-2">{r.symbol}</td>
                                <td className="text-right tabular-nums">{r.trades}</td>
                                <td className="text-right tabular-nums text-emerald-500">{r.wins}</td>
                                <td className="text-right tabular-nums text-rose-500">{r.losses}</td>
                                <td className={`text-right tabular-nums ${r.pnl >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                                  {r.pnl >= 0 ? "+" : ""}{r.pnl.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </Card>
                  )}


                  {(result.commentary || result.dnaFeedback.patternDetected) && (
                    <Card className="p-5 space-y-3">
                      <h3 className="text-sm font-semibold">DNA feedback</h3>
                      {result.dnaFeedback.patternDetected && (
                        <Row k="Padrão detectado" v={result.dnaFeedback.patternDetected} />
                      )}
                      {result.dnaFeedback.correction && (
                        <Row k="Correção sugerida" v={result.dnaFeedback.correction} />
                      )}
                      {result.dnaFeedback.expectedImprovement && (
                        <Row k="Melhoria esperada" v={result.dnaFeedback.expectedImprovement} />
                      )}
                      {result.commentary && (
                        <p className="text-xs text-muted-foreground border-t border-border pt-3">{result.commentary}</p>
                      )}
                    </Card>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function RiskCell({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  const color = tone === "pos" ? "text-emerald-500" : tone === "neg" ? "text-rose-500" : "text-foreground";
  return (
    <div className="rounded-md border border-border bg-muted/20 p-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-base font-semibold mt-0.5 ${color}`}>{value}</div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "pos" | "neg";
  icon?: React.ReactNode;
}) {
  const color = tone === "pos" ? "text-emerald-500" : tone === "neg" ? "text-rose-500" : "text-foreground";
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </div>
      <div className={`text-lg font-semibold mt-1 ${color}`}>{value}</div>
    </Card>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="text-xs">
      <span className="text-muted-foreground">{k}: </span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}

function EquitySparkline({ points }: { points: { t: string; equity: number }[] }) {
  if (!points.length) {
    return <div className="text-xs text-muted-foreground">Sem dados de equity.</div>;
  }
  const w = 600;
  const h = 140;
  const pad = 4;
  const values = points.map((p) => p.equity);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / Math.max(points.length - 1, 1);
  const path = points
    .map((p, i) => {
      const x = pad + i * stepX;
      const y = h - pad - ((p.equity - min) / range) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const positive = points[points.length - 1].equity >= points[0].equity;
  const stroke = positive ? "rgb(16 185 129)" : "rgb(244 63 94)";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-36">
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}

function MultiPairPanel({ rows, initialBalance }: { rows: MultiPairRow[]; initialBalance: number }) {
  const done = rows.filter((r) => r.status === "ok" && r.result);
  const errors = rows.filter((r) => r.status === "error");
  const pending = rows.filter((r) => r.status === "pending");

  const totalTrades = done.reduce((a, r) => a + (r.result?.trades ?? 0), 0);
  const totalPnl = done.reduce((a, r) => a + (r.result?.pnl ?? 0), 0);
  const totalInvested = done.length * initialBalance;
  const aggPnlPct = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0;
  const avgWinRate = done.length
    ? done.reduce((a, r) => a + (r.result?.winRate ?? 0), 0) / done.length
    : 0;
  const worstDd = done.reduce((a, r) => Math.max(a, r.result?.maxDrawdown ?? 0), 0);
  const winners = done.filter((r) => (r.result?.pnl ?? 0) > 0).length;

  const sorted = [...done].sort(
    (a, b) => (b.result?.pnlPct ?? 0) - (a.result?.pnlPct ?? 0),
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Pares OK" value={`${done.length}/${rows.length}`} icon={<Layers className="size-4" />} />
        <Metric
          label="PnL agregado"
          value={`${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} (${aggPnlPct.toFixed(2)}%)`}
          tone={totalPnl >= 0 ? "pos" : "neg"}
          icon={totalPnl >= 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
        />
        <Metric label="Win rate médio" value={`${(avgWinRate * 100).toFixed(1)}%`} tone={avgWinRate >= 0.5 ? "pos" : "neg"} />
        <Metric label="Pior drawdown" value={`${(worstDd * 100).toFixed(2)}%`} tone="neg" />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Resultados por par</h3>
          <span className="text-xs text-muted-foreground">
            {winners} vencedores · {totalTrades} trades · {pending.length > 0 && `${pending.length} pendentes · `}{errors.length} erros
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium">Par</th>
                <th className="text-right py-2 font-medium">Trades</th>
                <th className="text-right py-2 font-medium">Win rate</th>
                <th className="text-right py-2 font-medium">PnL</th>
                <th className="text-right py-2 font-medium">PnL %</th>
                <th className="text-right py-2 font-medium">Max DD</th>
                <th className="text-right py-2 font-medium">Sharpe</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.symbol} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="py-2">{r.label}</td>
                  <td className="text-right tabular-nums">{r.result?.trades ?? 0}</td>
                  <td className="text-right tabular-nums">{((r.result?.winRate ?? 0) * 100).toFixed(1)}%</td>
                  <td className={`text-right tabular-nums ${(r.result?.pnl ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {(r.result?.pnl ?? 0) >= 0 ? "+" : ""}{(r.result?.pnl ?? 0).toFixed(2)}
                  </td>
                  <td className={`text-right tabular-nums ${(r.result?.pnlPct ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {(r.result?.pnlPct ?? 0).toFixed(2)}%
                  </td>
                  <td className="text-right tabular-nums text-rose-500">
                    {((r.result?.maxDrawdown ?? 0) * 100).toFixed(2)}%
                  </td>
                  <td className="text-right tabular-nums">{r.result?.sharpe?.toFixed(2) ?? "0.00"}</td>
                </tr>
              ))}
              {errors.map((r) => (
                <tr key={r.symbol} className="border-b border-border/50">
                  <td className="py-2">{r.label}</td>
                  <td colSpan={6} className="text-right text-destructive">{r.error}</td>
                </tr>
              ))}
              {pending.map((r) => (
                <tr key={r.symbol} className="border-b border-border/50 text-muted-foreground">
                  <td className="py-2">{r.label}</td>
                  <td colSpan={6} className="text-right">
                    <Loader2 className="size-3 inline animate-spin mr-1" /> processando…
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

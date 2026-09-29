import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy, Check, Sliders, ShieldCheck, Brain, Zap, ChevronDown, ArrowRight, X, TrendingUp, Activity, Mountain, Loader2, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { useBot4xStore } from "@/lib/bot4x-store";
import { PROFILES, type CalibProfile, type ProfileSpec } from "@/lib/bot4x-data";
import { useCalibratorState } from "@/hooks/useCalibratorState";
import { useAuth } from "@/lib/auth";
import { calibratorAdapter, type SimulationResultUI } from "@/adapters/backend/calibrator.adapter";
import { proposeSimCorrections, applySimCorrections, describeProposal, type SimProposal } from "@/lib/dna-sim-corrector";



const ICONS: Record<CalibProfile, typeof Sliders> = {
  conservador: ShieldCheck,
  rsi: Sliders,
  aiscore: Brain,
  agressivo: Zap,
  scalper: Zap,
  intraday: TrendingUp,
  swing: Activity,
  position: Mountain,
};

const ORDER: CalibProfile[] = ["conservador", "rsi", "aiscore", "agressivo", "scalper", "intraday", "swing", "position"];

export function TabCalibrador() {
  // Ponte com o backend (BCE): sincroniza perfil ativo quando o Calibrador emite estado.
  const { user } = useAuth();
  const setProfile = useBot4xStore((s) => s.setProfile);
  const { data: calibrator } = useCalibratorState(user?.id);

  useEffect(() => {
    if (calibrator?.profile && calibrator.profile !== useBot4xStore.getState().profile) {
      setProfile(calibrator.profile);
    }
  }, [calibrator?.profile, setProfile]);

  return (
    <div className="space-y-5">
      <SectionHeader />
      <ProfileGrid />
      <ImpactSummary />
      <LeverageMatrix />
      <PromptInjection />
    </div>
  );
}


// ----- Header -----
function SectionHeader() {
  const active = useBot4xStore((s) => s.profile);
  const p = PROFILES[active];
  return (
    <section className="flex items-start justify-between gap-4 flex-wrap">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-md bg-secondary flex items-center justify-center shrink-0">
          <Sliders className="size-5 text-foreground" />
        </div>
        <div>
          <h2 className="text-[18px] font-semibold text-foreground leading-tight">
            Calibrador de Perfil Operacional
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            Define o comportamento dos Filtros 5 e 6 do motor de execução
          </p>
        </div>
      </div>
      <motion.div
        key={active}
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="inline-flex items-center gap-2 h-9 px-3 rounded-md border"
        style={{
          background: `color-mix(in oklab, ${p.color} 16%, transparent)`,
          borderColor: p.color,
        }}
      >
        <span className="size-2 rounded-full" style={{ background: p.color }} />
        <span className="text-[12px] font-semibold text-foreground">{p.name}</span>
        <span className="text-[11px] text-muted-foreground">— {p.riskLabel}</span>
      </motion.div>
    </section>
  );
}

// ----- Profile cards -----
function ProfileGrid() {
  const [simId, setSimId] = useState<CalibProfile | null>(null);
  return (
    <>
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ORDER.map((id) => (
          <ProfileCard key={id} p={PROFILES[id]} onOpenSim={() => setSimId(id)} />
        ))}
      </section>
      <AnimatePresence>
        {simId && <SimulationModal profile={PROFILES[simId]} onClose={() => setSimId(null)} />}
      </AnimatePresence>
    </>
  );
}

function ProfileCard({ p, onOpenSim }: { p: ProfileSpec; onOpenSim: () => void }) {
  const active = useBot4xStore((s) => s.profile);
  const set = useBot4xStore((s) => s.setProfile);
  const isActive = active === p.id;
  const Icon = ICONS[p.id];

  const handleActivate = () => {
    if (isActive) return;
    set(p.id);
    toast.success(`Perfil ${p.name} ativado`, {
      description: p.riskLabel,
      duration: 3000,
    });
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{
        opacity: 1,
        y: 0,
        borderColor: isActive ? p.color : "var(--border)",
        boxShadow: isActive
          ? `0 0 0 1px ${p.color}, 0 10px 32px -14px color-mix(in oklab, ${p.color} 50%, transparent)`
          : "0 0 0 0 transparent, 0 0 0 0 transparent",
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-lg bg-card border overflow-hidden"
      style={{ borderLeft: `3px solid ${p.color}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="size-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in oklab, ${p.color} 22%, transparent)` }}
            >
              <Icon className="size-4" style={{ color: p.color }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[14px] font-semibold text-foreground">{p.name}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: `color-mix(in oklab, ${p.color} 22%, transparent)`, color: p.color }}
                >
                  {p.riskLabel}
                </span>
              </div>
              <p className="text-[11.5px] text-muted-foreground mt-1 leading-snug">{p.desc}</p>
            </div>
          </div>
          <RiskMeter rank={p.riskRank} color={p.color} />
        </div>

        <div className="mt-3 rounded-md bg-background border border-border px-3 py-2 font-mono text-[11px] text-foreground/85 space-y-0.5">
          <div>RSI threshold:  &lt; {p.rsiBuy} / &gt; {p.rsiSell}</div>
          <div>aiScore mín.:   ≥ {p.aiScore}</div>
          <div>FOMO limite:    ≤ {p.fomo}%</div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          <Mini label="Win rate" value={`~${p.wr}%`} color={p.color} />
          <Mini label="Bloqueios" value={`~${p.blockings30d}/30d`} />
          <Mini label="Trades" value={`~${p.trades30d}/30d`} />
        </div>

        {p.warning && (
          <div
            className="mt-3 rounded-md px-3 py-2 text-[11px] border"
            style={{
              background: `color-mix(in oklab, ${p.warning.level === "amber" ? "#EF9F27" : "#E24B4A"} 14%, transparent)`,
              borderColor: `color-mix(in oklab, ${p.warning.level === "amber" ? "#EF9F27" : "#E24B4A"} 55%, transparent)`,
              color: p.warning.level === "amber" ? "#F2C46B" : "#FF9B9A",
            }}
          >
            {p.warning.text}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleActivate}
          className={`mt-3 w-full h-9 rounded-md text-[13px] font-semibold transition-colors duration-300 ${
            isActive ? "text-white" : "bg-secondary text-foreground hover:bg-secondary/70"
          }`}
          style={isActive ? { background: p.color } : undefined}
        >
          {isActive ? "✓ Perfil Ativo" : `Ativar ${p.name}`}
        </motion.button>

        <button
          onClick={onOpenSim}
          className="mt-2 w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors group"
        >
          Ver simulação 30 dias
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}

// ----- Simulation modal -----
function SimulationModal({ profile, onClose }: { profile: ProfileSpec; onClose: () => void }) {
  const Icon = ICONS[profile.id];
  const { user } = useAuth();
  const leverage = useBot4xStore((s) => s.leverage);
  const [sim, setSim] = useState<SimulationResultUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setErr(null);
    setSim(null);
    calibratorAdapter
      .simulate(user?.id ?? "local", {
        profile: profile.id,
        symbol: "BTCUSDT",
        period_days: 30,
        initial_balance: 1000,
        leverage,
      })
      .then((res) => {
        if (cancel) return;
        setSim(res);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancel) return;
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [profile.id, user?.id, leverage]);

  // Derive series from real backtest equity curve; fallback to flat 1000 while loading
  const series = useMemo(() => {
    if (sim?.equityCurve?.length) return sim.equityCurve.map((p) => p.equity);
    return [1000];
  }, [sim]);

  const final = series[series.length - 1];
  const pnlPct = sim?.pnlPct ?? ((final - 1000) / 1000) * 100;
  const maxDD = sim?.maxDrawdown ?? 0;
  const totalTrades = sim?.trades ?? profile.trades30d;
  const winRate = sim ? sim.winRate * 100 : profile.wr;

  const W = 560,
    H = 160;
  const min = Math.min(...series, 1000);
  const max = Math.max(...series, 1000);
  const range = max - min || 1;
  const step = series.length > 1 ? W / (series.length - 1) : W;
  const norm = (v: number) => H - ((v - min) / range) * H;
  const d = series
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${norm(v).toFixed(1)}`)
    .join(" ");
  const area = series.length > 1 ? `${d} L${W},${H} L0,${H} Z` : "";

  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/70 z-[70]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="fixed inset-0 z-[71] flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      >
        <div className="w-full max-w-2xl rounded-xl bg-[#111318] border border-border shadow-2xl overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-start gap-3">
            <div
              className="size-9 rounded-md flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in oklab, ${profile.color} 22%, transparent)` }}
            >
              <Icon className="size-5" style={{ color: profile.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-foreground">
                Simulação 30 dias — {profile.name}
              </h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                BTCUSDT · Capital 1.000 USDT · Leverage {leverage}x · estratégia real (backtest)
              </p>
            </div>
            <button onClick={onClose} className="size-7 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="p-5 space-y-4 min-h-[280px]">
            {loading && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="size-6 animate-spin" style={{ color: profile.color }} />
                <span className="text-[12px]">Executando backtest real sobre candles BTCUSDT…</span>
              </div>
            )}
            {!loading && err && (
              <div className="rounded-md border border-[#E24B4A55] bg-[#E24B4A14] px-3 py-2 text-[12px] text-[#FF9B9A]">
                Falha ao executar backtest: {err}
              </div>
            )}
            {!loading && !err && sim && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <SimStat
                    label="Resultado"
                    value={`${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
                    color={pnlPct >= 0 ? "#1D9E75" : "#E24B4A"}
                  />
                  <SimStat label="Capital final" value={`${final.toFixed(0)} USDT`} />
                  <SimStat label="Max drawdown" value={`${maxDD.toFixed(2)}%`} color="#E24B4A" />
                  <SimStat label="Trades" value={`${totalTrades} · WR ${winRate.toFixed(0)}%`} />
                </div>
                <div className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
                      <TrendingUp className="size-3.5" /> Curva de equity (30d)
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      min {min.toFixed(0)} · max {max.toFixed(0)}
                    </span>
                  </div>
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id={`sim-${profile.id}`} x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={profile.color} stopOpacity="0.35" />
                        <stop offset="100%" stopColor={profile.color} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" x2={W} y1={norm(1000)} y2={norm(1000)} stroke="currentColor" strokeOpacity="0.15" strokeDasharray="3 3" />
                    {area && <path d={area} fill={`url(#sim-${profile.id})`} />}
                    <path d={d} fill="none" stroke={profile.color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {sim.commentary && (
                  <p className="text-[11px] text-muted-foreground">{sim.commentary}</p>
                )}
                <DnaCorrectionsPanel sim={sim} profileId={profile.id} color={profile.color} />
                <p className="text-[10.5px] text-muted-foreground/80">
                  Backtest executado sobre candles reais (Binance) com a estratégia do perfil <b style={{ color: profile.color }}>{profile.name}</b>. Resultados variam com slippage e condições de mercado.
                </p>
              </>
            )}

          </div>
        </div>
      </motion.div>
    </>
  );
}

function SimStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[14px] font-semibold tabular-nums mt-0.5" style={{ color: color ?? undefined }}>{value}</div>
    </div>
  );
}

function RiskMeter({ rank, color }: { rank: 1 | 2 | 3 | 4; color: string }) {
  return (
    <div className="flex gap-0.5 mt-1 shrink-0">
      {[1, 2, 3, 4].map((n) => (
        <div
          key={n}
          className="w-1.5 h-5 rounded-sm transition-colors"
          style={{ background: n <= rank ? color : "color-mix(in oklab, var(--border) 80%, transparent)" }}
        />
      ))}
    </div>
  );
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md bg-background border border-border px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[11.5px] font-semibold tabular-nums truncate" style={{ color: color ?? undefined }}>{value}</div>
    </div>
  );
}

// ----- Impact summary -----
function ImpactSummary() {
  const active = useBot4xStore((s) => s.profile);
  const cur = PROFILES[active];
  const base = PROFILES.conservador;
  const items = [
    {
      label: "Bloqueios estimados",
      value: `${cur.blockings30d}/30d`,
      delta: cur.blockings30d - base.blockings30d,
      // fewer blocks = "good" for volume, but we just show raw delta
      goodWhenNegative: true,
    },
    {
      label: "Trades liberados",
      value: `${cur.trades30d}/30d`,
      delta: cur.trades30d - base.trades30d,
      goodWhenNegative: false,
    },
    {
      label: "Win rate estimado",
      value: `${cur.wr}%`,
      delta: cur.wr - base.wr,
      goodWhenNegative: false,
    },
    {
      label: "Nível de risco",
      value: `${cur.riskRank}/4`,
      delta: cur.riskRank - base.riskRank,
      goodWhenNegative: true,
    },
  ];
  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((it) => {
        const positive = it.goodWhenNegative ? it.delta < 0 : it.delta > 0;
        const negative = it.goodWhenNegative ? it.delta > 0 : it.delta < 0;
        const color = it.delta === 0 ? "#888780" : positive ? "#1D9E75" : negative ? "#E24B4A" : "#888780";
        return (
          <motion.div
            key={it.label}
            layout
            className="rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.label}</div>
            <div className="text-[18px] font-semibold tabular-nums mt-1 text-foreground">{it.value}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              vs Conservador{" "}
              <span style={{ color }} className="font-semibold tabular-nums">
                {it.delta === 0 ? "=" : `${it.delta > 0 ? "+" : ""}${it.delta}`}
              </span>
            </div>
          </motion.div>
        );
      })}
    </section>
  );
}

// ----- Leverage matrix -----
function LeverageMatrix() {
  const activeLev = useBot4xStore((s) => s.leverage);
  const activeProfile = useBot4xStore((s) => s.profile);
  const profiles: ProfileSpec[] = Object.values(PROFILES);
  const cols = [1, 3, 6, 10];
  const sym = (s: "ok" | "warn" | "no") =>
    s === "ok" ? { ch: "✓", color: "#1D9E75" } : s === "warn" ? { ch: "⚠", color: "#EF9F27" } : { ch: "✗", color: "#E24B4A" };

  // Closest highlight column for current leverage
  const highlightCol = cols.reduce((a, b) => (Math.abs(b - activeLev) < Math.abs(a - activeLev) ? b : a));

  return (
    <section className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="text-[12px] font-semibold text-foreground">Compatibilidade perfil × alavancagem</div>
        <div className="text-[10px] text-muted-foreground">
          Coluna destacada: <span className="text-foreground font-semibold">{highlightCol}x</span> (lev atual)
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left font-medium px-4 py-2">Perfil</th>
              {cols.map((l) => (
                <th
                  key={l}
                  className="px-3 py-2 font-medium tabular-nums text-center"
                  style={l === highlightCol ? { background: "color-mix(in oklab, #378ADD 18%, transparent)", color: "#9CC6F0" } : undefined}
                >
                  1:{l}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const rowActive = p.id === activeProfile;
              return (
                <tr key={p.id} className="border-t border-border" style={rowActive ? { background: "color-mix(in oklab, var(--secondary) 50%, transparent)" } : undefined}>
                  <td className="px-4 py-2 text-foreground">
                    <span className="inline-flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: p.color }} />
                      <span className={rowActive ? "font-semibold" : ""}>{p.name}</span>
                    </span>
                  </td>
                  {cols.map((l) => {
                    const s = sym(p.levMatrix[l]);
                    return (
                      <td
                        key={l}
                        className="px-3 py-2 text-center text-[14px] font-semibold"
                        style={l === highlightCol ? { background: "color-mix(in oklab, #378ADD 10%, transparent)" } : undefined}
                      >
                        <span style={{ color: s.color }}>{s.ch}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ----- Prompt injection -----
function PromptInjection() {
  const active = useBot4xStore((s) => s.profile);
  const p = PROFILES[active];
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const block = `// Bot4x v2.0 — calibration block (profile: ${p.id})
PROFILE        = "${p.name}"
RISK_LABEL     = "${p.riskLabel}"
RSI_BUY_MAX    = ${p.rsiBuy}
RSI_SELL_MIN   = ${p.rsiSell}
AI_SCORE_MIN   = ${p.aiScore}
FOMO_MAX       = ${p.fomo}
RISK_RANK      = ${p.riskRank}/4
EXPECTED_WR    = ~${p.wr}%
BLOCKINGS_30D  = ~${p.blockings30d}
TRADES_30D     = ~${p.trades30d}

GUARDRAILS:
  - DEMO mode default; REAL requires operator confirmation
  - daily circuit breaker -1.5% (= 3 SLs)
  - trailing lock activates +4% peak, locks at +3%
  - max 3 concurrent slots; slot = activeCapital / 3`;

  const copy = async () => {
    try { await navigator.clipboard.writeText(block); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-[12px] font-medium text-foreground hover:bg-secondary/30 transition-colors"
      >
        <span>Mostrar bloco de injeção para o system prompt</span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border p-3">
              <div className="relative">
                <pre className="font-mono text-[11px] leading-relaxed text-foreground/85 bg-[#0A0B0E] border border-border rounded-md p-3 overflow-x-auto whitespace-pre-wrap">{block}</pre>
                <button
                  onClick={copy}
                  className="absolute top-2 right-2 inline-flex items-center gap-1 h-7 px-2 rounded-md bg-secondary text-foreground text-[11px] hover:bg-secondary/70 transition-colors"
                >
                  {copied ? <Check className="size-3.5 text-[#1D9E75]" /> : <Copy className="size-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ----- DNA suggested corrections (from simulation) -----
function DnaCorrectionsPanel({ sim, profileId, color }: { sim: SimulationResultUI; profileId: CalibProfile; color: string }) {
  // recompute when sim or store deps change
  const slPct = useBot4xStore((s) => s.slPct);
  const tpPct = useBot4xStore((s) => s.tpPct);
  const leverage = useBot4xStore((s) => s.leverage);
  const allocationPct = useBot4xStore((s) => s.allocationPct);
  const activeProfile = useBot4xStore((s) => s.profile);
  const proposals = useMemo<SimProposal[]>(
    () => proposeSimCorrections(sim, profileId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim, profileId, slPct, tpPct, leverage, allocationPct, activeProfile],
  );

  if (proposals.length === 0) {
    return (
      <div className="rounded-md border border-border bg-background px-3 py-2 text-[11.5px] text-muted-foreground inline-flex items-center gap-2">
        <Check className="size-3.5 text-[#1D9E75]" />
        DNA: estratégia já está alinhada com este resultado — sem correções sugeridas.
      </div>
    );
  }

  return (
    <div
      className="rounded-md border p-3 space-y-2"
      style={{
        borderColor: `color-mix(in oklab, ${color} 45%, transparent)`,
        background: `color-mix(in oklab, ${color} 10%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[12px] font-semibold inline-flex items-center gap-1.5" style={{ color }}>
          <Brain className="size-3.5" />
          DNA · correções sugeridas ({proposals.length})
        </div>
        <button
          onClick={() => applySimCorrections(proposals)}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: color }}
        >
          <Wand2 className="size-3.5" />
          Aplicar correções
        </button>
      </div>
      <ul className="space-y-1.5">
        {proposals.map((p, i) => (
          <li key={i} className="text-[11.5px] text-foreground/90 flex items-start gap-2">
            <ArrowRight className="size-3.5 mt-0.5 shrink-0" style={{ color }} />
            <span>
              <span className="font-semibold">{describeProposal(p)}</span>
              <span className="text-muted-foreground"> — {p.reason}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

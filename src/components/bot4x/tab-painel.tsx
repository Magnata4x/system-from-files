import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, Shield, ShieldAlert, Zap, Lock } from "lucide-react";
import { useBot4xStore, selectActiveCapital, selectSlotSize, MAX_SLOTS, RISK_PER_SLOT } from "@/lib/bot4x-store";
import { leverageRisk, slTpFromLeverage, fmt } from "@/lib/bot4x-data";
import { useLivePrices } from "@/hooks/useLivePrices";

const IS_DEV = import.meta.env.DEV;

// Feature flag — keep false until backend Fase 1 is live.
// To enable: set VITE_BOT4X_REAL_ENABLED=true in .env and redeploy.
const REAL_MODE_ENABLED = import.meta.env.VITE_BOT4X_REAL_ENABLED === "true";

export function TabPainel() {
  return (
    <div className="space-y-5">
      <ExecutionMode />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CapitalConfig />
        <AllocationConfig />
      </div>
      <LeverageSelector />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CircuitBreakerLoss />
        <CircuitBreakerProfit />
      </div>
      <OrderGrid />
      <TodayPnlRow />
    </div>
  );
}

// ----- Execution mode -----
function ExecutionMode() {
  const mode = useBot4xStore((s) => s.mode);
  const setMode = useBot4xStore((s) => s.setMode);
  const [confirm, setConfirm] = useState(false);
  const [text, setText] = useState("");

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Modo de execução</div>
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setMode("DEMO")}
          className={`relative rounded-lg px-4 py-3 text-left transition-all ${
            mode === "DEMO"
              ? "bg-[color-mix(in_oklab,#1D9E75_22%,transparent)] border border-[#1D9E75]"
              : "bg-background border border-border hover:border-[#1D9E7555]"
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="size-4 text-[#1D9E75]" />
            <span className="text-[14px] font-semibold text-foreground">DEMO MODE</span>
            {mode === "DEMO" && <span className="ml-auto text-[10px] font-bold text-[#1D9E75]">● ATIVO</span>}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Simulação. Nenhuma ordem real é enviada.</p>
        </button>

        <button
          onClick={() => REAL_MODE_ENABLED && setConfirm(true)}
          disabled={!REAL_MODE_ENABLED}
          className={`relative rounded-lg px-4 py-3 text-left transition-all ${
            !REAL_MODE_ENABLED
              ? "opacity-50 cursor-not-allowed border border-[#E24B4A33] bg-transparent"
              : mode === "REAL"
              ? "bg-[color-mix(in_oklab,#E24B4A_22%,transparent)] border border-[#E24B4A]"
              : "bg-transparent border border-[#E24B4A55] hover:border-[#E24B4A]"
          }`}
        >
          <div className="flex items-center gap-2">
            {REAL_MODE_ENABLED
              ? <ShieldAlert className="size-4 text-[#E24B4A]" />
              : <Lock className="size-4 text-[#E24B4A66]" />
            }
            <span className={`text-[14px] font-semibold ${REAL_MODE_ENABLED ? "text-[#E24B4A]" : "text-[#E24B4A66]"}`}>
              REAL MODE
            </span>
            {mode === "REAL" && REAL_MODE_ENABLED && (
              <span className="ml-auto text-[10px] font-bold text-[#E24B4A]">● ATIVO</span>
            )}
            {!REAL_MODE_ENABLED && (
              <span className="ml-auto text-[9px] font-semibold text-[#E24B4A55] uppercase tracking-wide">
                Em breve
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {REAL_MODE_ENABLED
              ? "Ordens reais na exchange. Requer confirmação."
              : "Requer integração com exchange — disponível em breve."}
          </p>
        </button>
      </div>

      <AnimatePresence>
        {confirm && REAL_MODE_ENABLED && (
          <RealModeModal
            text={text}
            setText={setText}
            onCancel={() => { setConfirm(false); setText(""); }}
            onConfirm={() => { setMode("REAL"); setConfirm(false); setText(""); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function RealModeModal({ text, setText, onCancel, onConfirm }: {
  text: string; setText: (s: string) => void; onCancel: () => void; onConfirm: () => void;
}) {
  const ok = text.trim().toUpperCase() === "ATIVAR REAL";
  return (
    <>
      <motion.div
        className="fixed inset-0 bg-black/70 z-[70]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onCancel}
      />
      <motion.div
        className="fixed inset-0 z-[71] flex items-center justify-center p-4"
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
      >
        <div className="w-full max-w-md rounded-xl bg-[#111318] border border-[#E24B4A] shadow-2xl">
          <div className="px-5 pt-4 pb-3 border-b border-border flex items-start gap-3">
            <div className="size-9 rounded-md bg-[color-mix(in_oklab,#E24B4A_22%,transparent)] flex items-center justify-center shrink-0">
              <AlertTriangle className="size-5 text-[#E24B4A]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-foreground">Ativar REAL MODE</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Esta ação permite execução de ordens reais.</p>
            </div>
            <button onClick={onCancel} className="size-7 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground">
              <X className="size-4" />
            </button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="rounded-md bg-[color-mix(in_oklab,#E24B4A_14%,transparent)] border border-[#E24B4A55] p-3 text-[12px] text-[#FF9B9A] space-y-1.5">
              <div className="font-semibold">⚠️ Aviso explícito</div>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Ordens serão enviadas à exchange com capital real.</li>
                <li>Stops e takes serão executados automaticamente.</li>
                <li>Circuit breakers reduzem mas não eliminam risco.</li>
                <li>Você é responsável por monitorar a operação.</li>
              </ul>
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Digite "ATIVAR REAL" para confirmar</label>
              <input
                autoFocus
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="mt-1 w-full h-9 px-3 rounded-md bg-background border border-border text-[13px] text-foreground focus:outline-none focus:border-[#E24B4A]"
                placeholder="ATIVAR REAL"
              />
            </div>
          </div>
          <div className="px-5 pb-4 flex gap-2 justify-end">
            <button onClick={onCancel} className="h-9 px-4 rounded-md text-[13px] font-medium bg-secondary text-foreground hover:bg-secondary/70">
              Cancelar
            </button>
            <button
              disabled={!ok}
              onClick={onConfirm}
              className="h-9 px-4 rounded-md text-[13px] font-semibold bg-[#E24B4A] text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#c63b3a]"
            >
              Ativar REAL MODE
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
}

// ----- Capital -----
function CapitalConfig() {
  const total = useBot4xStore((s) => s.totalCapital);
  const setTotal = useBot4xStore((s) => s.setTotalCapital);
  const active = useBot4xStore(selectActiveCapital);
  const slot = useBot4xStore(selectSlotSize);
  const { prices } = useLivePrices();
  const btcPrice = prices.BTC?.price ?? 0;
  const btcEq = btcPrice > 0 ? total / btcPrice : 0;

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Capital total disponível</div>
      <div className="relative">
        <input
          type="number"
          value={total}
          onChange={(e) => setTotal(Number(e.target.value))}
          className="w-full h-10 px-3 pr-16 rounded-md bg-background border border-border text-[16px] font-semibold tabular-nums text-foreground focus:outline-none focus:border-[var(--brand-cyan)]"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground">USDT</span>
      </div>
      <div className="mt-3 text-[12px] text-muted-foreground tabular-nums">
        activeCapital = <span className="text-foreground font-semibold">{fmt(active)} USDT</span>
        {" · "}Slot size: <span className="text-foreground font-semibold">{fmt(slot)} USDT</span> (÷3)
      </div>
      {btcPrice > 0 && (
        <div className="mt-2 text-[11px] text-muted-foreground tabular-nums">
          BTC @ <span className="text-foreground font-medium">${fmt(btcPrice)}</span>
          {" → "}Equivalente: <span className="text-foreground font-medium">{btcEq.toFixed(4)} BTC</span>
        </div>
      )}
    </section>
  );
}

function AllocationConfig() {
  const pct = useBot4xStore((s) => s.allocationPct);
  const setPct = useBot4xStore((s) => s.setAllocationPct);
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Allocation %</span>
        <span className="text-[16px] font-semibold tabular-nums text-foreground">{pct}%</span>
      </div>
      <input
        type="range" min={1} max={100} value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        className="w-full accent-[var(--brand-cyan)]"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
        <span>1%</span><span>50%</span><span>100%</span>
      </div>
    </section>
  );
}

// ----- Leverage -----
function LeverageSelector() {
  const lev = useBot4xStore((s) => s.leverage);
  const setLev = useBot4xStore((s) => s.setLeverage);
  const risk = leverageRisk(lev);
  const sltp = slTpFromLeverage(lev);
  const pulse = risk.tier === "high";

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Leverage</span>
        <span className="text-[16px] font-semibold tabular-nums text-foreground">{lev}x</span>
      </div>
      <div className="grid grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const r = leverageRisk(n);
          const active = n === lev;
          return (
            <motion.button
              key={n}
              onClick={() => setLev(n)}
              whileTap={{ scale: 0.88 }}
              animate={{ scale: active ? 1.06 : 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className={`h-10 rounded-md text-[13px] font-semibold tabular-nums transition-[background,border-color,color,box-shadow] duration-300 ease-out ${
                active ? "text-white" : "bg-background border border-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
              style={active ? { background: r.color, borderColor: r.color, boxShadow: `0 0 0 1px ${r.color}, 0 4px 14px -2px ${r.color}66` } : undefined}
            >
              {n}
            </motion.button>
          );
        })}
      </div>

      <motion.div
        key={lev}
        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
        className={`mt-4 rounded-md p-3 border ${pulse ? "animate-pulse" : ""}`}
        style={{
          background: `color-mix(in oklab, ${risk.color} 16%, transparent)`,
          borderColor: risk.color,
        }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[12px] font-bold tracking-wide" style={{ color: risk.color }}>{risk.label}</span>
          <div className="text-[11px] tabular-nums text-foreground/85">
            SL: <span className="font-semibold" style={{ color: "#E24B4A" }}>{sltp.sl}%</span>
            {" · "}TP: <span className="font-semibold" style={{ color: "#1D9E75" }}>{sltp.tp}%</span>
          </div>
        </div>
        <p className="text-[12px] text-foreground/80 mt-1.5">{risk.diagnosis}</p>
      </motion.div>
    </section>
  );
}

// ----- Circuit Breakers -----
function CircuitBreakerLoss() {
  const pnl = useBot4xStore((s) => s.dailyPnlPct);
  const limit = -1.5;
  const triggered = pnl <= limit;
  const fillPct = Math.min(100, Math.abs(pnl / limit) * 100);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[12px] font-semibold text-foreground">Circuit Breaker · Perda</div>
          <div className="text-[10px] text-muted-foreground">Limite diário: -1.5% (≈ 3 SLs)</div>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
          triggered
            ? "bg-[color-mix(in_oklab,#E24B4A_25%,transparent)] text-[#FF9B9A] border border-[#E24B4A]"
            : "bg-[color-mix(in_oklab,#1D9E75_22%,transparent)] text-[#7AD9B4] border border-[#1D9E75]"
        }`}>
          {triggered ? "TRIGGERED" : "ARMED"}
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">dailyPnL</span>
        <span className="text-[16px] font-semibold tabular-nums" style={{ color: pnl < 0 ? "#E24B4A" : "#1D9E75" }}>
          {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
        </span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.6 }}
          className="h-full" style={{ background: "#E24B4A" }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5">Equivale a 3 stop-losses consecutivos.</div>
      {IS_DEV && (
        <button
          onClick={() => useBot4xStore.setState({ dailyPnlPct: triggered ? -0.42 : -1.6 })}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[#FF9B9A] hover:text-white border border-[#E24B4A55] hover:border-[#E24B4A] rounded px-2 py-1 transition-colors"
        >
          <Zap className="size-3" /> {triggered ? "Resetar" : "Simular acionamento"} <span className="opacity-50">· dev</span>
        </button>
      )}
    </section>
  );
}

function CircuitBreakerProfit() {
  const peak = useBot4xStore((s) => s.trailingPeakPct);
  const activateAt = 4;
  const lockAt = 3;
  let state: "INACTIVE" | "ACTIVE" | "LOCKED" = "INACTIVE";
  if (peak >= activateAt) state = "ACTIVE";
  if (peak >= activateAt && peak - 1 >= lockAt) state = "LOCKED";
  const fill = Math.min(100, (peak / activateAt) * 100);
  const stateMap = {
    INACTIVE: { color: "#888780", bg: "color-mix(in oklab,#888780 18%,transparent)" },
    ACTIVE: { color: "#1D9E75", bg: "color-mix(in oklab,#1D9E75 22%,transparent)" },
    LOCKED: { color: "#7F77DD", bg: "color-mix(in oklab,#7F77DD 22%,transparent)" },
  } as const;
  const cur = stateMap[state];

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[12px] font-semibold text-foreground">Trailing Lock · Lucro</div>
          <div className="text-[10px] text-muted-foreground">Ativa em +4% · trava em +3%</div>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: cur.bg, color: cur.color, borderColor: cur.color }}>
          {state}
        </span>
      </div>
      <div className="flex items-baseline justify-between mt-2">
        <span className="text-[11px] text-muted-foreground">Peak hoje</span>
        <span className="text-[16px] font-semibold tabular-nums text-[#1D9E75]">+{peak.toFixed(2)}%</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden">
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${fill}%` }}
          transition={{ duration: 0.6 }}
          className="h-full" style={{ background: "#1D9E75" }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5">
        {state === "LOCKED" ? "Lucro travado — bot encerra ao tocar +3%." : "Sem lock ativo."}
      </div>
      {IS_DEV && (
        <button
          onClick={() => useBot4xStore.setState({ trailingPeakPct: state !== "INACTIVE" ? 0 : 4.2 })}
          className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-[#7AD9B4] hover:text-white border border-[#1D9E7555] hover:border-[#1D9E75] rounded px-2 py-1 transition-colors"
        >
          <Zap className="size-3" /> {state !== "INACTIVE" ? "Resetar" : "Simular acionamento"} <span className="opacity-50">· dev</span>
        </button>
      )}
    </section>
  );
}

// ----- Orders -----
function OrderGrid() {
  const orders = useBot4xStore((s) => s.orders);
  const close = useBot4xStore((s) => s.closeOrder);
  const slot = useBot4xStore(selectSlotSize);
  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => i);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Ordens ativas</span>
        <span className="text-[11px] text-muted-foreground tabular-nums">{MAX_SLOTS} slots · {fmt(slot)} USDT cada</span>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10px]">
        <span className="rounded-md border border-border bg-background/50 px-2 py-1 tabular-nums text-muted-foreground">
          Máx. simultâneas: <span className="text-foreground font-semibold">{MAX_SLOTS}</span>
        </span>
        <span className="rounded-md border border-border bg-background/50 px-2 py-1 tabular-nums text-muted-foreground">
          Risco por slot: <span className="text-foreground font-semibold">{(RISK_PER_SLOT * 100).toFixed(0)}%</span> do capital ativo
        </span>
        <span className="rounded-md border border-border bg-background/50 px-2 py-1 tabular-nums text-muted-foreground">
          Exposição máx.: <span className="text-foreground font-semibold">{(MAX_SLOTS * RISK_PER_SLOT * 100).toFixed(0)}%</span>
        </span>
      </div>
      <p className="mb-3 text-[10px] leading-snug text-muted-foreground/80 italic">
        Simulação para fins educacionais. Não constitui recomendação financeira, de investimento ou de trading. Opere por sua conta e risco.
      </p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {slots.map((i) => {
          const o = orders[i];
          if (!o) {
            return (
              <div key={i} className="h-28 rounded-md border border-dashed border-border flex items-center justify-center text-[11px] text-muted-foreground">
                Slot livre
              </div>
            );
          }
          const sideColor = o.side === "LONG" ? "#1D9E75" : "#E24B4A";
          const pnlColor = o.pnlPct >= 0 ? "#1D9E75" : "#E24B4A";
          const min = Math.floor((Date.now() - o.openedAt) / 60000);
          return (
            <div key={o.id} className="h-28 rounded-md border border-border bg-background p-2 relative">
              <button
                onClick={() => close(o.id)}
                className="absolute top-2 right-2 size-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground"
              >
                <X className="size-3.5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-foreground">{o.pair}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: `color-mix(in oklab, ${sideColor} 22%, transparent)`, color: sideColor }}>
                  {o.side}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] tabular-nums">
                <div><div className="text-muted-foreground">Entry</div><div className="text-foreground font-semibold">{fmt(o.entry)}</div></div>
                <div><div className="text-muted-foreground">SL</div><div className="text-[#E24B4A]">{fmt(o.sl)}</div></div>
                <div><div className="text-muted-foreground">TP</div><div className="text-[#1D9E75]">{fmt(o.tp)}</div></div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">{min}m</span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: pnlColor }}>
                  {o.pnlPct >= 0 ? "+" : ""}{o.pnlPct.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ----- Today PnL row -----
function TodayPnlRow() {
  const pnl = useBot4xStore((s) => s.dailyPnlPct);
  const color = pnl >= 0 ? "#1D9E75" : "#E24B4A";

  // Mock last-2h equity series (24 pts ≈ 5min ticks) walking toward current pnl
  const points = useMemo(() => {
    const N = 24;
    const out: number[] = [];
    let v = 0;
    const target = pnl;
    for (let i = 0; i < N; i++) {
      const drift = (target - v) * 0.08;
      const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 0.04;
      v = v + drift + noise;
      out.push(+v.toFixed(3));
    }
    out[N - 1] = pnl;
    return out;
  }, [pnl]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="rounded-lg border border-border bg-card px-4 py-3 relative overflow-hidden">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Daily PnL</div>
            <div className="text-[16px] font-semibold tabular-nums mt-1" style={{ color }}>
              {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
            </div>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">2h</span>
        </div>
        <Sparkline points={points} color={color} />
      </div>
      <Stat label="Trades (W/L)" value="7 / 4" />
      <Stat label="Win rate" value="63.6%" color="#1D9E75" />
      <Stat label="Capital at risk" value="120 USDT" />
    </section>
  );
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  const W = 120, H = 28;
  const min = Math.min(...points, 0);
  const max = Math.max(...points, 0);
  const range = max - min || 1;
  const step = W / (points.length - 1);
  const norm = (v: number) => H - ((v - min) / range) * H;
  const d = points.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${norm(v).toFixed(1)}`).join(" ");
  const area = `${d} L${W},${H} L0,${H} Z`;
  const zeroY = norm(0);
  const gid = `spark-${color.replace("#", "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-1.5 w-full h-7" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={zeroY} y2={zeroY} stroke="currentColor" strokeOpacity="0.18" strokeDasharray="2 2" />
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={norm(points[points.length - 1])} r="1.8" fill={color} />
    </svg>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-[16px] font-semibold tabular-nums mt-1" style={{ color: color ?? undefined }}>{value}</div>
    </div>
  );
}

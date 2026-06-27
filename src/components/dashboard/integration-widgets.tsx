import { Link } from "@tanstack/react-router";
import { Brain, Shield, Cpu, Sparkles, ArrowRight, AlertTriangle, Activity } from "lucide-react";
import { useBot4xStore } from "@/lib/bot4x-store";
import { dna } from "@/lib/dashboard-data";

const PROFILE_LABEL: Record<string, string> = {
  conservador: "Conservador",
  regular: "Regular",
  agressivo: "Agressivo",
  "agressivo-galaxy": "Galaxy",
};

function Card({
  title, icon: Icon, accent, to, ctaLabel = "Ver mais", children,
}: {
  title: string;
  icon: typeof Brain;
  accent: string;
  to: string;
  ctaLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 flex flex-col gap-3 hover:border-[var(--brand-cyan)]/40 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="size-7 rounded-md flex items-center justify-center"
            style={{ background: `color-mix(in oklab, ${accent} 18%, transparent)`, color: accent }}
          >
            <Icon className="size-4" />
          </div>
          <h3 className="text-[13px] font-medium text-foreground">{title}</h3>
        </div>
        <Link to={to} className="text-[11px] text-[var(--brand-cyan)] hover:underline inline-flex items-center gap-0.5">
          {ctaLabel} <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="flex-1 min-h-[68px]">{children}</div>
    </div>
  );
}

function ConsistencyRing({ value, color }: { value: number; color: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
      <circle cx="28" cy="28" r={r} stroke="hsl(var(--border))" strokeWidth="4" fill="none" />
      <circle
        cx="28" cy="28" r={r}
        stroke={color} strokeWidth="4" strokeLinecap="round" fill="none"
        strokeDasharray={c} strokeDashoffset={offset}
        transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--foreground))">{value}</text>
    </svg>
  );
}

export function DnaTraderWidget() {
  return (
    <Card title="DNA Trader" icon={Brain} accent="#378ADD" to="/dna-trader" ctaLabel="Full report">
      <div className="flex items-center gap-3">
        <ConsistencyRing value={dna.consistency} color="#378ADD" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Archetype</div>
          <div className="text-[13px] font-medium text-foreground truncate">Strategic Sniper</div>
          <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded border border-[#378ADD]/40 bg-[#378ADD]/10 text-[#5fa8ff]">
            Win {dna.winRate}%
          </span>
        </div>
      </div>
    </Card>
  );
}

const SAMPLE_MANIP_ALERTS = [
  { severity: "critical", title: "Spoofing detectado em BTC/USDT @ Binance" },
  { severity: "warn", title: "Wash trading suspeito em SOL/USDT" },
  { severity: "warn", title: "Wall artificial em ETH/USDT" },
];

export function ManipulationWidget() {
  const active = SAMPLE_MANIP_ALERTS;
  const count = active.length;
  const last = active[0];

  return (
    <Card title="Manipulation" icon={Shield} accent="#E24B4A" to="/manipulation" ctaLabel="View all">
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div
            className="size-12 rounded-lg flex items-center justify-center text-base font-semibold tabular-nums"
            style={{
              background: count > 0 ? "color-mix(in oklab, #E24B4A 16%, transparent)" : "color-mix(in oklab, #1D9E75 14%, transparent)",
              color: count > 0 ? "#E24B4A" : "#1D9E75",
            }}
          >
            {count}
          </div>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-[#E24B4A] animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Active alerts (24h)</div>
          <div className="text-[12px] text-foreground line-clamp-2">
            {last ? <><AlertTriangle className="size-3 inline mr-1 text-[#EF9F27]" />{last.title}</> : "Sem alertas críticos no momento."}
          </div>
        </div>
      </div>
    </Card>
  );
}

export function SentimentWidget() {
  const score = 68;
  const top = [
    { asset: "BTC", score: 74 },
    { asset: "ETH", score: 66 },
    { asset: "SOL", score: 59 },
  ];
  return (
    <Card title="Sentiment" icon={Sparkles} accent="#7F77DD" to="/sentiment" ctaLabel="Full report">
      <div className="flex items-center gap-3">
        <div className="shrink-0 relative size-12 rounded-full flex items-center justify-center"
          style={{ background: `conic-gradient(#1D9E75 0 ${score * 3.6}deg, hsl(var(--border)) ${score * 3.6}deg 360deg)` }}
        >
          <div className="size-9 rounded-full bg-card flex items-center justify-center text-[12px] font-semibold tabular-nums">{score}</div>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          {top.map((t) => (
            <div key={t.asset} className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground w-8">{t.asset}</span>
              <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                <div className="h-full bg-[#7F77DD]" style={{ width: `${t.score}%` }} />
              </div>
              <span className="text-foreground tabular-nums w-6 text-right">{t.score}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function Bot4xSummaryWidget() {
  const mode = useBot4xStore((s) => s.mode);
  const profile = useBot4xStore((s) => s.profile);
  const leverage = useBot4xStore((s) => s.leverage);
  const pnl = useBot4xStore((s) => s.dailyPnlPct);
  const breaker = pnl <= -1.5;
  const pnlColor = breaker ? "#E24B4A" : pnl >= 0 ? "#1D9E75" : "#EF9F27";

  return (
    <Card title="Bot4x" icon={Cpu} accent="#1D9E75" to="/bot4x" ctaLabel="Open Bot4x">
      <div className="flex items-center gap-3">
        <div className="shrink-0 flex flex-col items-center gap-1">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
              mode === "REAL" ? "bg-[#E24B4A]/15 text-[#E24B4A] border border-[#E24B4A]/30" : "bg-[#378ADD]/15 text-[#5fa8ff] border border-[#378ADD]/30"
            }`}
          >
            {mode}
          </span>
          <span className="text-[10px] text-muted-foreground">{leverage}×</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{PROFILE_LABEL[profile] ?? profile}</div>
          <div className="text-[18px] font-semibold tabular-nums leading-none mt-0.5" style={{ color: pnlColor }}>
            {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Activity className="size-3 text-muted-foreground" />
            <span className={`text-[10.5px] ${breaker ? "text-[#E24B4A] font-medium" : "text-muted-foreground"}`}>
              {breaker ? "Disjuntor ativo" : "Circuit OK"}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function IntegrationWidgets() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <DnaTraderWidget />
      <ManipulationWidget />
      <SentimentWidget />
      <Bot4xSummaryWidget />
    </div>
  );
}

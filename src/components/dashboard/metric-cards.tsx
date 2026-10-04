import { Activity, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { ScoreBadge } from "./score-badge";
import { useCountUp } from "@/lib/use-count-up";
import { useMarketData } from "@/lib/market-data-store";
import { useDashboardStore } from "@/lib/dashboard-store";
import { DataStatusBadge } from "./data-status";

export function MetricCards() {
  const { prices, global, loading, metadataStatus } = useMarketData();
  const signals = useDashboardStore((s) => s.signals);
  const signalsLoading = useDashboardStore((s) => s.signalsLoading);
  const manip = useDashboardStore((s) => s.manipAlerts);
  const total = Object.keys(prices).length;
  const up = Object.values(prices).filter((p) => p.change24h != null && p.change24h > 0).length;
  const trend = global?.marketCapChange24h;
  const trendLabel =
    trend == null ? "Indisponível" : trend >= 1 ? "Bullish" : trend <= -1 ? "Bearish" : "Neutral";
  const trendColor =
    trend == null
      ? "var(--muted-foreground)"
      : trend >= 1
        ? "#1D9E75"
        : trend <= -1
          ? "#E24B4A"
          : "#888780";
  const top = signals.reduce(
    (b, s) => (!b || s.score > b.score ? s : b),
    null as (typeof signals)[number] | null,
  );
  const high = signals.filter((s) => s.score >= 80).length;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        index={0}
        icon={<Activity className="size-4" />}
        color="#378ADD"
        label="Active Signals"
        count={signalsLoading ? undefined : signals.length}
        sub={signalsLoading ? "Carregando…" : high + " high score (≥80)"}
        source="Internal API"
        status={signalsLoading ? "loading" : "ok"}
      />
      <Card
        index={1}
        icon={<Trophy className="size-4" />}
        color="#EF9F27"
        label="Top Signal Score"
        node={
          top ? <ScoreBadge score={top.score} size="lg" /> : <span className="text-[28px]">—</span>
        }
        sub={top ? top.asset + " · " + top.direction + " · " + top.tf : "Indisponível"}
        source="Internal API"
        status={signalsLoading ? "loading" : "ok"}
      />
      <Card
        index={2}
        icon={<TrendingUp className="size-4" />}
        color={trendColor}
        label="Market Trend"
        value={loading && !global ? "…" : trendLabel}
        sub={total ? up + " de " + total + " ativos em alta" : "Indisponível"}
        source="CoinGecko global"
        status={!global ? (metadataStatus === "loading" ? "loading" : "unavailable") : metadataStatus}
        updatedAt={global?.updatedAt != null ? new Date(global.updatedAt) : null}
      />
      <Card
        index={3}
        icon={<AlertTriangle className="size-4" />}
        color="#E24B4A"
        label="Manipulation Alerts"
        count={manip.length}
        sub={
          manip.length
            ? [...new Set(manip.map((a) => a.asset.replace("/USDT", "")))].slice(0, 3).join(" · ")
            : "Nenhum alerta ativo"
        }
        source="Internal API"
        status={manip.length ? "ok" : "unavailable"}
      />
    </div>
  );
}
function Card(p: {
  index: number;
  icon: React.ReactNode;
  color: string;
  label: string;
  value?: string;
  node?: React.ReactNode;
  count?: number;
  sub: string;
  source: string;
  status: "loading" | "ok" | "stale" | "unavailable";
  updatedAt?: Date | null;
}) {
  const n = useCountUp(p.count ?? 0, 1200);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: p.index * 0.1 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <div
        className="size-8 rounded-lg flex items-center justify-center"
        style={{
          background: "color-mix(in oklab," + p.color + " 16%,transparent)",
          color: p.color,
        }}
      >
        {p.icon}
      </div>
      <div className="mt-3 text-[12px] text-muted-foreground">{p.label}</div>
      <div className="mt-1">
        {p.node ?? (
          <span className="text-[28px] font-semibold tabular-nums" style={{ color: p.color }}>
            {p.count !== undefined ? n : p.value}
          </span>
        )}
      </div>
      <div className="mt-2 text-[12px] text-muted-foreground">{p.sub}</div>
      <div className="mt-2">
        <DataStatusBadge source={p.source} updatedAt={p.updatedAt} status={p.status} />
      </div>
    </motion.div>
  );
}

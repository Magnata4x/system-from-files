import { Activity, Trophy, TrendingUp, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { ScoreBadge } from "./score-badge";
import { useCountUp } from "@/lib/use-count-up";
import { useLivePrices } from "@/hooks/useLivePrices";
import { useDashboardStore } from "@/lib/dashboard-store";

export function MetricCards() {
  const { prices, global, loading } = useLivePrices();
  const signals = useDashboardStore((s) => s.signals);
  const signalsLoading = useDashboardStore((s) => s.signalsLoading);
  const manipAlerts = useDashboardStore((s) => s.manipAlerts);

  const trendingUp = Object.values(prices).filter((p) => (p.change24h ?? 0) > 0).length;
  const totalTracked = Object.keys(prices).length || 20;

  // Métricas derivadas dos sinais reais servidos pelo backend interno.
  const activeSignals = signals.length;
  const highScore = signals.filter((s) => s.score >= 80).length;
  const top = signals.reduce<(typeof signals)[number] | null>(
    (best, s) => (!best || s.score > best.score ? s : best),
    null,
  );

  const marketTrend = global?.marketCapChange24h ?? 0;
  const trendLabel = marketTrend >= 1 ? "Bullish" : marketTrend <= -1 ? "Bearish" : "Neutral";
  const trendColor = marketTrend >= 1 ? "#1D9E75" : marketTrend <= -1 ? "#E24B4A" : "#888780";

  const manipAssets = [...new Set(manipAlerts.map((a) => a.asset.replace("/USDT", "")))].slice(0, 3);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div data-tour="metric-signals">
        <Card
          index={0}
          icon={<Activity className="size-4" />}
          iconColor="#378ADD"
          label="Active Signals"
          countTo={signalsLoading ? 0 : activeSignals}
          sub={`${highScore} high score (≥80)`}
        />
      </div>
      <Card
        index={1}
        icon={<Trophy className="size-4" />}
        iconColor="#EF9F27"
        label="Top Signal Score"
        valueNode={<ScoreBadge score={top?.score ?? 0} size="lg" />}
        sub={top ? `${top.asset} · ${top.direction} · ${top.tf}` : "Sem sinais no momento"}
      />
      <Card
        index={2}
        icon={<TrendingUp className="size-4" />}
        iconColor={trendColor}
        label="Market Trend"
        value={loading ? "…" : trendLabel}
        valueColor={trendColor}
        sub={`${trendingUp} of ${totalTracked} assets trending up`}
      />
      <Card
        index={3}
        icon={<AlertTriangle className="size-4" />}
        iconColor="#E24B4A"
        label="Manipulation Alerts"
        countTo={manipAlerts.length}
        valueColor="#E24B4A"
        sub={manipAssets.length > 0 ? manipAssets.join(" · ") : "Nenhum alerta ativo"}
        pulse={manipAlerts.length > 0}
      />
    </div>
  );
}


function Card({
  index, icon, iconColor, label, value, valueNode, valueColor, sub, trend, pulse, countTo,
}: {
  index: number;
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  valueColor?: string;
  sub: string;
  trend?: { text: string; color: string };
  pulse?: boolean;
  countTo?: number;
}) {
  const counted = useCountUp(countTo ?? 0, 1200);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: "easeOut" }}
      className="rounded-xl border border-border bg-card p-4 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div
          className="size-8 rounded-lg flex items-center justify-center"
          style={{
            background: `color-mix(in oklab, ${iconColor} 16%, transparent)`,
            color: iconColor,
          }}
        >
          {icon}
        </div>
        {pulse && <span className="size-2 rounded-full bg-[#E24B4A] animate-pulse" />}
      </div>
      <div className="mt-3 text-[12px] text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        {valueNode ?? (
          <span className="text-[28px] font-semibold tabular-nums" style={{ color: valueColor ?? "var(--foreground)" }}>
            {countTo !== undefined ? counted : value}
          </span>
        )}
      </div>
      <div className="mt-2 text-[12px] text-muted-foreground">{sub}</div>
      {trend && (
        <div className="mt-1 text-[12px] font-medium" style={{ color: trend.color }}>{trend.text}</div>
      )}
    </motion.div>
  );
}

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMarketData } from "@/lib/market-data-store";
import { buildFearGreedSeries, FEAR_GREED_ZONES, fearGreedColor } from "@/lib/fear-greed";
import { DataStatusBadge } from "./data-status";

const HISTORY_STALE_AFTER_MS = 48 * 60 * 60 * 1000;

function formatUtcDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

export function FearGreedGauge() {
  const { fearGreed, loading, metadataStatus } = useMarketData();
  const VALUE = fearGreed?.value;
  const LABEL = fearGreed?.label;
  const series = buildFearGreedSeries(fearGreed?.history);
  const latestHistoryAt = series.at(-1)?.timestamp ?? null;
  const historyStatus =
    series.length === 0
      ? "unavailable"
      : latestHistoryAt != null && Date.now() - latestHistoryAt > HISTORY_STALE_AFTER_MS
        ? "stale"
        : "ok";
  const dataStatus =
    loading && !fearGreed
      ? "loading"
      : !fearGreed
        ? "unavailable"
        : metadataStatus === "stale" || historyStatus === "stale"
          ? "stale"
          : "ok";
  const angle = VALUE == null ? 0 : (VALUE / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const cx = 110;
  const cy = 110;
  const r = 88;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  const zoneColor = fearGreedColor(VALUE);
  const source = series.length >= 2 ? `Alternative.me · ${series.length} dias` : "Alternative.me";
  const updatedAt = latestHistoryAt ?? fearGreed?.updatedAt ?? null;

  return (
    <div data-tour="fear-greed" className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-medium text-foreground">Fear &amp; Greed Index</h3>
        <DataStatusBadge source={source} updatedAt={updatedAt} status={dataStatus} />
      </div>
      <div className="relative flex-1 flex items-center justify-center mt-2">
        <svg viewBox="0 0 220 130" className="w-full max-w-[260px]">
          {FEAR_GREED_ZONES.map((z) => {
            const start = ((100 - z.to) / 100) * 180;
            const end = ((100 - z.from) / 100) * 180;
            return (
              <ArcSegment
                key={z.label}
                cx={cx}
                cy={cy}
                r={r}
                startAngle={start}
                endAngle={end}
                color={z.color}
              />
            );
          })}
          {VALUE != null && (
            <>
              <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#E6F1FB" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx={cx} cy={cy} r="6" fill="#0A0B0E" stroke="#E6F1FB" strokeWidth="2" />
            </>
          )}
        </svg>
        <div className="absolute bottom-2 flex flex-col items-center">
          <div className="text-[32px] font-semibold leading-none" style={{ color: zoneColor }}>
            {VALUE ?? "Indisponível"}
          </div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{LABEL ?? "Indisponível"}</div>
        </div>
      </div>

      {series.length >= 2 ? (
        <div
          className="mt-3 h-[110px]"
          role="img"
          aria-label={`Histórico de Fear & Greed, ${series.length} dias`}
        >
          <div className="text-[10px] text-muted-foreground mb-1">Histórico real</div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 8 }}
                tickFormatter={formatUtcDate}
                axisLine={false}
                tickLine={false}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={(value) => formatUtcDate(Number(value))}
                formatter={(value, _name, item) => [
                  typeof value === "number" ? value : "Indisponível",
                  item?.payload?.label ?? "Fear & Greed",
                ]}
              />
              <Line type="monotone" dataKey="value" dot={{ r: 2 }} strokeWidth={2} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-border bg-secondary/20 p-3 text-[11px] text-muted-foreground">
          Histórico indisponível; exibindo apenas a leitura atual.
        </div>
      )}
    </div>
  );
}

function ArcSegment({
  cx,
  cy,
  r,
  startAngle,
  endAngle,
  color,
}: {
  cx: number;
  cy: number;
  r: number;
  startAngle: number;
  endAngle: number;
  color: string;
}) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  return <path d={d} stroke={color} strokeWidth="14" fill="none" strokeLinecap="butt" opacity=".85" />;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

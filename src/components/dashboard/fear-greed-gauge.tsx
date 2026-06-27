import { fearGreed7d } from "@/lib/dashboard-data";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useLivePrices } from "@/hooks/useLivePrices";

const zones = [
  { label: "Extreme Fear", color: "#E24B4A", from: 0, to: 20 },
  { label: "Fear", color: "#EF9F27", from: 20, to: 40 },
  { label: "Neutral", color: "#888780", from: 40, to: 60 },
  { label: "Greed", color: "#1D9E75", from: 60, to: 80 },
  { label: "Extreme Greed", color: "#7F77DD", from: 80, to: 100 },
];

export function FearGreedGauge() {
  const { fearGreed, loading } = useLivePrices();
  const VALUE = fearGreed?.value ?? 68;
  const LABEL = fearGreed?.label ?? "Greed";

  // semicircle 180° → angle = (value/100)*180 from the left
  const angle = (VALUE / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const cx = 110, cy = 110, r = 88;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);

  const zoneColor = zones.find((z) => VALUE >= z.from && VALUE < z.to)?.color ?? "#1D9E75";

  return (
    <div data-tour="fear-greed" className="rounded-xl border border-border bg-card p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-medium text-foreground">Fear &amp; Greed Index</h3>
        <span className="text-[11px] text-muted-foreground">{loading ? "Loading…" : "Updated live"}</span>
      </div>
      <div className="relative flex-1 flex items-center justify-center mt-2">
        <svg viewBox="0 0 220 130" className="w-full max-w-[260px]">
          {zones.map((z) => {
            const start = ((100 - z.to) / 100) * 180;
            const end = ((100 - z.from) / 100) * 180;
            return <ArcSegment key={z.label} cx={cx} cy={cy} r={r} startAngle={start} endAngle={end} color={z.color} />;
          })}
          {/* Needle */}
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#E6F1FB" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill="#0A0B0E" stroke="#E6F1FB" strokeWidth="2" />
        </svg>
        <div className="absolute bottom-2 flex flex-col items-center">
          <div className="text-[32px] font-semibold leading-none" style={{ color: zoneColor }}>{VALUE}</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">{LABEL}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="text-[11px] text-muted-foreground mb-1">Last 7 days</div>
        <div className="h-12">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={fearGreed7d.map((v, i) => ({ i, v }))}>
              <Line type="monotone" dataKey="v" stroke="#378ADD" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ArcSegment({ cx, cy, r, startAngle, endAngle, color }: { cx: number; cy: number; r: number; startAngle: number; endAngle: number; color: string }) {
  const start = polar(cx, cy, r, startAngle);
  const end = polar(cx, cy, r, endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  const d = `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
  return <path d={d} stroke={color} strokeWidth="14" fill="none" strokeLinecap="butt" opacity="0.85" />;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

import { useEffect, useState } from "react";
import { MACRO } from "@/lib/sentiment-data";

const ZONES = [
  { label: "Extreme Fear", color: "#E24B4A", from: 0, to: 20 },
  { label: "Fear", color: "#EF9F27", from: 20, to: 40 },
  { label: "Neutral", color: "#888780", from: 40, to: 60 },
  { label: "Greed", color: "#1D9E75", from: 60, to: 80 },
  { label: "Extreme Greed", color: "#7F77DD", from: 80, to: 100 },
];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 180) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, start: number, end: number) {
  const s = polar(cx, cy, r, start);
  const e = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function SentimentGauge() {
  const TARGET = MACRO.overall;
  const [value, setValue] = useState(0);

  useEffect(() => {
    let raf = 0;
    const duration = 1600;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setValue(TARGET * easeOut(p));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [TARGET]);

  const angle = (value / 100) * 180;
  const rad = ((180 - angle) * Math.PI) / 180;
  const cx = 130, cy = 130, r = 100;
  const nx = cx + r * Math.cos(rad);
  const ny = cy - r * Math.sin(rad);
  const display = Math.round(value);
  const zone = ZONES.find((z) => display >= z.from && display <= z.to) ?? ZONES[0];

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 h-full flex flex-col">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[13px] font-medium text-foreground">Overall Sentiment</h3>
        <span className="text-[10px] text-muted-foreground">Live</span>
      </div>
      <div className="relative flex-1 flex items-center justify-center">
        <svg viewBox="0 0 260 150" className="w-full max-w-[280px]">
          {ZONES.map((z, i) => {
            const startA = ((100 - z.to) / 100) * 180;
            const endA = ((100 - z.from) / 100) * 180;
            return (
              <path
                key={z.label}
                d={arc(cx, cy, r, startA, endA)}
                stroke={z.color}
                strokeWidth="16"
                fill="none"
                strokeLinecap="butt"
                opacity="0.88"
                className="sent-zone"
                style={{ animationDelay: `${i * 90}ms` }}
              />
            );
          })}
          <line
            x1={cx} y1={cy} x2={nx} y2={ny}
            stroke="#E6F1FB" strokeWidth="2.5" strokeLinecap="round"
          />
          <circle cx={cx} cy={cy} r="7" fill="#0A0B0E" stroke="#E6F1FB" strokeWidth="2" />
        </svg>
        <div className="absolute bottom-1 flex flex-col items-center">
          <div className="text-[36px] font-semibold leading-none tabular-nums" style={{ color: zone.color }}>
            {display}
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1">{zone.label}</div>
        </div>
      </div>
      <style>{`
        @keyframes sentZoneIn { from { opacity: 0; stroke-dashoffset: 320; } to { opacity: 0.88; stroke-dashoffset: 0; } }
        .sent-zone { stroke-dasharray: 320; animation: sentZoneIn 800ms ease-out both; }
      `}</style>
    </div>
  );
}

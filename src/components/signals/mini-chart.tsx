import { useMemo } from "react";
import { type Signal } from "@/lib/signals-data";

function seedRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function MiniChart({ signal }: { signal: Signal }) {
  const { candles, vols, w, h, priceMin, priceMax, scaleY, obY1, obY2, triggerIdx } = useMemo(() => {
    const w = 460;
    const chartH = 200;
    const volH = 50;
    const h = chartH + volH;
    const rand = seedRand(parseInt(signal.id.replace(/\D/g, "") || "1"));
    const isBuy = signal.direction === "BUY";
    const N = 60;
    const candles: { o: number; c: number; high: number; low: number }[] = [];
    const vols: number[] = [];
    // Generate candles converging toward entry near the end
    let price = signal.entry * (isBuy ? 0.985 : 1.015);
    const trend = isBuy ? 0.0006 : -0.0006;
    for (let i = 0; i < N; i++) {
      const vol = (0.003 + rand() * 0.006);
      const drift = (rand() - 0.5) * vol + trend;
      const o = price;
      const c = price * (1 + drift);
      const wickUp = 1 + rand() * vol * 0.6;
      const wickDn = 1 - rand() * vol * 0.6;
      const high = Math.max(o, c) * wickUp;
      const low = Math.min(o, c) * wickDn;
      candles.push({ o, c, high, low });
      vols.push(0.3 + rand() * 0.7);
      price = c;
    }
    // Trigger candle near end
    const triggerIdx = N - 6;
    vols[triggerIdx] = 1; // boom volume
    // Force close near entry on trigger
    candles[triggerIdx] = {
      o: signal.entry * (isBuy ? 0.997 : 1.003),
      c: signal.entry,
      high: signal.entry * (isBuy ? 1.001 : 1.001),
      low: signal.entry * (isBuy ? 0.994 : 1.006),
    };

    const allP = candles.flatMap((c) => [c.high, c.low]);
    const priceMin = Math.min(...allP, signal.stop) * 0.997;
    const priceMax = Math.max(...allP, signal.target) * 1.003;
    const scaleY = (p: number) => chartH - ((p - priceMin) / (priceMax - priceMin)) * chartH;

    // Order block zone around entry area
    const obY1 = scaleY(signal.entry * (isBuy ? 1.002 : 0.998));
    const obY2 = scaleY(signal.entry * (isBuy ? 0.995 : 1.005));

    return { candles, vols, w, h, priceMin, priceMax, scaleY, obY1, obY2, triggerIdx };
  }, [signal]);

  const isBuy = signal.direction === "BUY";
  const cw = w / candles.length;
  const bodyW = Math.max(1.5, cw * 0.6);
  const chartH = 200;
  const volH = 50;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto rounded-md bg-background/40 border border-border">
      {/* Order Block zone */}
      <rect
        x={0}
        y={Math.min(obY1, obY2)}
        width={w}
        height={Math.abs(obY2 - obY1)}
        fill="#378ADD"
        fillOpacity={0.1}
      />
      <text x={6} y={Math.min(obY1, obY2) + 11} fontSize={9} fill="#378ADD" opacity={0.8}>OB ZONE</text>

      {/* Target lines (dotted) */}
      <PriceLine y={scaleY(signal.target)} color="#1D9E75" label={`TP $${formatNum(signal.target)}`} w={w} dash="2 3" />
      {/* Entry (dashed) */}
      <PriceLine y={scaleY(signal.entry)} color="#378ADD" label={`ENTRY $${formatNum(signal.entry)}`} w={w} dash="6 3" />
      {/* Stop (dashed) */}
      <PriceLine y={scaleY(signal.stop)} color="#E24B4A" label={`SL $${formatNum(signal.stop)}`} w={w} dash="6 3" />

      {/* Candles */}
      {candles.map((c, i) => {
        const x = i * cw + cw / 2;
        const green = c.c >= c.o;
        const color = green ? "#1D9E75" : "#E24B4A";
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={scaleY(c.high)} y2={scaleY(c.low)} stroke={color} strokeWidth={1} />
            <rect
              x={x - bodyW / 2}
              y={scaleY(Math.max(c.o, c.c))}
              width={bodyW}
              height={Math.max(1, Math.abs(scaleY(c.o) - scaleY(c.c)))}
              fill={color}
            />
          </g>
        );
      })}

      {/* Signal arrow on trigger candle */}
      {(() => {
        const x = triggerIdx * cw + cw / 2;
        const y = scaleY(signal.entry);
        if (isBuy) {
          return (
            <g>
              <polygon points={`${x},${y + 6} ${x - 5},${y + 16} ${x + 5},${y + 16}`} fill="#1D9E75" />
              <circle cx={x} cy={y} r={4} fill="#1D9E75" stroke="#0A0B0E" strokeWidth={1.5} />
            </g>
          );
        }
        return (
          <g>
            <polygon points={`${x},${y - 6} ${x - 5},${y - 16} ${x + 5},${y - 16}`} fill="#E24B4A" />
            <circle cx={x} cy={y} r={4} fill="#E24B4A" stroke="#0A0B0E" strokeWidth={1.5} />
          </g>
        );
      })()}

      {/* Volume bars */}
      <line x1={0} y1={chartH} x2={w} y2={chartH} stroke="#1E2028" />
      {vols.map((v, i) => {
        const x = i * cw + cw / 2;
        const barH = v * (volH - 6);
        const green = candles[i].c >= candles[i].o;
        return (
          <rect
            key={i}
            x={x - bodyW / 2}
            y={h - barH}
            width={bodyW}
            height={barH}
            fill={green ? "#1D9E75" : "#E24B4A"}
            opacity={i === triggerIdx ? 1 : 0.4}
          />
        );
      })}
      <text x={6} y={chartH + 12} fontSize={9} fill="#888780">VOL</text>
    </svg>
  );
}

function PriceLine({ y, color, label, w, dash }: { y: number; color: string; label: string; w: number; dash: string }) {
  return (
    <g>
      <line x1={0} x2={w} y1={y} y2={y} stroke={color} strokeWidth={1} strokeDasharray={dash} opacity={0.85} />
      <rect x={w - 100} y={y - 8} width={94} height={14} fill={color} fillOpacity={0.18} />
      <text x={w - 6} y={y + 3} textAnchor="end" fontSize={9} fontWeight={600} fill={color}>{label}</text>
    </g>
  );
}

function formatNum(n: number) {
  if (n >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (n >= 10) return n.toFixed(2);
  return n.toFixed(3);
}

import { cn } from "@/lib/utils";

type Props = {
  used: number;
  limit: number | null; // null = unlimited
  size?: number;
  stroke?: number;
};

export function RateGauge({ used, limit, size = 44, stroke = 4 }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = limit === null ? 0.05 : Math.min(used / limit, 1);
  const dash = c * pct;
  const color =
    limit === null
      ? "stroke-[#5fa8ff]"
      : pct > 0.9
      ? "stroke-red-400"
      : pct > 0.7
      ? "stroke-amber-400"
      : "stroke-emerald-400";

  return (
    <div className="inline-flex items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-border fill-none" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            strokeWidth={stroke}
            strokeLinecap="round"
            className={cn("fill-none transition-[stroke-dashoffset] duration-700", color)}
            strokeDasharray={c}
            strokeDashoffset={c - dash}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[9.5px] font-semibold tabular-nums">
          {limit === null ? "∞" : `${Math.round(pct * 100)}%`}
        </div>
      </div>
      <div className="text-[10.5px] leading-tight text-muted-foreground">
        <div className="tabular-nums text-foreground">{used.toLocaleString()}</div>
        <div>/ {limit === null ? "∞" : limit.toLocaleString()}</div>
      </div>
    </div>
  );
}

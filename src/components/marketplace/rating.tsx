import { Star } from "lucide-react";

export function Rating({ value, count, size = 12 }: { value: number; count?: number; size?: number }) {
  const full = Math.round(value);
  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <div className="flex">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            style={{ width: size, height: size }}
            className={i < full ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
          />
        ))}
      </div>
      <span className="tabular-nums text-foreground/80">{value.toFixed(1)}</span>
      {count !== undefined && <span>({count})</span>}
    </div>
  );
}

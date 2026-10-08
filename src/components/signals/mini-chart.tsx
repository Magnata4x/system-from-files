import { type Signal, formatPrice } from "@/lib/signals-data";

export function MiniChart({ signal }: { signal: Signal }) {
  const levels = [
    { label: "TP", value: signal.target, color: "#1D9E75" },
    { label: "Entrada", value: signal.entry, color: "#378ADD" },
    { label: "SL", value: signal.stop, color: "#E24B4A" },
  ].filter((x): x is { label: string; value: number; color: string } => x.value != null && Number.isFinite(x.value));

  if (!levels.length) {
    return <div className="rounded-md border border-border bg-background/40 p-6 text-center text-[12px] text-muted-foreground">Dados de preço indisponíveis.</div>;
  }

  const values = levels.map((x) => x.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.abs(max) * 0.001, 1);
  const y = (value: number) => 180 - ((value - min) / span) * 150;

  return (
    <div className="rounded-md border border-border bg-background/40 p-3">
      <svg viewBox="0 0 460 210" className="w-full h-auto" role="img" aria-label="Níveis reais do sinal">
        {levels.map((level) => (
          <g key={level.label}>
            <line x1="20" x2="440" y1={y(level.value)} y2={y(level.value)} stroke={level.color} strokeDasharray="6 3" />
            <text x="24" y={y(level.value) - 6} fontSize="10" fill={level.color}>{level.label} {"$"}{formatPrice(level.value)}</text>
          </g>
        ))}
      </svg>
      <div className="text-[10px] text-muted-foreground mt-1">Somente níveis fornecidos pelo motor; sem candles sintéticos.</div>
    </div>
  );
}

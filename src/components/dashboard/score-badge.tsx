export function scoreColor(score: number): string {
  if (score >= 90) return "#7F77DD";
  if (score >= 75) return "#1D9E75";
  if (score >= 60) return "#EF9F27";
  return "#E24B4A";
}

export function ScoreBadge({ score, size = "md" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const color = scoreColor(score);
  const cls =
    size === "lg"
      ? "px-3 py-1.5 text-base"
      : size === "sm"
        ? "px-1.5 py-0.5 text-[11px]"
        : "px-2 py-1 text-xs";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md font-semibold tabular-nums ${cls}`}
      style={{
        background: `color-mix(in oklab, ${color} 18%, transparent)`,
        color,
        border: `1px solid color-mix(in oklab, ${color} 35%, transparent)`,
      }}
    >
      {score}
    </span>
  );
}

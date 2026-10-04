export type FearGreedZone = {
  label: string;
  color: string;
  from: number;
  to: number;
};

export const FEAR_GREED_ZONES: readonly FearGreedZone[] = [
  { label: "Extreme Fear", color: "#E24B4A", from: 0, to: 20 },
  { label: "Fear", color: "#EF9F27", from: 20, to: 40 },
  { label: "Neutral", color: "#888780", from: 40, to: 60 },
  { label: "Greed", color: "#1D9E75", from: 60, to: 80 },
  { label: "Extreme Greed", color: "#7F77DD", from: 80, to: 101 },
];

export function fearGreedColor(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "#888780";
  return FEAR_GREED_ZONES.find((zone) => value >= zone.from && value < zone.to)?.color ?? "#888780";
}

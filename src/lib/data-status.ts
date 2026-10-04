export type DataStatus = "loading" | "ok" | "stale" | "unavailable";

export function relativeAge(value: Date | number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return seconds + "s";
  if (seconds < 3600) return Math.floor(seconds / 60) + "min";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h";
  return Math.floor(seconds / 86400) + "d";
}

export function relativeTime(value: string | null | undefined): string {
  if (!value) return "—";
  const ms = new Date(value).getTime();
  if (!Number.isFinite(ms)) return value;
  const seconds = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (seconds < 60) return seconds + "s atrás";
  if (seconds < 3600) return Math.floor(seconds / 60) + "min atrás";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h atrás";
  return Math.floor(seconds / 86400) + "d atrás";
}

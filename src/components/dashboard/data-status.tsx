import { AlertTriangle, CircleOff, Loader2 } from "lucide-react";

export type DataStatus = "loading" | "ok" | "stale" | "unavailable";

export function DataStatusBadge({ source, updatedAt, status }: { source: string; updatedAt?: Date | number | null; status: DataStatus }) {
  const age = updatedAt ? relativeAge(updatedAt) : null;
  let label = "indisponível";
  if (status === "loading") label = "carregando…";
  else if (status === "stale") label = "desatualizado · " + (age ?? "sem atualização");
  else if (status === "ok") label = "há " + (age ?? "agora");
  return <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground" title={source + " · " + label}>
    {status === "loading" && <Loader2 className="size-3 animate-spin" />}
    {status === "stale" && <AlertTriangle className="size-3 text-amber-500" />}
    {status === "unavailable" && <CircleOff className="size-3" />}
    <span>{source} · {label}</span>
  </span>;
}

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
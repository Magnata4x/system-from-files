import { AlertTriangle, CircleOff, Loader2 } from "lucide-react";
import { relativeAge, type DataStatus } from "@/lib/data-status";

export function DataStatusBadge({
  source,
  updatedAt,
  status,
}: {
  source: string;
  updatedAt?: Date | number | null;
  status: DataStatus;
}) {
  const age = updatedAt ? relativeAge(updatedAt) : null;
  let label = "indisponível";
  if (status === "loading") label = "carregando…";
  else if (status === "stale") label = "desatualizado · " + (age ?? "sem atualização");
  else if (status === "ok") label = "há " + (age ?? "agora");

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
      title={source + " · " + label}
    >
      {status === "loading" && <Loader2 className="size-3 animate-spin" />}
      {status === "stale" && <AlertTriangle className="size-3 text-amber-500" />}
      {status === "unavailable" && <CircleOff className="size-3" />}
      <span>
        {source} · {label}
      </span>
    </span>
  );
}

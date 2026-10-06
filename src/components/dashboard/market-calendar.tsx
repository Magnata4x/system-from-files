import { Calendar, CircleOff, Clock3, Loader2 } from "lucide-react";
import { useMarketCalendar } from "@/hooks/useMarketCalendar";
import { DataStatusBadge } from "./data-status";

function formatEventTime(value: string): string {
  const date = new Date(value);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function importanceLabel(value: "high" | "med" | "low"): string {
  return value === "high" ? "alta" : value === "med" ? "média" : "baixa";
}

export function MarketCalendar() {
  const { data, isLoading, isError, isStale, dataUpdatedAt } = useMarketCalendar();
  const status = isLoading ? "loading" : isError || data?.status === "unavailable" ? "unavailable" : isStale ? "stale" : "ok";
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "fuso local";

  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full" aria-label="Calendário econômico">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="size-4" aria-hidden="true" />
          <div>
            <h3 className="text-[15px] font-medium">Calendário econômico</h3>
            <p className="text-[10px] text-muted-foreground">Próximos 7 dias · horários exibidos em {timezone}</p>
          </div>
        </div>
        <DataStatusBadge source="XOOMAR" updatedAt={data?.updatedAt ? new Date(data.updatedAt) : dataUpdatedAt} status={status} />
      </div>

      {status === "loading" && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-muted-foreground" role="status">
          <Loader2 className="size-3.5 animate-spin" /> Carregando calendário real…
        </div>
      )}

      {status === "unavailable" && (
        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 text-[12px] text-muted-foreground" role="status">
          <div className="flex items-center gap-2"><CircleOff className="size-3.5" /> Calendário econômico indisponível.</div>
          <div className="mt-1 text-[10px]">Nenhum evento fictício ou de fallback é exibido.</div>
        </div>
      )}

      {status !== "loading" && status !== "unavailable" && data?.events.length === 0 && (
        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 text-[12px] text-muted-foreground" role="status">
          Nenhum evento futuro encontrado nos próximos 7 dias.
        </div>
      )}

      {status !== "loading" && status !== "unavailable" && (data?.events.length ?? 0) > 0 && (
        <div className="mt-4 space-y-2">
          {data!.events.map((event) => (
            <div key={event.scheduledAt + event.eventName} className="rounded-lg border border-border/70 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium truncate">{event.eventName}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {event.source.toUpperCase()} · impacto {importanceLabel(event.importance)}
                    {event.periodLabel ? ` · ${event.periodLabel}` : ""}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground tabular-nums">
                  <Clock3 className="size-3" />
                  {formatEventTime(event.scheduledAt)}
                </div>
              </div>
              <div className="mt-2 text-[10px] text-muted-foreground">
                UTC: {new Date(event.scheduledAt).toISOString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {data?.attribution && (
        <div className="mt-3 text-[9px] text-muted-foreground">
          {data.attribution}
        </div>
      )}
    </div>
  );
}

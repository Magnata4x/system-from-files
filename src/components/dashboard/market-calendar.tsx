import { Calendar } from "lucide-react";

export function MarketCalendar() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full" aria-label="Calendário econômico">
      <div className="flex items-center gap-2">
        <Calendar className="size-4" aria-hidden="true" />
        <div>
          <h3 className="text-[15px] font-medium">Calendário econômico</h3>
          <p className="text-[10px] text-muted-foreground">Provedor ainda não configurado.</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-4 text-[12px] text-muted-foreground" role="status">
        Indisponível nesta fase. Nenhum evento econômico fictício é exibido.
      </div>
    </div>
  );
}

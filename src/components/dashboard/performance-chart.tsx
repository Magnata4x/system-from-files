export function PerformanceChart() {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-[15px] font-medium">Average score distribution</h3>
      <p className="text-[11px] text-muted-foreground mt-1">Histórico real ainda não conectado.</p>
      <div className="h-[220px] mt-3 rounded-lg border border-border bg-secondary/20 flex items-center justify-center text-[12px] text-muted-foreground">
        Indisponível nesta fase. Nenhuma série ou média fictícia é exibida.
      </div>
    </div>
  );
}

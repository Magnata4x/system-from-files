import { getRecentDnaCorrections } from "@/lib/dna-auto-corrector";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCcw, AlertCircle, History } from "lucide-react";
import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function DnaCorrectionsHistory() {
  const [logs, setLogs] = useState(() => getRecentDnaCorrections());

  useEffect(() => {
    const id = setInterval(() => setLogs(getRecentDnaCorrections()), 5_000);
    return () => clearInterval(id);
  }, []);

  const handleRefresh = () => setLogs(getRecentDnaCorrections());

  return (
    <Card className="rounded-xl border border-border bg-card/40 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="size-4 text-[var(--brand-cyan)]" />
            <h2 className="text-sm font-semibold">Histórico de correções do DNA</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Últimas 20 correções automáticas aplicadas pelo DNA Auto-Corrector.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8 gap-1.5 text-xs">
          <RefreshCcw className="size-3.5" />
          Atualizar
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
          <AlertCircle className="size-6 opacity-50" />
          <p className="text-sm">Nenhuma correção aplicada ainda.</p>
          <p className="text-xs max-w-md text-center">
            O DNA monitora o desempenho do Bot4x e aplica ajustes automáticos quando detecta perda de capital ou trajetória negativa.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log, i) => (
            <div
              key={`${log.ts}-${i}`}
              className="rounded-lg border border-border bg-background/60 p-4 hover:border-[var(--brand-cyan)]/40 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-xs text-muted-foreground">
                    {format(log.ts, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    {formatDistanceToNow(log.ts, { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] h-5 border-amber-500/30 text-amber-400 bg-amber-500/10">
                  Auto-correção
                </Badge>
              </div>

              <div className="flex items-start gap-2 mb-2">
                <AlertCircle className="size-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm font-medium">{log.reason}</p>
              </div>

              <div className="space-y-1">
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Mudanças aplicadas</div>
                <ul className="space-y-1.5">
                  {log.changes.map((change, idx) => (
                    <li
                      key={idx}
                      className="text-sm flex items-start gap-2 before:content-['•'] before:text-[var(--brand-cyan)]"
                    >
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

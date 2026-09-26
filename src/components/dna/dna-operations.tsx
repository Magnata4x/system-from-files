import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { bot4xAdapter } from "@/adapters/backend/bot4x.adapter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE = 15;

function fmt(n: number | undefined | null, digits = 4) {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: digits });
}

function resultTone(result: string) {
  const r = result.toUpperCase();
  if (r.includes("WIN") || r.includes("TP")) return "text-[#1D9E75]";
  if (r.includes("LOSS") || r.includes("SL")) return "text-[#E24B4A]";
  return "text-muted-foreground";
}

/** Operações detalhadas — mesma base de dados do radar e do mapa de calor. */
export function DnaOperations() {
  const [page, setPage] = useState(0);
  const [result, setResult] = useState("all");
  const [side, setSide] = useState("all");

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["dna", "operations", page, result, side],
    queryFn: () => bot4xAdapter.executionsPage({ limit: PAGE, offset: page * PAGE, result, side }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const lastPage = Math.max(0, Math.ceil(total / PAGE) - 1);

  return (
    <section className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Operações detalhadas</h2>
          <p className="text-xs text-muted-foreground">
            Entrada, stop, alvo, resultado e data — o mesmo histórico que alimenta o radar e o mapa
            de calor.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={side}
            onValueChange={(v) => {
              setSide(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os lados</SelectItem>
              <SelectItem value="LONG">Long</SelectItem>
              <SelectItem value="SHORT">Short</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={result}
            onValueChange={(v) => {
              setResult(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os resultados</SelectItem>
              <SelectItem value="WIN">Ganhos</SelectItem>
              <SelectItem value="LOSS">Perdas</SelectItem>
              <SelectItem value="OPEN">Em aberto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center space-y-2">
          <p className="text-sm text-[#E24B4A]">
            {(error as Error)?.message ?? "Não foi possível carregar suas operações."}
          </p>
          <Button size="sm" variant="outline" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhuma operação registrada ainda. Assim que o Bot4x operar, o histórico aparece aqui.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left font-medium py-2 pr-3">Data</th>
                  <th className="text-left font-medium py-2 pr-3">Par</th>
                  <th className="text-left font-medium py-2 pr-3">Lado</th>
                  <th className="text-right font-medium py-2 pr-3">Entrada</th>
                  <th className="text-right font-medium py-2 pr-3">Stop (SL)</th>
                  <th className="text-right font-medium py-2 pr-3">Alvo (TP)</th>
                  <th className="text-left font-medium py-2 pr-3">Resultado</th>
                  <th className="text-right font-medium py-2">PnL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((op) => (
                  <tr key={op.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {op.createdAt ? new Date(op.createdAt).toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="py-2 pr-3 font-medium">{op.pair}</td>
                    <td className="py-2 pr-3">{op.side}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(op.entryPrice)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(op.stopLoss)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{fmt(op.takeProfit)}</td>
                    <td className={`py-2 pr-3 ${resultTone(op.result ?? op.status ?? "")}`}>
                      {op.result ?? op.status ?? "—"}
                    </td>
                    <td
                      className={`py-2 text-right tabular-nums ${(op.pnl ?? 0) >= 0 ? "text-[#1D9E75]" : "text-[#E24B4A]"}`}
                    >
                      {fmt(op.pnl, 2)}
                      {op.pnlPct !== undefined && (
                        <span className="text-muted-foreground"> ({fmt(op.pnlPct, 2)}%)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {page * PAGE + 1}–{page * PAGE + items.length} de {total}
              {isFetching && " · atualizando…"}
            </span>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

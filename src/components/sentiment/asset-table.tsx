import { useState } from "react";
import { useSentiment, useSentimentAsset } from "@/hooks/useSentiment";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const trendIcon: Record<string, string> = { up: "↑", upup: "↑↑", flat: "→", down: "↓" };
const trendColor: Record<string, string> = {
  up: "text-emerald-300", upup: "text-emerald-300", flat: "text-muted-foreground", down: "text-red-300",
};

export function AssetSentimentTable() {
  const { data, isPending, isError } = useSentiment();
  const [selected, setSelected] = useState<string | null>(null);
  const detail = useSentimentAsset(selected);
  const rows = data?.assets ?? [];

  if (isPending) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4 space-y-2">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Momentum por ativo</h3>
          <span className="text-[10px] text-muted-foreground">carregando</span>
        </div>
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </div>
    );
  }

  if (isError || rows.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card/40 p-4">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-sm font-semibold">Momentum por ativo</h3>
          <span className="text-[10px] text-muted-foreground">dados indisponíveis</span>
        </div>
        <p className="py-8 text-center text-sm text-muted-foreground">
          Dados reais de mercado indisponíveis no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <h3 className="text-sm font-semibold mb-3">Momentum por ativo</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground text-left">
              <th className="py-2 font-medium">Ativo</th>
              <th className="font-medium">Momentum</th>
              <th className="font-medium">Range</th>
              <th className="font-medium">Overall</th>
              <th className="font-medium">Tendência</th>
              <th className="font-medium text-right">Sinal</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr
                key={a.asset}
                className="border-t border-border/60 hover:bg-secondary/30 cursor-pointer"
                onClick={() => setSelected(a.asset)}
              >
                <td className="py-2.5 font-semibold">{a.asset}</td>
                <td className="tabular-nums">{a.momentum}</td>
                <td className="tabular-nums">{a.rangePosition ?? "—"}</td>
                <td className="tabular-nums font-semibold">{a.overall}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={`text-base ${trendColor[a.trend]}`}>{trendIcon[a.trend]}</span>
                    <div className="w-16 h-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={a.spark.map((v, i) => ({ i, v }))}>
                          <Line
                            type="monotone" dataKey="v"
                            stroke={a.trend === "down" ? "#ef4444" : a.trend === "flat" ? "#94a3b8" : "#22d3ee"}
                            strokeWidth={1.5} dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </td>
                <td className="text-right">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    a.signal === "BULLISH" ? "bg-emerald-500/15 text-emerald-300"
                    : a.signal === "BEARISH" ? "bg-red-500/15 text-red-300"
                    : "bg-secondary text-muted-foreground"
                  }`}>{a.signal}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selected}/USDT</DialogTitle>
          </DialogHeader>
          {detail.isPending ? (
            <div className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-44 w-full" /></div>
          ) : detail.isError || !detail.data ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Não foi possível carregar os detalhes deste ativo.</p>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric label="Preço" value={detail.data.price.toLocaleString("pt-BR", { maximumFractionDigits: 6 })} />
                <Metric label="Variação 24h" value={`${detail.data.changePct >= 0 ? "+" : ""}${detail.data.changePct.toFixed(2)}%`} />
                <Metric label="Máxima" value={detail.data.high.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} />
                <Metric label="Mínima" value={detail.data.low.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} />
              </div>
              <div className="h-48 rounded-md border border-border p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={detail.data.series}>
                    <Line type="monotone" dataKey="close" stroke="var(--brand-cyan)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground">Últimas 48 horas · atualização ao vivo pela exchange</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md border border-border p-3"><div className="text-[10px] uppercase text-muted-foreground">{label}</div><div className="mt-1 text-sm font-semibold tabular-nums">{value}</div></div>;
}

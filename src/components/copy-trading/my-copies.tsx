import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRADERS, type ActiveCopy } from "@/lib/copy-trading-data";
import { cn } from "@/lib/utils";

export function MyCopies({ copies, onStop }: { copies: ActiveCopy[]; onStop: (traderId: string) => void }) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">My copies</h2>
        <span className="text-xs text-muted-foreground">{copies.length} active</span>
      </header>
      {copies.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/20 p-8 text-center text-sm text-muted-foreground">
          You're not copying any traders yet. Pick one from the leaderboard above.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {copies.map((c) => {
            const trader = TRADERS.find((t) => t.id === c.traderId);
            if (!trader) return null;
            return (
              <div key={c.traderId} className="rounded-lg border border-border bg-card/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{trader.handle}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {trader.strategy} · Risk {c.config.riskPerTrade.toFixed(2)}% · Since {c.since}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onStop(c.traderId)}
                    className="h-7 text-xs text-muted-foreground hover:text-red-400 hover:border-red-500/40"
                  >
                    <X className="size-3 mr-1" /> Stop
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
                  <Stat label="PnL" value={`${c.pnl > 0 ? "+" : ""}${c.pnl.toFixed(1)}%`} tone={c.pnl >= 0 ? "pos" : "neg"} />
                  <Stat label="Trades" value={String(c.trades)} />
                  <Stat label="Win rate" value={`${c.winRate}%`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "pos" | "neg" }) {
  return (
    <div className="pt-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-base font-semibold tabular-nums mt-0.5", tone === "pos" && "text-emerald-400", tone === "neg" && "text-red-400")}>
        {value}
      </div>
    </div>
  );
}

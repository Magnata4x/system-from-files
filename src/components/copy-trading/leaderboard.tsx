import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TRADERS, TRADER_SPARKS, type Trader } from "@/lib/copy-trading-data";
import { Sparkline } from "./sparkline";
import { cn } from "@/lib/utils";

const STRATEGY_COLORS: Record<Trader["strategy"], string> = {
  Scalper: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Swing: "bg-[#378ADD]/15 text-[#5fa8ff] border-[#378ADD]/30",
  Position: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

const MEDALS = ["🥇", "🥈", "🥉"];

function Avatar({ handle }: { handle: string }) {
  const initial = handle.replace("@", "").slice(0, 2).toUpperCase();
  return (
    <div className="size-8 rounded-full bg-gradient-to-br from-[#378ADD]/30 to-[#5fa8ff]/10 border border-border flex items-center justify-center text-[11px] font-semibold">
      {initial}
    </div>
  );
}

export function Leaderboard({ onCopy, copiedIds }: { onCopy: (t: Trader) => void; copiedIds: Set<string> }) {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Top traders</h2>
        <span className="text-xs text-muted-foreground">Ranked by 30d risk-adjusted return</span>
      </header>
      <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1040px]">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-secondary/30">
              <tr>
                <th className="text-left font-medium px-3 py-2.5 w-10">#</th>
                <th className="text-left font-medium px-3 py-2.5">Trader</th>
                <th className="text-left font-medium px-3 py-2.5">Strategy</th>
                <th className="text-right font-medium px-3 py-2.5">Win Rate</th>
                <th className="text-right font-medium px-3 py-2.5">Avg R/R</th>
                <th className="text-right font-medium px-3 py-2.5">Signals 30d</th>
                <th className="text-right font-medium px-3 py-2.5">Followers</th>
                <th className="text-right font-medium px-3 py-2.5">Monthly</th>
                <th className="text-left font-medium px-3 py-2.5 w-28">30d PnL</th>
                <th className="text-right font-medium px-3 py-2.5">Max DD</th>
                <th className="text-right font-medium px-3 py-2.5 w-28">Action</th>
              </tr>
            </thead>
            <tbody>
              {TRADERS.map((t, i) => {
                const copied = copiedIds.has(t.id);
                return (
                  <tr key={t.id} className="border-t border-border/60 hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-3 text-center">
                      {i < 3 ? <span className="text-base">{MEDALS[i]}</span> : <span className="text-muted-foreground tabular-nums">{i + 1}</span>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar handle={t.handle} />
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{t.handle}</span>
                          {t.verified && <BadgeCheck className="size-3.5 text-[#5fa8ff]" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded border", STRATEGY_COLORS[t.strategy])}>
                        {t.strategy}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{t.winRate}%</td>
                    <td className="px-3 py-3 text-right tabular-nums">{t.rr.toFixed(1)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{t.signals30d}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{t.followers.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-400 font-medium">+{t.monthlyReturn}%</td>
                    <td className="px-3 py-3"><Sparkline data={TRADER_SPARKS[t.id]} positive={t.monthlyReturn >= 0} /></td>
                    <td className="px-3 py-3 text-right tabular-nums text-red-400/80">-{t.maxDrawdown}%</td>
                    <td className="px-3 py-3 text-right">
                      <Button
                        size="sm"
                        variant={copied ? "outline" : "default"}
                        disabled={copied}
                        onClick={() => onCopy(t)}
                        className={cn(!copied && "bg-[#378ADD] hover:bg-[#2d74bd] text-white", "h-7 text-xs")}
                      >
                        {copied ? "Copying" : "Copy"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

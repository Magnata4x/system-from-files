import { Crown } from "lucide-react";
import { TOP_COPIERS, TRADERS } from "@/lib/copy-trading-data";

export function TopCopiers() {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Crown className="size-4 text-amber-400" /> Top copiers
        </h2>
        <span className="text-xs text-muted-foreground">Best returns from following top traders</span>
      </header>
      <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-secondary/30">
              <tr>
                <th className="text-left font-medium px-3 py-2.5 w-10">#</th>
                <th className="text-left font-medium px-3 py-2.5">Copier</th>
                <th className="text-left font-medium px-3 py-2.5">Following</th>
                <th className="text-right font-medium px-3 py-2.5">Capital</th>
                <th className="text-right font-medium px-3 py-2.5">Win rate</th>
                <th className="text-right font-medium px-3 py-2.5">PnL 30d</th>
              </tr>
            </thead>
            <tbody>
              {TOP_COPIERS.map((c, i) => {
                const sampleTraders = TRADERS.slice(0, Math.min(c.followingCount, 3));
                return (
                  <tr key={c.id} className="border-t border-border/60 hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-3 text-center tabular-nums text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-3 font-medium">{c.handle}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex -space-x-1.5">
                          {sampleTraders.map((t) => (
                            <div
                              key={t.id}
                              className="size-5 rounded-full bg-gradient-to-br from-[#378ADD]/40 to-[#5fa8ff]/10 border border-card flex items-center justify-center text-[9px] font-semibold"
                              title={t.handle}
                            >
                              {t.handle.replace("@", "").slice(0, 1).toUpperCase()}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{c.followingCount} traders</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{c.capital}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{c.winRate}%</td>
                    <td className="px-3 py-3 text-right tabular-nums text-emerald-400 font-medium">+{c.pnl30d}%</td>
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

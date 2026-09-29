import { sentiment, trendingTags } from "@/lib/dashboard-data";

export function Sentiment() {
  return (
    <div className="rounded-xl border border-border bg-card p-4 h-full">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[15px] font-medium text-foreground">Sentiment snapshot</h3>
        <span className="text-[11px] text-muted-foreground">Aggregated 1h</span>
      </div>
      <div className="space-y-3">
        {sentiment.map((s) => (
          <div key={s.asset}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="font-medium text-foreground">{s.asset}</span>
              <span className="text-muted-foreground tabular-nums">
                <span style={{ color: "#1D9E75" }}>{s.bull}%</span> · <span style={{ color: "#E24B4A" }}>{s.bear}%</span>
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex bg-secondary">
              <div style={{ width: `${s.bull}%`, background: "#1D9E75" }} />
              <div style={{ width: `${s.bear}%`, background: "#E24B4A" }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Trending</div>
        <div className="flex flex-wrap gap-1.5">
          {trendingTags.map((t) => (
            <span key={t} className="px-2 py-1 rounded-full text-[11px] font-medium bg-secondary text-foreground border border-border">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

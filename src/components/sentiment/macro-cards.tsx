import { MACRO } from "@/lib/sentiment-data";
import { TrendingUp, Flame, Newspaper } from "lucide-react";

export function MacroCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Card title="Social Volume 24h" >
        <div className="flex items-end justify-between">
          <div className="text-2xl font-semibold">{MACRO.socialVolume.value}</div>
          <div className="text-xs text-emerald-400 flex items-center gap-1">
            <TrendingUp className="size-3" /> +{MACRO.socialVolume.change}%
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">mentions across all sources</div>
      </Card>
      <Card title="Bull / Bear Ratio">
        <div className="flex items-center gap-3">
          <Donut bull={MACRO.bullBear.bull} />
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-400" /> Bull {MACRO.bullBear.bull}%</div>
            <div className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-400" /> Bear {MACRO.bullBear.bear}%</div>
          </div>
        </div>
      </Card>
      <Card title="Trending Narrative">
        <div className="flex items-center gap-2">
          <Flame className="size-5 text-amber-400" />
          <span className="text-lg font-semibold tracking-tight">{MACRO.trending}</span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">+212% mentions vs 7d avg</div>
      </Card>
      <Card title="News Impact Score">
        <div className="flex items-end justify-between">
          <div className="text-2xl font-semibold">{MACRO.newsImpact}<span className="text-sm text-muted-foreground">/100</span></div>
          <Newspaper className="size-4 text-muted-foreground" />
        </div>
        <div className="text-[11px] text-emerald-400 mt-1">Moderately positive</div>
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{title}</div>
      {children}
    </div>
  );
}

function Donut({ bull }: { bull: number }) {
  const r = 22, c = 2 * Math.PI * r;
  const off = c * (1 - bull / 100);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} stroke="rgb(239 68 68 / 0.85)" strokeWidth="7" fill="none" />
      <circle
        cx="28" cy="28" r={r}
        stroke="rgb(52 211 153)" strokeWidth="7" fill="none"
        strokeDasharray={c} strokeDashoffset={off}
        transform="rotate(-90 28 28)"
        strokeLinecap="round"
      />
    </svg>
  );
}

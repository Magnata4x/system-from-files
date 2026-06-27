import { useState } from "react";
import { NEWS, NARRATIVES, type NewsItem } from "@/lib/sentiment-data";
import { Star, Filter, X } from "lucide-react";

const TABS = ["All", "Macro", "Crypto", "Regulatory", "Technical"] as const;

export function NewsFeed({
  narrativeFilter,
  onClearNarrative,
}: {
  narrativeFilter: string | null;
  onClearNarrative: () => void;
}) {
  const [tab, setTab] = useState<typeof TABS[number]>("All");

  const narrative = NARRATIVES.find((n) => n.tag === narrativeFilter);
  const filtered = NEWS.filter((n) => {
    if (tab !== "All" && n.category !== tab) return false;
    if (narrative) {
      const hay = (n.headline + " " + n.assets.join(" ")).toLowerCase();
      return narrative.keywords.some((k) => hay.includes(k.toLowerCase()));
    }
    return true;
  });

  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold mb-2">News Impact Feed</h3>
      <div className="flex gap-1 mb-2 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {narrative && (
        <div className="mb-3 flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/30">
          <div className="flex items-center gap-1.5 text-[11px] text-cyan-200">
            <Filter className="size-3" />
            Narrative: <span className="font-semibold">{narrative.tag}</span>
            <span className="text-muted-foreground">· {filtered.length} match{filtered.length === 1 ? "" : "es"}</span>
          </div>
          <button onClick={onClearNarrative} className="text-cyan-200 hover:text-foreground">
            <X className="size-3" />
          </button>
        </div>
      )}
      <div className="space-y-2 overflow-y-auto flex-1 pr-1 max-h-[640px]">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">No headlines match this narrative yet.</div>
        ) : (
          filtered.map((n, i) => <NewsRow key={i} n={n} />)
        )}
      </div>
    </div>
  );
}

function NewsRow({ n }: { n: NewsItem }) {
  return (
    <div className={`rounded-lg p-2.5 bg-secondary/30 border-l-2 ${
      n.highImpact ? "border-amber-400" : "border-transparent"
    }`}>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
        <span>{n.time} · {n.source}</span>
        <div className="flex">
          {Array.from({ length: n.stars }).map((_, i) => (
            <Star key={i} className="size-2.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>
      <p className="text-xs text-foreground/90 line-clamp-2 mb-1.5">{n.headline}</p>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
          n.tone === "POSITIVE" ? "bg-emerald-500/15 text-emerald-300"
          : n.tone === "NEGATIVE" ? "bg-red-500/15 text-red-300"
          : "bg-secondary text-muted-foreground"
        }`}>{n.tone}</span>
        {n.assets.map((a) => (
          <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-foreground/70">${a}</span>
        ))}
      </div>
    </div>
  );
}

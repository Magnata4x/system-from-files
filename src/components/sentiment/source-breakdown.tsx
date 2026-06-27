import { SOURCES } from "@/lib/sentiment-data";
import { Star } from "lucide-react";

export function SourceBreakdown() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Box title="Twitter / X" score={SOURCES.twitter.score} label={SOURCES.twitter.label}>
        <Ratio bull={SOURCES.twitter.bull} bear={SOURCES.twitter.bear} />
        <div className="text-[11px] text-muted-foreground mt-2">{SOURCES.twitter.volume}</div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {SOURCES.twitter.tags.map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-foreground/80">{t}</span>
          ))}
        </div>
      </Box>

      <Box title="Reddit" score={SOURCES.reddit.score} label={SOURCES.reddit.label}>
        <Ratio bull={SOURCES.reddit.bull} bear={SOURCES.reddit.bear} />
        <div className="space-y-1 mt-2">
          {SOURCES.reddit.subs.map((s) => (
            <div key={s.name} className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{s.name}</span>
              <span className="font-medium tabular-nums">{s.pct}%</span>
            </div>
          ))}
        </div>
        <div className="mt-2 p-2 rounded bg-secondary/60 text-[11px] text-foreground/85 italic line-clamp-2">
          “{SOURCES.reddit.hotPost}”
        </div>
      </Box>

      <Box title="News Engine" score={SOURCES.news.score} label={SOURCES.news.label}>
        <div className="space-y-2 mt-1">
          {SOURCES.news.headlines.map((h) => (
            <div key={h.text} className="flex items-start justify-between gap-2 text-[11.5px]">
              <span className="text-foreground/90 line-clamp-1 flex-1">{h.text}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${
                  h.tone === "POSITIVE" ? "bg-emerald-500/15 text-emerald-300"
                  : h.tone === "NEGATIVE" ? "bg-red-500/15 text-red-300"
                  : "bg-secondary text-muted-foreground"
                }`}>{h.tone}</span>
                <div className="flex">
                  {Array.from({ length: h.stars }).map((_, i) => (
                    <Star key={i} className="size-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Box>

      <Box title="On-Chain" score={SOURCES.onchain.score} label={SOURCES.onchain.label}>
        <div className="space-y-1.5 mt-1 text-[11.5px]">
          {SOURCES.onchain.metrics.map((m) => (
            <div key={m.k} className="flex justify-between items-center">
              <span className="text-muted-foreground">{m.k}</span>
              <span className={`font-medium tabular-nums ${
                m.tone === "pos" ? "text-emerald-300" : m.tone === "neutral" ? "text-foreground" : "text-red-300"
              }`}>
                {m.v}{m.note && <span className="text-[10px] text-muted-foreground ml-1">{m.note}</span>}
              </span>
            </div>
          ))}
        </div>
      </Box>
    </div>
  );
}

function Box({ title, score, label, children }: { title: string; score: number; label: string; children: React.ReactNode }) {
  const tone = score >= 70 ? "text-emerald-300" : score >= 55 ? "text-amber-300" : score >= 40 ? "text-muted-foreground" : "text-red-300";
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-[12px] font-semibold uppercase tracking-wider text-foreground/80">{title}</h4>
        <div className="text-right">
          <span className={`text-base font-semibold ${tone}`}>{score}</span>
          <span className="text-[10px] text-muted-foreground ml-1">{label}</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function Ratio({ bull, bear }: { bull: number; bear: number }) {
  return (
    <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
      <div className="bg-emerald-500" style={{ width: `${bull}%` }} />
      <div className="bg-red-500" style={{ width: `${bear}%` }} />
    </div>
  );
}

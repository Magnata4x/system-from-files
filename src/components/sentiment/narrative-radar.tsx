import { NARRATIVES } from "@/lib/sentiment-data";
import { TrendingDown, X } from "lucide-react";

export function NarrativeRadar({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (tag: string | null) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between mb-3 gap-3">
        <div>
          <h3 className="text-sm font-semibold">Dominant Market Narratives</h3>
          <p className="text-[11px] text-muted-foreground">Click a tag to filter the news feed</p>
        </div>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-secondary hover:bg-secondary/70 text-foreground"
          >
            <X className="size-3" /> Clear: {selected}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2 items-center justify-center py-3">
        {NARRATIVES.map((n) => {
          const size = 10 + (n.weight / 100) * 20;
          const isActive = selected === n.tag;
          const isDimmed = selected !== null && !isActive;
          const color =
            n.tone === "bull" ? "text-emerald-300 hover:text-emerald-200"
            : n.tone === "bear" ? "text-red-300 hover:text-red-200"
            : "text-muted-foreground hover:text-foreground";
          return (
            <button
              key={n.tag}
              onClick={() => onSelect(isActive ? null : n.tag)}
              className={`font-semibold tracking-tight transition-all hover:scale-110 cursor-pointer ${color} ${
                isDimmed ? "opacity-30" : ""
              } ${isActive ? "underline underline-offset-4" : ""}`}
              style={{ fontSize: `${size}px`, lineHeight: 1.1 }}
            >
              {n.tag}
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 flex items-center gap-2.5">
        <div className="size-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
          <TrendingDown className="size-3.5 text-emerald-300" />
        </div>
        <p className="text-xs text-foreground/85">
          <span className="font-semibold text-emerald-300">'Regulatory Risk'</span> dropped <span className="font-semibold">34%</span> in 48h — sentiment recovery signal.
        </p>
      </div>
    </div>
  );
}

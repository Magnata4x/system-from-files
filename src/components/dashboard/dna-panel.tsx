import { dna } from "@/lib/dashboard-data";
import { Brain, TrendingUp, Sparkles, Target } from "lucide-react";

const colorMap: Record<string, { bg: string; fg: string; dot: string }> = {
  green: { bg: "color-mix(in oklab, #1D9E75 18%, transparent)", fg: "#1D9E75", dot: "🟢" },
  red: { bg: "color-mix(in oklab, #E24B4A 18%, transparent)", fg: "#E24B4A", dot: "🔴" },
  amber: { bg: "color-mix(in oklab, #EF9F27 18%, transparent)", fg: "#EF9F27", dot: "🟡" },
};

export function DnaPanel() {
  return (
    <div
      data-tour="dna-panel"
      className="rounded-xl border bg-card p-5 relative overflow-hidden"
      style={{ borderColor: "color-mix(in oklab, #378ADD 35%, var(--border))" }}
    >
      <div
        className="absolute inset-0 pointer-events-none opacity-50"
        style={{ background: "radial-gradient(ellipse at top left, color-mix(in oklab, #378ADD 12%, transparent), transparent 60%)" }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, #378ADD 18%, transparent)", color: "#378ADD" }}>
              <Brain className="size-4" />
            </div>
            <div>
              <h3 className="text-[15px] font-medium text-foreground">Your Trading DNA</h3>
              <p className="text-[11px] text-muted-foreground">Personalized insights from your last 90 days</p>
            </div>
          </div>
          <button className="text-[12px] text-[var(--brand-cyan)] hover:underline">Open full report →</button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric icon={<Target className="size-4" />} label="Consistency" value={`${dna.consistency}/100`} accent="#378ADD" />
          <Metric icon={<TrendingUp className="size-4" />} label="Win rate" value={`${dna.winRate}%`} delta={`↑ ${dna.winRateDelta}%`} accent="#1D9E75" />
          <Metric icon={<Sparkles className="size-4" />} label="Best setup" value={dna.bestSetup} accent="#7F77DD" />
          <div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Recommendation</div>
            <div className="text-[13px] text-foreground leading-snug">{dna.recommendation}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {dna.insights.map((i) => {
            const c = colorMap[i.color];
            return (
              <button
                key={i.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-transform hover:scale-105"
                style={{ background: c.bg, color: c.fg, border: `1px solid color-mix(in oklab, ${c.fg} 30%, transparent)` }}
              >
                <span>{c.dot}</span> {i.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Metric({ icon, label, value, delta, accent }: { icon: React.ReactNode; label: string; value: string; delta?: string; accent: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider mb-1">
        <span style={{ color: accent }}>{icon}</span> {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[20px] font-semibold text-foreground">{value}</span>
        {delta && <span className="text-[12px] font-medium" style={{ color: "#1D9E75" }}>{delta}</span>}
      </div>
    </div>
  );
}

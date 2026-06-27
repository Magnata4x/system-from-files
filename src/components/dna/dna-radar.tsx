import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";
import { RADAR } from "@/lib/dna-data";
import { useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Trophy } from "lucide-react";

const TOP_TRADERS: Record<string, number> = {
  "Win Rate": 81,
  "Avg R/R": 90,
  "Consistency": 92,
  "Drawdown Ctrl": 94,
  "Timing": 88,
  "Volume Disc.": 91,
};

export function DnaRadar() {
  const [compare, setCompare] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const data = useMemo(
    () => RADAR.map((r) => ({ ...r, top: TOP_TRADERS[r.axis] ?? 85 })),
    []
  );

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">DNA radar</h2>
          <p className="text-xs text-muted-foreground">Your DNA vs Institutional Benchmark</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <Trophy className="size-3.5 text-amber-400" />
          <span>Compare with top traders</span>
          <Switch
            checked={compare}
            onCheckedChange={(v) => { setCompare(v); setAnimKey((k) => k + 1); }}
          />
        </label>
      </div>
      <div className="h-[340px] dna-radar-anim" key={animKey}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="75%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="Your DNA"
              dataKey="you"
              stroke="#378ADD"
              fill="#378ADD"
              fillOpacity={0.3}
              strokeWidth={2}
              isAnimationActive
              animationDuration={1400}
              animationEasing="ease-out"
            />
            <Radar
              name="Institutional benchmark"
              dataKey="bench"
              stroke="#7F77DD"
              fill="#7F77DD"
              fillOpacity={0.05}
              strokeDasharray="5 4"
              strokeWidth={2}
              isAnimationActive
              animationDuration={1400}
              animationBegin={200}
              animationEasing="ease-out"
            />
            {compare && (
              <Radar
                name="Top 1% traders"
                dataKey="top"
                stroke="#F5C84B"
                fill="#F5C84B"
                fillOpacity={0.08}
                strokeDasharray="2 3"
                strokeWidth={2}
                isAnimationActive
                animationDuration={1400}
                animationBegin={400}
                animationEasing="ease-out"
              />
            )}
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <style>{`
        .dna-radar-anim .recharts-radar-polygon {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: dnaRadarDraw 1400ms ease-out forwards;
        }
        .dna-radar-anim .recharts-layer > .recharts-radar:nth-child(2) .recharts-radar-polygon { animation-delay: 200ms; }
        .dna-radar-anim .recharts-layer > .recharts-radar:nth-child(3) .recharts-radar-polygon { animation-delay: 400ms; }
        @keyframes dnaRadarDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

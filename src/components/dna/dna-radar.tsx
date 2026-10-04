import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useDnaStats } from "@/hooks/useDnaStats";

export function DnaRadar() {
  const { data: stats } = useDnaStats();
  if (!stats?.hasData || stats.radar.length === 0) {
    return <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">Radar indisponível — sem dados reais suficientes.</div>;
  }

  const data = stats.radar;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">DNA radar</h2>
          <p className="text-xs text-muted-foreground">
            Seu DNA real
          </p>
        </div>
      </div>
      <div className="h-[340px] dna-radar-anim">
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
            
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <style>{`
        .dna-radar-anim .recharts-radar-polygon {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: dnaRadarDraw 1400ms ease-out forwards;
        }
}

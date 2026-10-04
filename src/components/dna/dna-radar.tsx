import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { useDnaStats } from "@/hooks/useDnaStats";

export function DnaRadar() {
  const { data: stats, isLoading, isError } = useDnaStats();
  if (isLoading) return <PanelMessage text="carregando radar real…" />;
  if (isError || !stats?.hasData || stats.radar.length === 0) return <PanelMessage text="Radar indisponível — sem dados reais suficientes." />;

  return (
    <div className="rounded-xl border border-border bg-card/40 p-5">
      <div className="mb-2">
        <h2 className="text-sm font-semibold">DNA radar</h2>
        <p className="text-xs text-muted-foreground">Seu DNA real</p>
      </div>
      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={stats.radar} outerRadius="75%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="axis" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar name="Your DNA" dataKey="you" stroke="var(--brand-cyan)" fill="var(--brand-cyan)" fillOpacity={0.3} strokeWidth={2} isAnimationActive animationDuration={1400} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function PanelMessage({ text }: { text: string }) {
  return <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">{text}</div>;
}

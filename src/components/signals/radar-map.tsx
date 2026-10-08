import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { type Signal } from "@/lib/signals-data";

export function RadarMap({ signals }: { signals: Signal[] }) {
  const points = signals
    .filter((s) => s.rr != null && Number.isFinite(s.rr))
    .map((s) => ({ ...s, x: s.rr!, y: s.score }));
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[14px] font-medium">Radar Map</h3>
        <span className="text-[11px] text-muted-foreground">R/R × Score</span>
      </div>
      {points.length === 0 ? (
        <div className="h-[460px] flex items-center justify-center text-[12px] text-muted-foreground">R/R indisponível para os sinais atuais.</div>
      ) : (
        <div className="h-[460px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
              <CartesianGrid stroke="#1E2028" strokeDasharray="3 3" />
              <XAxis type="number" dataKey="x" name="R/R" domain={["auto", "auto"]} />
              <YAxis type="number" dataKey="y" name="Score" domain={[0, 100]} />
              <Tooltip content={({ payload }) => {
                if (!payload?.length) return null;
                const s = payload[0].payload as Signal & { x: number };
                return <div className="rounded-lg border border-border bg-card p-2.5 text-[11px]">
                  <div className="font-semibold">{s.asset} · {s.direction}</div>
                  <div>Score <span className="font-semibold">{s.score}</span></div>
                  <div>R/R <span className="font-semibold">{s.rr == null ? "—" : s.rr.toFixed(2)}</span></div>
                </div>;
              }} />
              <Scatter name="Sinais" data={points} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="text-[10px] text-muted-foreground mt-3">Sinais sem eixo R/R não são plotados.</div>
    </div>
  );
}

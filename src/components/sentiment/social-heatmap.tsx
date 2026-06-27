import { HEATMAP } from "@/lib/sentiment-data";

function bg(v: number) {
  if (v >= 80) return "oklch(0.62 0.18 200)";
  if (v >= 60) return "oklch(0.52 0.15 210)";
  if (v >= 40) return "oklch(0.42 0.11 220)";
  if (v >= 20) return "oklch(0.32 0.07 230)";
  return "oklch(0.24 0.04 240)";
}

export function SocialHeatmap() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold">Social Volume Heatmap</h3>
          <p className="text-[11px] text-muted-foreground">Mentions per asset · hourly UTC</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Low</span>
          {[10, 35, 55, 75, 90].map((v) => (
            <span key={v} className="size-3 rounded-sm" style={{ background: bg(v) }} />
          ))}
          <span>High</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="border-separate border-spacing-[2px] min-w-[760px]">
          <thead>
            <tr>
              <th className="w-12"></th>
              {Array.from({ length: 24 }, (_, h) => (
                <th key={h} className="text-[9px] text-muted-foreground font-medium w-6">
                  {h.toString().padStart(2, "0")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP.map((row) => (
              <tr key={row.asset}>
                <td className="text-xs font-medium text-foreground/80 pr-2">{row.asset}</td>
                {row.hours.map((v, h) => (
                  <td key={h}>
                    <div
                      className="w-6 h-6 rounded-sm transition-transform hover:scale-150 hover:z-10 relative cursor-default"
                      style={{ background: bg(v) }}
                      title={`${row.asset} — ${h.toString().padStart(2, "0")}:00 UTC: ${(v * 480).toLocaleString()} mentions`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

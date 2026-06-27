import { ASSETS } from "@/lib/sentiment-data";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const trendIcon: Record<string, string> = { up: "↑", upup: "↑↑", flat: "→", down: "↓" };
const trendColor: Record<string, string> = {
  up: "text-emerald-300", upup: "text-emerald-300", flat: "text-muted-foreground", down: "text-red-300",
};

export function AssetSentimentTable() {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4">
      <h3 className="text-sm font-semibold mb-3">Asset Sentiment</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-muted-foreground text-left">
              <th className="py-2 font-medium">Asset</th>
              <th className="font-medium">Social</th>
              <th className="font-medium">News</th>
              <th className="font-medium">On-chain</th>
              <th className="font-medium">Overall</th>
              <th className="font-medium">7d Trend</th>
              <th className="font-medium text-right">Signal</th>
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((a) => (
              <tr key={a.asset} className="border-t border-border/60 hover:bg-secondary/30">
                <td className="py-2.5 font-semibold">{a.asset}</td>
                <td className="tabular-nums">{a.social}</td>
                <td className="tabular-nums">{a.news}</td>
                <td className="tabular-nums">{a.onchain}</td>
                <td className="tabular-nums font-semibold">{a.overall}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <span className={`text-base ${trendColor[a.trend]}`}>{trendIcon[a.trend]}</span>
                    <div className="w-16 h-6">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={a.spark.map((v, i) => ({ i, v }))}>
                          <Line
                            type="monotone" dataKey="v"
                            stroke={a.trend === "down" ? "#ef4444" : a.trend === "flat" ? "#94a3b8" : "#22d3ee"}
                            strokeWidth={1.5} dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </td>
                <td className="text-right">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    a.signal === "BULLISH" ? "bg-emerald-500/15 text-emerald-300"
                    : a.signal === "BEARISH" ? "bg-red-500/15 text-red-300"
                    : "bg-secondary text-muted-foreground"
                  }`}>{a.signal}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

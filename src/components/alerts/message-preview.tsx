import { useAlertsStore } from "@/lib/alerts-store";
import { Send } from "lucide-react";

export function MessagePreview() {
  const { minScore, frequency, types, assets, channels, quietHours, bot4x } = useAlertsStore();
  const enabledTypes = Object.entries(types).filter(([, v]) => v).length;
  const stamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-lg border border-border bg-card/40 overflow-hidden sticky top-16">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="size-4 text-[#229ED9]" />
          <span className="text-[13px] font-medium">Live preview</span>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Telegram</span>
      </div>

      <div className="p-4 bg-[#0e1621]">
        <div className="max-w-[280px] rounded-2xl rounded-tl-sm bg-[#182533] px-3 py-2.5 text-[13px] text-white space-y-1.5 font-sans">
          <div className="flex items-center gap-1.5">
            <span className="text-[#56a3eb] font-semibold">🎯 AISignalRadar</span>
            <span className="text-[10px] text-white/50">· bot</span>
          </div>
          <div className="font-semibold text-emerald-400">▲ BUY · BTC/USDT</div>
          <div className="text-white/90 leading-relaxed font-mono text-[11.5px]">
            Score: <b>87</b> · TF: 4H
            <br />
            Entry: <b>43,240</b>
            <br />
            SL: 42,910 · TP1: 43,820
            <br />
            R/R: 1:1.8
          </div>
          <div className="text-[11px] text-white/60 border-t border-white/10 pt-1.5 mt-1.5">
            Reason: Liquidity sweep + bullish OB retest
          </div>
          <div className="flex items-center justify-end gap-1 text-[10px] text-white/40 -mb-1">
            {stamp} <span className="text-[#56a3eb]">✓✓</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 border-t border-border space-y-1.5 text-xs text-muted-foreground">
        <Row label="Min score" value={`≥ ${minScore}`} />
        <Row label="Frequency" value={frequency === "realtime" ? "Real-time" : frequency === "15min" ? "Every 15m" : frequency === "hourly" ? "Hourly" : "Daily digest"} />
        <Row label="Alert types" value={`${enabledTypes} enabled`} />
        <Row label="Assets" value={assets.length ? assets.join(", ") : "All"} />
        <Row label="Quiet hours" value={quietHours.on ? `${quietHours.from} – ${quietHours.to}` : "Off"} />
        <Row label="Bot4x alerts" value={bot4x ? "Included" : "Excluded"} />
        <Row label="Channels" value={Object.entries(channels).filter(([, c]) => c.on).map(([k]) => k).join(", ") || "None"} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-foreground font-medium truncate max-w-[55%] text-right">{value}</span>
    </div>
  );
}

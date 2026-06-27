import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, TrendingDown, TrendingUp, X } from "lucide-react";
import { ASSETS } from "@/lib/sentiment-data";

type Shift = { asset: string; before: number; after: number; delta: number; ts: number };

// Simulates a streaming sentiment shift detector. Fires when any asset's
// overall score moves >10 points within a 1h window. Mock cadence in MVP.
export function SentimentShiftAlert() {
  const [active, setActive] = useState<Shift | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    const candidates: Shift[] = [
      { asset: "SOL", before: 62, after: 75, delta: 13, ts: Date.now() },
      { asset: "AVAX", before: 64, after: 52, delta: -12, ts: Date.now() },
      { asset: "BTC", before: 66, after: 77, delta: 11, ts: Date.now() },
    ].filter((c) => ASSETS.some((a) => a.asset === c.asset));

    const t = setTimeout(() => {
      if (fired.current) return;
      fired.current = true;
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      setActive(pick);
      const dir = pick.delta > 0 ? "↑" : "↓";
      toast(`Sentiment shift: ${pick.asset} ${dir} ${Math.abs(pick.delta)} pts in 1h`, {
        description: `Overall score ${pick.before} → ${pick.after}. Push notification sent to subscribed channels.`,
        icon: <Bell className="size-4" />,
        duration: 8000,
      });
    }, 3500);

    return () => clearTimeout(t);
  }, []);

  if (!active) return null;

  const positive = active.delta > 0;
  const Icon = positive ? TrendingUp : TrendingDown;

  return (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center gap-3 animate-fade-in ${
        positive
          ? "border-emerald-500/40 bg-emerald-500/5"
          : "border-red-500/40 bg-red-500/5"
      }`}
    >
      <div className={`size-9 rounded-full flex items-center justify-center ${
        positive ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
      }`}>
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">Sentiment shift alert</span>
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${
            positive ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"
          }`}>
            {positive ? "Bullish swing" : "Bearish swing"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          <span className="font-semibold text-foreground">{active.asset}</span> moved{" "}
          <span className={positive ? "text-emerald-300" : "text-red-300"}>
            {positive ? "+" : ""}{active.delta} pts
          </span>{" "}
          in 1h ({active.before} → {active.after}). Push notification triggered for subscribed channels.
        </p>
      </div>
      <button
        onClick={() => setActive(null)}
        className="size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

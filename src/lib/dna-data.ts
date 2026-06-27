export type Gauge = { label: string; value: number };
export type RadarPoint = { axis: string; you: number; bench: number };
export type Insight = {
  tone: "good" | "bad" | "warn";
  icon: string;
  title: string;
  desc: string;
  action: string;
};
export type Stat = { icon: string; value: string; label: string; trend?: string; trendUp?: boolean };
export type EvolutionPoint = { month: string; overall: number; emotional: number; note?: string };

export const GAUGES: Gauge[] = [
  { label: "Consistency", value: 78 },
  { label: "Discipline", value: 65 },
  { label: "Risk Control", value: 82 },
  { label: "Timing", value: 71 },
  { label: "Emotional Control", value: 58 },
];

export const RADAR: RadarPoint[] = [
  { axis: "Win Rate", you: 67, bench: 72 },
  { axis: "Avg R/R", you: 74, bench: 80 },
  { axis: "Consistency", you: 78, bench: 85 },
  { axis: "Drawdown Ctrl", you: 82, bench: 88 },
  { axis: "Timing", you: 71, bench: 78 },
  { axis: "Volume Disc.", you: 60, bench: 82 },
];

export const STATS: Stat[] = [
  { icon: "Target", value: "67%", label: "Win Rate", trend: "+3% this month", trendUp: true },
  { icon: "Clock", value: "4H", label: "Best Timeframe", trend: "74% win rate", trendUp: true },
  { icon: "Sparkles", value: "BOS + OB", label: "Best Setup", trend: "81% accuracy", trendUp: true },
  { icon: "Hourglass", value: "4h 23m", label: "Avg Hold Time", trend: "−12m vs last mo", trendUp: true },
  { icon: "Shield", value: "1.8%", label: "Risk per Trade", trend: "Within target", trendUp: true },
  { icon: "TrendingDown", value: "−12.4%", label: "Max Drawdown (90d)", trend: "+2.1% vs prev", trendUp: false },
];

export const INSIGHTS: Insight[] = [
  { tone: "good", icon: "TrendingUp", title: "Strong institutional timing", desc: "Your entries align with smart money zones 78% of the time.", action: "Keep prioritising HTF liquidity sweeps before entry." },
  { tone: "bad", icon: "Scissors", title: "Early exit syndrome", desc: "You close winners 40% before TP. Leaves ~1.2R on the table per trade.", action: "Set partial exits: 50% at 1R, runner to TP." },
  { tone: "bad", icon: "Flame", title: "Revenge trading detected", desc: "Win rate drops 31% after 2 consecutive losses.", action: "Auto-cooldown of 30min after 2 losses in a row." },
  { tone: "warn", icon: "CalendarClock", title: "Overtrading on Mondays", desc: "2.1x more trades, 22% lower win rate vs your weekly avg.", action: "Cap Monday exposure to 3 trades max." },
  { tone: "good", icon: "ShieldCheck", title: "Excellent risk control on 4H", desc: "Zero margin calls in 60 days. Stop discipline is on point.", action: "Apply same framework to 1H setups." },
  { tone: "warn", icon: "Newspaper", title: "News event sensitivity", desc: "Performance drops 18% around high-impact news.", action: "Avoid entries 15min before/after red-flag news." },
];

export const EVOLUTION: EvolutionPoint[] = [
  { month: "Dec", overall: 52, emotional: 38 },
  { month: "Jan", overall: 56, emotional: 42, note: "Started 4H focus" },
  { month: "Feb", overall: 61, emotional: 48 },
  { month: "Mar", overall: 66, emotional: 52, note: "Added R/R filter" },
  { month: "Apr", overall: 72, emotional: 55 },
  { month: "May", overall: 78, emotional: 58 },
];

// 90-day heatmap: -1 = loss, 0 = no trades, 1..4 = profit intensity
export function buildHeatmap(): { date: Date; value: number }[] {
  const out: { date: Date; value: number }[] = [];
  const today = new Date();
  let seed = 1337;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed % 1000) / 1000; };
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const day = d.getDay();
    const weekend = day === 0 || day === 6;
    const r = rnd();
    let v = 0;
    if (weekend && r > 0.85) v = 1;
    else if (!weekend) {
      if (r < 0.15) v = 0;
      else if (r < 0.30) v = -1;
      else if (r < 0.55) v = 1;
      else if (r < 0.80) v = 2;
      else if (r < 0.93) v = 3;
      else v = 4;
    }
    out.push({ date: d, value: v });
  }
  return out;
}

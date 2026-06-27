import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Calculator, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_CONFIG, type CopyConfig, type Trader } from "@/lib/copy-trading-data";
import { cn } from "@/lib/utils";

type Props = {
  trader: Trader | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (config: CopyConfig) => void;
};

export function CopyConfigModal({ trader, open, onOpenChange, onConfirm }: Props) {
  const [config, setConfig] = useState<CopyConfig>(DEFAULT_CONFIG);
  const [capital, setCapital] = useState(10000);

  useEffect(() => {
    if (open) setConfig(DEFAULT_CONFIG);
  }, [open]);

  const sim = useMemo(() => {
    if (!trader) return null;
    // Expected per-trade edge ≈ winRate*rr - (1-winRate). Cap risk via maxDailyLoss.
    const wr = trader.winRate / 100;
    const edge = wr * trader.rr - (1 - wr);
    const tradesPerMonth = Math.max(8, Math.round(trader.signals30d * 0.65));
    const monthlyPct = edge * config.riskPerTrade * tradesPerMonth;
    const monthlyPnl = capital * (monthlyPct / 100);
    const yearlyPnl = capital * (Math.pow(1 + monthlyPct / 100, 12) - 1);
    const ddRisk = capital * (trader.maxDrawdown / 100) * (config.riskPerTrade / 1);
    return {
      monthlyPct: +monthlyPct.toFixed(2),
      monthlyPnl: Math.round(monthlyPnl),
      yearlyPnl: Math.round(yearlyPnl),
      worstCase: Math.round(ddRisk),
    };
  }, [trader, config.riskPerTrade, capital]);

  if (!trader) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Copy {trader.handle}
            {trader.verified && <BadgeCheck className="size-4 text-[#5fa8ff]" />}
          </DialogTitle>
          <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
            <span>{trader.strategy}</span>
            <span>·</span>
            <span>{trader.winRate}% WR</span>
            <span>·</span>
            <span>{trader.rr.toFixed(1)} R/R</span>
            <span>·</span>
            <span className="text-emerald-400">+{trader.monthlyReturn}%/mo</span>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Field label="Risk per trade" value={`${config.riskPerTrade.toFixed(2)}%`}>
            <Slider
              value={[config.riskPerTrade]}
              min={0.5}
              max={5}
              step={0.25}
              onValueChange={([v]) => setConfig((c) => ({ ...c, riskPerTrade: v }))}
            />
          </Field>

          <Field label="Max simultaneous positions" value={String(config.maxPositions)}>
            <Slider
              value={[config.maxPositions]}
              min={1}
              max={10}
              step={1}
              onValueChange={([v]) => setConfig((c) => ({ ...c, maxPositions: v }))}
            />
          </Field>

          <Field label="Max daily loss" value={`${config.maxDailyLoss}%`}>
            <Slider
              value={[config.maxDailyLoss]}
              min={1}
              max={20}
              step={1}
              onValueChange={([v]) => setConfig((c) => ({ ...c, maxDailyLoss: v }))}
            />
          </Field>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Asset filter</label>
            <Select
              value={config.assetFilter}
              onValueChange={(v) => setConfig((c) => ({ ...c, assetFilter: v as CopyConfig["assetFilter"] }))}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assets</SelectItem>
                <SelectItem value="majors">Majors only (BTC, ETH)</SelectItem>
                <SelectItem value="alts">Altcoins only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {sim && (
            <div className="rounded-md border border-[#378ADD]/30 bg-gradient-to-br from-[#378ADD]/10 to-transparent p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Calculator className="size-3.5 text-[#5fa8ff]" />
                  <span className="text-sm font-medium">Simulate with your capital</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={100}
                    step={500}
                    value={capital}
                    onChange={(e) => setCapital(Math.max(100, Number(e.target.value) || 0))}
                    className="h-7 w-24 text-xs text-right tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SimStat
                  label="Est. monthly"
                  primary={`${sim.monthlyPct >= 0 ? "+" : ""}${sim.monthlyPct.toFixed(1)}%`}
                  secondary={`${sim.monthlyPnl >= 0 ? "+" : ""}$${Math.abs(sim.monthlyPnl).toLocaleString()}`}
                  tone={sim.monthlyPct >= 0 ? "pos" : "neg"}
                />
                <SimStat
                  label="Projected yearly"
                  primary={`${sim.yearlyPnl >= 0 ? "+" : ""}$${Math.abs(sim.yearlyPnl).toLocaleString()}`}
                  secondary="compounded"
                  tone={sim.yearlyPnl >= 0 ? "pos" : "neg"}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-border/60">
                <span className="text-muted-foreground">Worst-case drawdown</span>
                <span className="text-red-400 tabular-nums">-${sim.worstCase.toLocaleString()}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
                Projection based on historical win rate & R/R. Past performance does not guarantee future results.
              </p>
            </div>
          )}


          <div className="flex items-start gap-3 rounded-md border border-border bg-secondary/30 p-3">
            <Lock className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium">Auto-execute</label>
                <Switch checked={false} disabled />
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Coming soon
                </span>
                <span className="text-[11px] text-muted-foreground">Real execution under audit.</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-[#378ADD] hover:bg-[#2d74bd] text-white" onClick={() => onConfirm(config)}>
            Start copying
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, children }: { label: string; value: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground">{label}</label>
        <span className="text-xs font-mono tabular-nums text-foreground">{value}</span>
      </div>
      {children}
    </div>
  );
}

function SimStat({ label, primary, secondary, tone }: { label: string; primary: string; secondary: string; tone: "pos" | "neg" }) {
  return (
    <div className="rounded bg-card/60 border border-border/60 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-base font-semibold tabular-nums mt-0.5", tone === "pos" ? "text-emerald-400" : "text-red-400")}>{primary}</div>
      <div className="text-[10.5px] text-muted-foreground tabular-nums">{secondary}</div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useProfileStore, type Market, type Timeframe, type RiskProfile, type Experience } from "@/lib/profile-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MARKETS: Market[] = ["Crypto", "Forex", "Stocks", "Indices", "Futures"];
const TFS: Timeframe[] = ["1m", "5m", "15m", "1H", "4H", "1D"];
const RISKS: RiskProfile[] = ["Conservative", "Moderate", "Aggressive"];
const EXPS: Experience[] = ["Beginner", "Intermediate", "Advanced", "Professional"];
const EXCHANGES = ["Binance", "Bybit", "OKX", "Kraken", "Coinbase"];

export function TradingPreferences() {
  const { prefs, toggleMarket, toggleTimeframe, setPrefs } = useProfileStore();
  const [saved, setSaved] = useState(false);
  const firstRun = useRef(true);

  // Auto-save indicator
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [prefs]);

  return (
    <section className="rounded-xl border border-border bg-card/40 p-5">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Trading preferences</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-saved as you change them.</p>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[11px] transition-opacity ${
            saved ? "opacity-100 text-emerald-400" : "opacity-0"
          }`}
        >
          <Check className="size-3" /> Saved
        </span>
      </header>

      <div className="space-y-5">
        <Group label="Primary markets" hint="Multi-select">
          <Pills items={MARKETS} active={prefs.markets} onToggle={(v) => toggleMarket(v as Market)} />
        </Group>

        <Group label="Preferred timeframes" hint="Multi-select">
          <Pills items={TFS} active={prefs.timeframes} onToggle={(v) => toggleTimeframe(v as Timeframe)} mono />
        </Group>

        <Group label="Risk profile">
          <Pills
            items={RISKS}
            active={[prefs.risk]}
            onToggle={(v) => setPrefs({ risk: v as RiskProfile })}
          />
        </Group>

        <Group label="Experience">
          <Pills
            items={EXPS}
            active={[prefs.experience]}
            onToggle={(v) => setPrefs({ experience: v as Experience })}
          />
        </Group>

        <Group label="Default exchange">
          <div className="max-w-xs">
            <Select value={prefs.defaultExchange} onValueChange={(v) => setPrefs({ defaultExchange: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EXCHANGES.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Group>
      </div>
    </section>
  );
}

function Group({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[12px] text-muted-foreground mb-2">
        {label} {hint && <span className="text-muted-foreground/60">· {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Pills({
  items,
  active,
  onToggle,
  mono,
}: {
  items: readonly string[];
  active: readonly string[];
  onToggle: (v: string) => void;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v) => {
        const on = active.includes(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => onToggle(v)}
            className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
              mono ? "font-mono" : "font-medium"
            } ${
              on
                ? "bg-[var(--brand-cyan)]/15 border-[var(--brand-cyan)]/50 text-foreground"
                : "bg-card/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}

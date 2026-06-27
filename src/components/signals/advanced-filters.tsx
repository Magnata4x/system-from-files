import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSignalsStore } from "@/lib/signals-store";

const setups = ["BOS+OB", "CHoCH+FVG", "VWAP", "S/R", "Breakout", "Reversal"];
const sessions = ["All", "Asia", "London", "NY"] as const;

export function AdvancedFiltersDrawer() {
  const { advOpen, toggleAdv, filters, setFilter } = useSignalsStore();
  return (
    <AnimatePresence>
      {advOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleAdv}
            className="fixed inset-0 bg-black/40 z-40"
          />
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed right-0 top-0 bottom-0 w-[320px] bg-card border-l border-border z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
              <h3 className="text-[14px] font-medium text-foreground">Advanced Filters</h3>
              <button onClick={toggleAdv} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              <Section title="Score Range">
                <DualRange
                  value={filters.scoreRange}
                  onChange={(v) => setFilter("scoreRange", v)}
                />
                <div className="flex justify-between text-[11px] text-muted-foreground tabular-nums mt-1">
                  <span>{filters.scoreRange[0]}</span>
                  <span>{filters.scoreRange[1]}</span>
                </div>
              </Section>

              <Section title={`Min R/R: ${filters.minRR.toFixed(1)}`}>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.1}
                  value={filters.minRR}
                  onChange={(e) => setFilter("minRR", Number(e.target.value))}
                  className="w-full accent-[var(--brand-cyan)]"
                />
              </Section>

              <Section title="Manipulation risk">
                {(["low", "medium", "high"] as const).map((k) => (
                  <Check
                    key={k}
                    label={k.charAt(0).toUpperCase() + k.slice(1)}
                    checked={filters.manipRisk[k]}
                    onChange={(c) => setFilter("manipRisk", { ...filters.manipRisk, [k]: c })}
                  />
                ))}
              </Section>

              <Section title="Volatility">
                {(["low", "med", "high"] as const).map((k) => (
                  <Check
                    key={k}
                    label={k === "med" ? "Medium" : k.charAt(0).toUpperCase() + k.slice(1)}
                    checked={filters.volatility[k]}
                    onChange={(c) => setFilter("volatility", { ...filters.volatility, [k]: c })}
                  />
                ))}
              </Section>

              <Section title="Setup type">
                {setups.map((s) => (
                  <Check
                    key={s}
                    label={s}
                    checked={!!filters.setups[s]}
                    onChange={(c) => setFilter("setups", { ...filters.setups, [s]: c })}
                  />
                ))}
              </Section>

              <Section title="Session">
                <div className="flex gap-1">
                  {sessions.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilter("session", s)}
                      className={`flex-1 h-8 rounded-md text-[12px] border transition-colors ${
                        filters.session === s
                          ? "border-[var(--brand-cyan)] bg-[color-mix(in_oklab,var(--brand-cyan)_15%,transparent)] text-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </Section>

              <Section title="DNA Compatibility">
                <label className="flex items-center justify-between text-[12px] text-foreground cursor-pointer">
                  <span>DNA compat ≥ 70%</span>
                  <input
                    type="checkbox"
                    checked={filters.dnaCompat70}
                    onChange={(e) => setFilter("dnaCompat70", e.target.checked)}
                    className="accent-[var(--brand-cyan)]"
                  />
                </label>
              </Section>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-[var(--brand-cyan)]"
      />
      {label}
    </label>
  );
}

function DualRange({ value, onChange }: { value: [number, number]; onChange: (v: [number, number]) => void }) {
  return (
    <div className="flex gap-2">
      <input
        type="range"
        min={0}
        max={100}
        value={value[0]}
        onChange={(e) => onChange([Math.min(Number(e.target.value), value[1]), value[1]])}
        className="flex-1 accent-[var(--brand-cyan)]"
      />
      <input
        type="range"
        min={0}
        max={100}
        value={value[1]}
        onChange={(e) => onChange([value[0], Math.max(Number(e.target.value), value[0])])}
        className="flex-1 accent-[var(--brand-cyan)]"
      />
    </div>
  );
}

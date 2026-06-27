import { useDashboardStore } from "@/lib/dashboard-store";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Activity, Bell, Brain, Flame, BarChart3, Calendar, ArrowRight } from "lucide-react";

const QUICK_ACTIONS = [
  { id: "qa1", icon: Bell, label: "Create new alert", hint: "Alerts" },
  { id: "qa2", icon: Activity, label: "Browse all signals", hint: "Signals" },
  { id: "qa3", icon: Brain, label: "Open DNA report", hint: "DNA" },
  { id: "qa4", icon: Flame, label: "Open asset heatmap", hint: "Markets" },
  { id: "qa5", icon: BarChart3, label: "Performance breakdown", hint: "Stats" },
  { id: "qa6", icon: Calendar, label: "Upcoming events", hint: "Calendar" },
];

const ASSETS = ["BTC/USDT", "ETH/USDT", "SOL/USDT", "BNB/USDT", "LINK/USDT", "AVAX/USDT", "MATIC/USDT", "ARB/USDT"];

const RECENT = ["BTC liquidity sweep", "ETH 4H setup", "Funding rate", "Open interest"];

export function CommandPalette() {
  const open = useDashboardStore((s) => s.cmdkOpen);
  const setOpen = useDashboardStore((s) => s.setCmdkOpen);
  const [q, setQ] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const term = q.toLowerCase();
  const filteredActions = QUICK_ACTIONS.filter((a) => a.label.toLowerCase().includes(term));
  const filteredAssets = ASSETS.filter((a) => a.toLowerCase().includes(term));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="w-full max-w-[600px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
              <Search className="size-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search signals, assets, actions..."
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[11px] text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto py-2">
              {q === "" && (
                <Group label="Recent">
                  {RECENT.map((r) => (
                    <Row key={r} icon={<Search className="size-4 text-muted-foreground" />} label={r} />
                  ))}
                </Group>
              )}
              {filteredActions.length > 0 && (
                <Group label="Quick actions">
                  {filteredActions.map((a) => (
                    <Row key={a.id} icon={<a.icon className="size-4 text-[var(--brand-cyan)]" />} label={a.label} hint={a.hint} />
                  ))}
                </Group>
              )}
              {filteredAssets.length > 0 && (
                <Group label="Assets">
                  {filteredAssets.map((a) => (
                    <Row key={a} icon={<span className="text-[11px] font-semibold text-muted-foreground w-4">$</span>} label={a} hint="Open chart" />
                  ))}
                </Group>
              )}
              {filteredActions.length === 0 && filteredAssets.length === 0 && q !== "" && (
                <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No results for "{q}"</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Row({ icon, label, hint }: { icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <button className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/70 transition-colors group">
      {icon}
      <span className="text-[13px] text-foreground flex-1">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
    </button>
  );
}

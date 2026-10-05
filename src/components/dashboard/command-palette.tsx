import { useDashboardStore } from "@/lib/dashboard-store";
import { useMarketData } from "@/lib/market-data-store";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Activity, Bell, Brain, Flame, BarChart3, ArrowRight } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

const QUICK_ACTIONS = [
  { id: "qa1", icon: Bell, label: "Configurar alerta", hint: "Alertas", to: "/alerts" },
  { id: "qa2", icon: Activity, label: "Ver todos os sinais", hint: "Sinais", to: "/signals" },
  { id: "qa3", icon: Brain, label: "Abrir relatório DNA", hint: "DNA", to: "/dna-trader" },
  { id: "qa4", icon: Flame, label: "Abrir manipulação", hint: "Manipulação", to: "/manipulation" },
  { id: "qa5", icon: BarChart3, label: "Análise de desempenho", hint: "DNA", to: "/dna-trader" },
];

export function CommandPalette() {
  const open = useDashboardStore((s) => s.cmdkOpen);
  const setOpen = useDashboardStore((s) => s.setCmdkOpen);
  const signals = useDashboardStore((s) => s.signals);
  const setSelectedSignal = useDashboardStore((s) => s.setSelectedSignal);
  const { prices } = useMarketData();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) {
      setQ("");
      setSelectedIndex(0);
      return;
    }
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const term = q.toLowerCase();
  const filteredActions = QUICK_ACTIONS.filter(
    (a) => a.label.toLowerCase().includes(term) || a.hint.toLowerCase().includes(term),
  );
  const filteredSignals = signals.filter((s) =>
    [s.asset, s.direction, s.tf].some((value) => value.toLowerCase().includes(term)),
  );
  const filteredAssets = Object.values(prices).filter((p) =>
    [p.pair, p.symbol, p.name].some((value) => value.toLowerCase().includes(term)),
  );
  const results = [
    ...filteredActions.map((a) => ({ id: a.id, kind: "action" as const, run: () => run(a.to) })),
    ...filteredSignals.map((s) => ({ id: `signal-${s.id}`, kind: "signal" as const, run: () => {
      setOpen(false);
      setSelectedSignal(s);
    }})),
    ...filteredAssets.map((a) => ({ id: `asset-${a.id}`, kind: "asset" as const, run: () => run("/sentiment") })),
  ];

  useEffect(() => {
    setSelectedIndex((index) => Math.min(index, Math.max(results.length - 1, 0)));
  }, [results.length, q]);

  useEffect(() => {
    if (!open) return;
    function onDialogKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (results.length === 0) return;
        e.preventDefault();
        setSelectedIndex((index) =>
          e.key === "ArrowDown"
            ? (index + 1) % results.length
            : (index - 1 + results.length) % results.length,
        );
      }
      if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        results[selectedIndex].run();
      }
      if (e.key === "Tab") {
        const root = dialogRef.current;
        if (!root) return;
        const focusable = root.querySelectorAll<HTMLElement>("button, input, [tabindex]:not([tabindex='-1'])");
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onDialogKey);
    return () => window.removeEventListener("keydown", onDialogKey);
  }, [open, results, selectedIndex]);

  function run(to: string) {
    setOpen(false);
    navigate({ to });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        >
          <motion.div
            ref={dialogRef}
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="command-palette-title"
            className="w-full max-w-[600px] rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="command-palette-title" className="sr-only">Paleta de comandos</h2>
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border">
              <Search className="size-4 text-muted-foreground" aria-hidden="true" />
              <input
                ref={inputRef}
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Pesquisar sinais, ativos e ações…"
                aria-label="Pesquisar na paleta de comandos"
                aria-controls="command-palette-results"
                aria-activedescendant={results[selectedIndex] ? `command-option-${results[selectedIndex].id}` : undefined}
                className="flex-1 bg-transparent text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
              />
              <kbd className="px-1.5 py-0.5 rounded border border-border bg-secondary text-[11px] text-muted-foreground">ESC</kbd>
            </div>
            <div id="command-palette-results" className="max-h-[60vh] overflow-y-auto py-2" role="listbox" aria-label="Resultados da busca">
              {filteredActions.length > 0 && (
                <Group label="Ações rápidas">
                  {filteredActions.map((a) => {
                    const index = results.findIndex((r) => r.id === a.id);
                    return <Row key={a.id} id={a.id} index={index} selected={selectedIndex === index} icon={<a.icon className="size-4 text-[var(--brand-cyan)]" aria-hidden="true" />} label={a.label} hint={a.hint} onClick={() => run(a.to)} />;
                  })}
                </Group>
              )}
              {filteredSignals.length > 0 && (
                <Group label="Sinais reais">
                  {filteredSignals.map((s) => {
                    const id = `signal-${s.id}`;
                    const index = results.findIndex((r) => r.id === id);
                    return <Row key={s.id} id={id} index={index} selected={selectedIndex === index} icon={<Activity className="size-4 text-[var(--brand-cyan)]" aria-hidden="true" />} label={s.asset} hint={s.direction + " · score " + s.score} onClick={() => { setOpen(false); setSelectedSignal(s); }} />;
                  })}
                </Group>
              )}
              {filteredAssets.length > 0 && (
                <Group label="Ativos reais">
                  {filteredAssets.map((a) => {
                    const id = `asset-${a.id}`;
                    const index = results.findIndex((r) => r.id === id);
                    return <Row key={a.id} id={id} index={index} selected={selectedIndex === index} icon={<span className="text-[11px] font-semibold text-muted-foreground w-4" aria-hidden="true">$</span>} label={a.pair} hint={a.symbol} onClick={() => run("/sentiment")} />;
                  })}
                </Group>
              )}
              {results.length === 0 && q !== "" && (
                <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">Nenhum resultado para "{q}".</div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-1"><div className="px-4 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>{children}</div>;
}

function Row({ id, index, selected, icon, label, hint, onClick }: { id: string; index: number; selected: boolean; icon: React.ReactNode; label: string; hint?: string; onClick?: () => void }) {
  return (
    <button
      id={`command-option-${id}`}
      role="option"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors group ${selected ? "bg-secondary/70" : "hover:bg-secondary/70"}`}
      onMouseEnter={() => void index}
    >
      {icon}
      <span className="text-[13px] text-foreground flex-1">{label}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      <ArrowRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" aria-hidden="true" />
    </button>
  );
}

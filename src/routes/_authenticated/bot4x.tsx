import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { useBot4xStore } from "@/lib/bot4x-store";
import { Bot4xHeader } from "@/components/bot4x/page-header";
import { TabPainel } from "@/components/bot4x/tab-painel";
import { TabCalibrador } from "@/components/bot4x/tab-calibrador";
import { TabMonitor } from "@/components/bot4x/tab-monitor";
import { TabHistorico } from "@/components/bot4x/tab-historico";

export const Route = createFileRoute("/_authenticated/bot4x")({
  head: () => ({
    meta: [
      { title: "Bot4x — AISignalRadar" },
      { name: "description", content: "Motor de execução algorítmica com calibração e circuit breakers." },
    ],
  }),
  component: Bot4xPage,
});

type Tab = "painel" | "calibrador" | "monitor" | "historico";

const TABS: { id: Tab; label: string }[] = [
  { id: "painel", label: "Painel" },
  { id: "calibrador", label: "Calibrador" },
  { id: "monitor", label: "Monitor" },
  { id: "historico", label: "Histórico" },
];

function Bot4xPage() {
  const init = useBot4xStore((s) => s.init);
  const cleanup = useBot4xStore((s) => s.cleanup);
  const breakerTriggered = useBot4xStore((s) => s.dailyPnlPct <= -1.5);
  const [tab, setTab] = useState<Tab>("painel");

  useEffect(() => {
    init();
    return () => cleanup();
  }, [init, cleanup]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-[1200px] mx-auto p-5 space-y-5">
            <Bot4xHeader />
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur flex items-center gap-1 border-b border-border -mx-5 px-5">
              {TABS.map((t) => {
                const active = tab === t.id;
                const showBreaker = t.id === "painel" && breakerTriggered;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors ${
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {t.label}
                      {showBreaker && (
                        <span className="relative flex size-2" title="Circuit breaker triggered">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-[#E24B4A] opacity-75 animate-ping" />
                          <span className="relative inline-flex size-2 rounded-full bg-[#E24B4A]" />
                        </span>
                      )}
                    </span>
                    {active && (
                      <motion.div
                        layoutId="bot4x-tab"
                        className="absolute left-0 right-0 -bottom-px h-0.5 bg-[var(--brand-cyan)]"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 28 }}
              >
                {tab === "painel" && <TabPainel />}
                {tab === "calibrador" && <TabCalibrador />}
                {tab === "monitor" && <TabMonitor />}
                {tab === "historico" && <TabHistorico />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

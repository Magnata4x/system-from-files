import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { FilterBar } from "@/components/signals/filter-bar";
import { StatsBar } from "@/components/signals/stats-bar";
import { AdvancedFiltersDrawer } from "@/components/signals/advanced-filters";
import { CardGrid } from "@/components/signals/card-grid";
import { TableView } from "@/components/signals/table-view";
import { RadarMap } from "@/components/signals/radar-map";
import { QuickViewPanel } from "@/components/signals/quick-view-panel";
import { SignalToasts } from "@/components/signals/signal-toasts";
import { SignalStream } from "@/components/signals/signal-stream";
import { SignalDetailDrawer } from "@/components/signals/signal-detail-drawer";
import { useSignalsStore, useFilteredSignals } from "@/lib/signals-store";
import { useBot4xStore } from "@/lib/bot4x-store";
import { bot4xEligibility } from "@/lib/bot4x-eligibility";

export const Route = createFileRoute("/_authenticated/signals")({
  head: () => ({
    meta: [
      { title: "Signal Radar — AISignalRadar" },
      { name: "description", content: "Live institutional trading signals across crypto, forex, indices, and stocks." },
    ],
  }),
  component: SignalsPage,
});

function SignalsPage() {
  const init = useSignalsStore((s) => s.init);
  const cleanup = useSignalsStore((s) => s.cleanup);
  const view = useSignalsStore((s) => s.view);
  const setView = useSignalsStore((s) => s.setView);
  const toggleAdv = useSignalsStore((s) => s.toggleAdv);
  const setLive = useSignalsStore((s) => s.setLive);
  const live = useSignalsStore((s) => s.live);
  const pin = useSignalsStore((s) => s.pin);
  const bot4xOnly = useSignalsStore((s) => s.filters.bot4xOnly);
  const bot4xMode = useBot4xStore((s) => s.mode);
  const bot4xProfile = useBot4xStore((s) => s.profile);
  const bot4xPnl = useBot4xStore((s) => s.dailyPnlPct);
  const filteredBase = useFilteredSignals();
  const filtered = bot4xOnly
    ? filteredBase.filter(
        (sig) => bot4xEligibility(sig, { mode: bot4xMode, profile: bot4xProfile, dailyPnlPct: bot4xPnl }) === "EXECUTAR",
      )
    : filteredBase;

  useEffect(() => {
    init();
    return () => cleanup();
  }, [init, cleanup]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        document.querySelector<HTMLInputElement>("input[placeholder^='Search asset']")?.focus();
      } else if (e.key.toLowerCase() === "f") {
        toggleAdv();
      } else if (e.key.toLowerCase() === "g") {
        setView(view === "cards" ? "table" : view === "table" ? "radar" : "cards");
      } else if (e.key.toLowerCase() === "l") {
        setLive(!live);
      } else if (e.key === "Escape") {
        pin(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, live, toggleAdv, setView, setLive, pin]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <SignalStream />
        <div className="flex-1 min-w-0">
          <FilterBar />
          <StatsBar />
          <div className="flex">
            <main className="flex-1 min-w-0 p-5">
              {view === "cards" && <CardGrid signals={filtered} />}
              {view === "table" && <TableView signals={filtered} />}
              {view === "radar" && <RadarMap signals={filtered} />}
            </main>
            <QuickViewPanel />
          </div>
        </div>
      </div>
      <AdvancedFiltersDrawer />
      <SignalDetailDrawer />
      <SignalToasts />
    </div>
  );
}

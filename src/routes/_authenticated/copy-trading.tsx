import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { StatsRow } from "@/components/copy-trading/stats-row";
import { Leaderboard } from "@/components/copy-trading/leaderboard";
import { CopyConfigModal } from "@/components/copy-trading/copy-config-modal";
import { MyCopies } from "@/components/copy-trading/my-copies";
import { PerformanceChart } from "@/components/copy-trading/performance-chart";
import { TopCopiers } from "@/components/copy-trading/top-copiers";
import { INITIAL_COPIES, type ActiveCopy, type CopyConfig, type Trader } from "@/lib/copy-trading-data";

export const Route = createFileRoute("/_authenticated/copy-trading")({
  head: () => ({
    meta: [
      { title: "Copy Trading — AISignalRadar" },
      { name: "description", content: "Follow top-performing traders, configure risk parameters and mirror their signals with full control." },
      { property: "og:title", content: "AISignalRadar Copy Trading" },
      { property: "og:description", content: "Leaderboard, risk-aware copy config and performance comparison vs manual trading." },
    ],
  }),
  component: CopyTradingPage,
});

function CopyTradingPage() {
  const [copies, setCopies] = useState<ActiveCopy[]>(INITIAL_COPIES);
  const [selected, setSelected] = useState<Trader | null>(null);
  const [open, setOpen] = useState(false);

  const copiedIds = useMemo(() => new Set(copies.map((c) => c.traderId)), [copies]);

  function openCopy(t: Trader) {
    setSelected(t);
    setOpen(true);
  }

  function confirmCopy(config: CopyConfig) {
    if (!selected) return;
    setCopies((p) => [
      ...p,
      {
        traderId: selected.id,
        config,
        pnl: 0,
        trades: 0,
        winRate: 0,
        since: new Date().toISOString().slice(0, 10),
      },
    ]);
    toast.success(`Now copying ${selected.handle}`, {
      description: `Risk ${config.riskPerTrade.toFixed(2)}% · max ${config.maxPositions} positions`,
    });
    setOpen(false);
  }

  function stopCopy(traderId: string) {
    setCopies((p) => p.filter((c) => c.traderId !== traderId));
    toast("Stopped copying", { description: "Open positions will be closed at next opportunity." });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-5 py-8 space-y-10">
            <header>
              <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight">Copy Trading</h1>
              <p className="text-sm text-muted-foreground mt-1">Mirror signals from top performers — you stay in control of risk.</p>
            </header>
            <StatsRow />
            <Leaderboard onCopy={openCopy} copiedIds={copiedIds} />
            <PerformanceChart />
            <MyCopies copies={copies} onStop={stopCopy} />
            <TopCopiers />
          </div>
        </main>
      </div>
      <CopyConfigModal trader={selected} open={open} onOpenChange={setOpen} onConfirm={confirmCopy} />
    </div>
  );
}

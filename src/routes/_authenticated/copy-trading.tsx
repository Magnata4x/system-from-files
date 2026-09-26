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
import { type ActiveCopy, type CopyConfig, type Trader } from "@/lib/copy-trading-data";
import { useCopyFollows, useFollowTrader, useUnfollowTrader } from "@/hooks/useCopyFollows";

export const Route = createFileRoute("/_authenticated/copy-trading")({
  head: () => ({
    meta: [
      { title: "Copy Trading — AISignalRadar" },
      {
        name: "description",
        content:
          "Follow top-performing traders, configure risk parameters and mirror their signals with full control.",
      },
      { property: "og:title", content: "AISignalRadar Copy Trading" },
      {
        property: "og:description",
        content:
          "Leaderboard, risk-aware copy config and performance comparison vs manual trading.",
      },
    ],
  }),
  component: CopyTradingPage,
});

function CopyTradingPage() {
  const { data: follows, isPending, isError, refetch } = useCopyFollows();
  const follow = useFollowTrader();
  const unfollow = useUnfollowTrader();
  const [selected, setSelected] = useState<Trader | null>(null);
  const [open, setOpen] = useState(false);

  const copies: ActiveCopy[] = useMemo(
    () =>
      (follows ?? []).map((f) => ({
        traderId: f.traderId,
        config: f.config as CopyConfig,
        pnl: f.pnl,
        trades: f.trades,
        winRate: f.winRate,
        since: (f.since ?? "").slice(0, 10),
      })),
    [follows],
  );

  const copiedIds = useMemo(() => new Set(copies.map((c) => c.traderId)), [copies]);

  function openCopy(t: Trader) {
    setSelected(t);
    setOpen(true);
  }

  function confirmCopy(config: CopyConfig) {
    if (!selected) return;
    const trader = selected;
    follow.mutate(
      { traderId: trader.id, traderHandle: trader.handle, config },
      {
        onSuccess: () =>
          toast.success(`Copiando ${trader.handle}`, {
            description: `Risco ${config.riskPerTrade.toFixed(2)}% · máx ${config.maxPositions} posições`,
          }),
        onError: () => toast.error("Não foi possível salvar essa cópia. Tente novamente."),
      },
    );
    setOpen(false);
  }

  function stopCopy(traderId: string) {
    unfollow.mutate(traderId, {
      onSuccess: () =>
        toast("Cópia encerrada", {
          description: "As posições abertas serão fechadas na próxima oportunidade.",
        }),
      onError: () => toast.error("Não foi possível encerrar a cópia."),
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-5 py-8 space-y-10">
            <header>
              <h1 className="text-[26px] md:text-[30px] font-semibold tracking-tight">
                Copy Trading
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Mirror signals from top performers — you stay in control of risk.
              </p>
            </header>
            <StatsRow />
            <Leaderboard onCopy={openCopy} copiedIds={copiedIds} />
            <PerformanceChart />
            {isError ? (
              <div className="rounded-lg border border-border bg-card/40 p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Não foi possível carregar seus traders copiados.
                </p>
                <button
                  onClick={() => refetch()}
                  className="text-sm text-[var(--brand-cyan)] hover:underline"
                >
                  Tentar de novo
                </button>
              </div>
            ) : isPending ? (
              <div className="rounded-lg border border-border bg-card/20 p-8 text-center text-sm text-muted-foreground">
                Carregando seus traders copiados…
              </div>
            ) : (
              <MyCopies copies={copies} onStop={stopCopy} />
            )}
            <TopCopiers />
          </div>
        </main>
      </div>
      <CopyConfigModal
        trader={selected}
        open={open}
        onOpenChange={setOpen}
        onConfirm={confirmCopy}
      />
    </div>
  );
}

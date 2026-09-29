import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calibratorHistoryStore,
  type CalibratorHistoryEntry,
} from "@/lib/calibrator-history-store";
import type { SimulationProfile } from "@/adapters/backend/calibrator.adapter";
import { History, Play, Trash2, FlaskConical, TrendingUp, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/calibrator/history")({
  head: () => ({
    meta: [
      { title: "Histórico de simulações — Calibrator" },
      {
        name: "description",
        content:
          "Histórico de backtests executados no Calibrador, com filtros e reexecução rápida.",
      },
    ],
  }),
  component: CalibratorHistoryPage,
});

type ProfileFilter = SimulationProfile | "all";
type OutcomeFilter = "all" | "win" | "loss";

const PROFILES: { value: ProfileFilter; label: string }[] = [
  { value: "all", label: "Todos os perfis" },
  { value: "conservador", label: "Conservador" },
  { value: "rsi", label: "RSI" },
  { value: "aiscore", label: "AI Score" },
  { value: "agressivo", label: "Agressivo" },
  { value: "scalper", label: "Scalper" },
  { value: "intraday", label: "Intraday" },
  { value: "swing", label: "Swing" },
  { value: "position", label: "Position" },
];

function CalibratorHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const [entries, setEntries] = useState<CalibratorHistoryEntry[]>([]);
  const [profile, setProfile] = useState<ProfileFilter>("all");
  const [symbol, setSymbol] = useState("");
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");

  useEffect(() => {
    let alive = true;
    const refresh = () => {
      if (!userId) {
        setEntries([]);
        return;
      }
      calibratorHistoryStore.list(userId).then((data) => {
        if (alive) setEntries(data);
      });
    };
    refresh();
    const unsub = calibratorHistoryStore.subscribe(refresh);
    return () => {
      alive = false;
      unsub();
    };
  }, [userId]);

  const filtered = useMemo(() => {
    const sym = symbol.trim().toUpperCase();
    return entries.filter((e) => {
      if (profile !== "all" && e.params.profile !== profile) return false;
      if (sym && !e.params.symbol.toUpperCase().includes(sym)) return false;
      if (outcome === "win" && e.result.pnl < 0) return false;
      if (outcome === "loss" && e.result.pnl >= 0) return false;
      return true;
    });
  }, [entries, profile, symbol, outcome]);

  function rerun(e: CalibratorHistoryEntry) {
    navigate({
      to: "/calibrator",
      search: {
        profile: e.params.profile,
        symbol: e.params.symbol,
        period_days: e.params.periodDays,
        initial_balance: e.params.initialBalance,
        leverage: e.params.leverage,
        autorun: 1,
      },
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <History className="size-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Histórico de simulações
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Backtests executados localmente, com filtros e reexecução rápida.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/calibrator">
                <Button variant="outline" size="sm">
                  <FlaskConical className="size-4 mr-2" /> Novo backtest
                </Button>
              </Link>
              {entries.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (userId && confirm("Limpar todo o histórico de simulações?"))
                      calibratorHistoryStore.clear(userId);
                  }}
                >
                  <Trash2 className="size-4 mr-2" /> Limpar
                </Button>
              )}
            </div>
          </header>

          <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Perfil</Label>
              <Select value={profile} onValueChange={(v) => setProfile(v as ProfileFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFILES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Símbolo</Label>
              <Input
                placeholder="Ex: BTCUSDT"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Resultado</Label>
              <Select value={outcome} onValueChange={(v) => setOutcome(v as OutcomeFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="win">Lucro</SelectItem>
                  <SelectItem value="loss">Prejuízo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-xs text-muted-foreground">
                {filtered.length} de {entries.length} simulações
              </div>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card className="p-10 text-center text-sm text-muted-foreground">
              {entries.length === 0
                ? "Nenhuma simulação registrada ainda. Execute um backtest no Calibrador."
                : "Nenhuma simulação corresponde aos filtros."}
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Data</th>
                      <th className="text-left px-3 py-2 font-medium">Perfil</th>
                      <th className="text-left px-3 py-2 font-medium">Símbolo</th>
                      <th className="text-right px-3 py-2 font-medium">Período</th>
                      <th className="text-right px-3 py-2 font-medium">Saldo</th>
                      <th className="text-right px-3 py-2 font-medium">Trades</th>
                      <th className="text-right px-3 py-2 font-medium">Win Rate</th>
                      <th className="text-right px-3 py-2 font-medium">PnL</th>
                      <th className="text-right px-3 py-2 font-medium">Max DD</th>
                      <th className="text-right px-3 py-2 font-medium">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => {
                      const pos = e.result.pnl >= 0;
                      return (
                        <tr
                          key={e.id}
                          className="border-t border-border hover:bg-muted/30 cursor-pointer"
                          onClick={() =>
                            navigate({
                              to: "/calibrator/history/$id",
                              params: { id: e.id },
                            })
                          }
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                            {new Date(e.createdAt).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 capitalize">{e.params.profile}</td>
                          <td className="px-3 py-2 font-medium">{e.params.symbol}</td>
                          <td className="px-3 py-2 text-right">{e.params.periodDays}d</td>
                          <td className="px-3 py-2 text-right">
                            {e.params.initialBalance.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right">{e.result.trades}</td>
                          <td className="px-3 py-2 text-right">
                            {(e.result.winRate * 100).toFixed(1)}%
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-medium ${
                              pos ? "text-emerald-500" : "text-rose-500"
                            }`}
                          >
                            <span className="inline-flex items-center gap-1 justify-end">
                              {pos ? (
                                <TrendingUp className="size-3.5" />
                              ) : (
                                <TrendingDown className="size-3.5" />
                              )}
                              {pos ? "+" : ""}
                              {e.result.pnl.toFixed(2)} ({e.result.pnlPct.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right text-rose-500">
                            {(e.result.maxDrawdown * 100).toFixed(2)}%
                          </td>
                          <td
                            className="px-3 py-2 text-right whitespace-nowrap"
                            onClick={(ev) => ev.stopPropagation()}
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rerun(e)}
                              className="h-7 px-2"
                            >
                              <Play className="size-3.5 mr-1" /> Reexecutar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => userId && calibratorHistoryStore.remove(userId, e.id)}
                              className="h-7 px-2 ml-1 text-muted-foreground hover:text-destructive"
                              title="Remover"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

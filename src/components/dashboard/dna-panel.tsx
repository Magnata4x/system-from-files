import { Brain, Loader2, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useDnaProfile } from "@/hooks/useDnaProfile";
import { useDnaStats } from "@/hooks/useDnaStats";

const metrics = [["consistency", "Consistency"], ["discipline", "Discipline"], ["riskControl", "Risk Control"], ["timing", "Timing"], ["emotionalControl", "Emotional"]] as const;

export function DnaPanel() {
  const profile = useDnaProfile("me");
  const stats = useDnaStats();
  return <div data-tour="dna-panel" className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center justify-between gap-3 mb-4"><div className="flex items-center gap-2"><Brain className="size-5 text-[var(--brand-cyan)]" /><div><h3 className="text-[15px] font-medium">Your Trading DNA</h3><p className="text-[11px] text-muted-foreground">Perfil e histórico reais do usuário autenticado.</p></div></div><Link to="/dna-trader" className="text-[11px] text-[var(--brand-cyan)] hover:underline">Abrir relatório →</Link></div>
    {(profile.isLoading || stats.isLoading) && <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-3"><Loader2 className="size-3.5 animate-spin" /> carregando DNA…</div>}
    {(profile.isError || stats.isError) && <div className="flex items-center gap-2 text-[12px] text-[#E24B4A] py-3"><AlertTriangle className="size-3.5" /> Não foi possível carregar o DNA real agora.</div>}
    {!profile.isLoading && !stats.isLoading && !profile.isError && !stats.isError && (profile.data ? <div className="space-y-4"><div className="grid grid-cols-2 sm:grid-cols-5 gap-2">{metrics.map(([key, label]) => <Metric key={key} label={label} value={Number(profile.data?.[key] ?? 0)} />)}</div><div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]"><Stat label="Win rate" value={`${Number(profile.data.avgWinRate ?? stats.data?.winRate ?? 0).toFixed(1)}%`} /><Stat label="Operações" value={String(stats.data?.totalTrades ?? 0)} /><Stat label="PnL médio" value={`${Number(stats.data?.avgPnlPct ?? 0).toFixed(2)}%`} /><Stat label="Drawdown" value={`${Number(stats.data?.maxDrawdownPct ?? 0).toFixed(2)}%`} /></div>{!stats.data?.hasData && <div className="rounded-lg border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">Perfil disponível, mas ainda não há histórico de operações suficiente para gerar o relatório estatístico.</div>}</div> : <div className="rounded-lg border border-border bg-secondary/30 p-4 text-[12px] text-muted-foreground">Perfil DNA ainda não cadastrado. Nenhum dado fictício é exibido.</div>)}
  </div>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-border bg-secondary/30 p-3"><div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div><div className="mt-1 text-xl font-semibold tabular-nums">{value.toFixed(0)}</div><div className="mt-1 h-1 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-[var(--brand-cyan)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div></div>; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-card/60 p-3"><div className="text-[10px] text-muted-foreground">{label}</div><div className="mt-1 font-semibold tabular-nums">{value}</div></div>; }

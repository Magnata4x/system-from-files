import { Link } from "@tanstack/react-router";
import { Cpu } from "lucide-react";
import { useBot4xStore } from "@/lib/bot4x-store";
import { useDnaStats } from "@/hooks/useDnaStats";

export function DnaBot4xCompat() {
  const currentProfile = useBot4xStore((s) => s.profile);
  const { data, isLoading, isError } = useDnaStats();
  if (isLoading) return <PanelMessage text="carregando compatibilidade real…" />;
  if (isError || !data?.hasData) return <PanelMessage text="Compatibilidade Bot4x indisponível — sem histórico real suficiente." />;
  const recommendation = data.insights[0]?.action ?? "indisponível";

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-3"><div className="size-7 rounded-md flex items-center justify-center bg-[#1D9E75]/15 text-[#1D9E75]"><Cpu className="size-4" /></div><div><h3 className="text-[14px] font-semibold">Compatibilidade Bot4x</h3><p className="text-[11.5px] text-muted-foreground">Recomendação derivada das operações reais.</p></div></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/8 p-4"><div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Recomendação</div><div className="text-sm font-medium text-foreground mt-1">{recommendation}</div></div>
        <div className="rounded-lg border border-border bg-background/30 p-4"><div className="text-[10px] uppercase text-muted-foreground tracking-wide">Perfil atual</div><div className="text-[12px] font-semibold tabular-nums mt-1">{currentProfile || "indisponível"}</div><div className="text-[10px] text-muted-foreground mt-2">Win rate {data.winRate.toFixed(1)}% · DD {data.maxDrawdownPct.toFixed(1)}%</div></div>
      </div>
      <Link to="/bot4x" className="mt-3 inline-block text-[11px] text-[var(--brand-cyan)] hover:underline">Abrir Bot4x →</Link>
    </div>
  );
}

function PanelMessage({ text }: { text: string }) {
  return <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">{text}</div>;
}

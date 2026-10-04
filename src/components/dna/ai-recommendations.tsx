import { Sparkles } from "lucide-react";
import { useDnaStats } from "@/hooks/useDnaStats";

export function AiRecommendations() {
  const { data, isLoading, isError } = useDnaStats();
  if (isLoading) return <PanelMessage text="carregando recomendações reais…" />;
  if (isError || !data?.hasData || data.insights.length === 0) return <PanelMessage text="Recomendações indisponíveis — sem dados reais suficientes." />;

  return (
    <div className="relative rounded-xl border border-border bg-card/60 p-5 overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[var(--brand-cyan)] to-purple-500" />
      <div className="relative">
        <div className="flex items-center gap-2 mb-4"><Sparkles className="size-4 text-[var(--brand-cyan)]" /><h2 className="text-sm font-semibold">Recomendações derivadas do DNA</h2></div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights.map((insight) => (
            <li key={insight.title} className="rounded-lg border border-border bg-background/30 p-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{insight.title}</div>
              <div className="text-sm mt-1">{insight.action}</div>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Fonte: histórico real · janela {data.periodDays} dias · gerado em {new Date(data.generatedAt).toLocaleString("pt-BR")}</p>
      </div>
    </div>
  );
}

function PanelMessage({ text }: { text: string }) {
  return <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">{text}</div>;
}

import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { DnaPairRecommendations } from "@/components/dna/dna-pair-recommendations";

export const Route = createFileRoute("/_authenticated/dna-pairs")({
  head: () => ({
    meta: [
      { title: "DNA Pares — AISignalRadar" },
      {
        name: "description",
        content:
          "Análise estatística por par usando intervalo de Wilson e correção de Bonferroni. Requer mínimo de 20 trades fechados por par para emitir veredito. Pares PREFER são priorizados pelo Bot4x; AVOID são bloqueados.",
      },
    ],
  }),
  component: DnaPairsPage,
});

function DnaPairsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">DNA — Pares Recomendados</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              O DNA analisa o histórico de trades fechados por par usando o intervalo de confiança de Wilson com
              correção de Bonferroni. Um par recebe PREFER ou AVOID apenas quando há evidência estatística suficiente —
              mínimo de 20 trades fechados e taxa de acerto consistentemente acima ou abaixo da média global do sistema.
            </p>
          </header>
          <DnaPairRecommendations />
        </main>
      </div>
    </div>
  );
}

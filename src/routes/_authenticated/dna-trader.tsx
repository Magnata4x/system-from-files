import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { DnaHeader } from "@/components/dna/dna-header";
import { BehavioralHeatmap } from "@/components/dna/behavioral-heatmap";
import { DnaRadar } from "@/components/dna/dna-radar";
import { StatsGrid } from "@/components/dna/stats-grid";
import { AiInsights } from "@/components/dna/ai-insights";
import { EvolutionTimeline } from "@/components/dna/evolution-timeline";
import { AiRecommendations } from "@/components/dna/ai-recommendations";
import { DnaBot4xCompat } from "@/components/dna/dna-bot4x-compat";
import { DnaOperations } from "@/components/dna/dna-operations";
import { useDnaProfile } from "@/hooks/useDnaProfile";
import { useDnaStats } from "@/hooks/useDnaStats";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/dna-trader")({
  head: () => ({
    meta: [
      { title: "DNA Trader — AISignalRadar" },
      { name: "description", content: "Behavioral DNA of your trading: archetype, gauges, heatmap, radar vs institutional benchmark, and AI coaching." },
    ],
  }),
  component: DnaTraderPage,
});

function DnaTraderPage() {
  const { session } = useAuth();
  const profile = useDnaProfile(session?.user?.id);
  const stats = useDnaStats();
  const hasProfile = profile.data?.hasProfile === true;
  const hasStats = stats.data?.hasData === true;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">DNA Trader</h1>
            <p className="text-sm text-muted-foreground mt-1">Sua assinatura comportamental, calculada a partir dos dados reais.</p>
          </header>

          {profile.isLoading || stats.isLoading ? (
            <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">
              Carregando dados reais do DNA…
            </div>
          ) : profile.isError || stats.isError ? (
            <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-destructive">
              Não foi possível carregar os dados reais do DNA agora.
            </div>
          ) : !hasProfile ? (
            <div className="rounded-xl border border-border bg-card/40 p-5">
              <h2 className="text-sm font-semibold">Perfil DNA ainda não calculado</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum score, estilo ou histórico demonstrativo é exibido até existirem dados reais.
              </p>
            </div>
          ) : (
            <>
              <DnaHeader />
              {!hasStats ? (
                <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">
                  O perfil DNA está disponível, mas ainda não há histórico de operações suficiente para gerar o relatório estatístico.
                </div>
              ) : (
                <>
                  <BehavioralHeatmap />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <DnaRadar />
                    <div className="space-y-5">
                      <StatsGrid />
                    </div>
                  </div>

                  <DnaOperations />
                  <AiInsights />
                  <EvolutionTimeline />
                  <AiRecommendations />
                  <DnaBot4xCompat />
                </>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

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
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">DNA Trader</h1>
            <p className="text-sm text-muted-foreground mt-1">Your behavioral signature, scored and compared to institutional benchmark.</p>
          </header>

          <DnaHeader />
          <BehavioralHeatmap />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <DnaRadar />
            <div className="space-y-5">
              <StatsGrid />
            </div>
          </div>

          <AiInsights />
          <EvolutionTimeline />
          <AiRecommendations />
          <DnaBot4xCompat />
        </main>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { DnaCorrectionsHistory } from "@/components/dna/dna-corrections-history";

export const Route = createFileRoute("/_authenticated/dna-corrections")({
  head: () => ({
    meta: [
      { title: "DNA Corrections — AISignalRadar" },
      { name: "description", content: "Histórico das últimas 20 correções automáticas aplicadas pelo DNA do Bot4x." },
    ],
  }),
  component: DnaCorrectionsPage,
});

function DnaCorrectionsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">Correções do DNA</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Últimas 20 correções automáticas aplicadas pelo DNA quando detecta perda de capital ou trajetória negativa.
            </p>
          </header>

          <DnaCorrectionsHistory />
        </main>
      </div>
    </div>
  );
}

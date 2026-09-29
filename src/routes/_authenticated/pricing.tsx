import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { PricingContent } from "@/components/pricing/pricing-content";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — AISignalRadar" },
      { name: "description", content: "Planos Starter, Pro e Institutional. Comece grátis por 7 dias e economize 20% no ciclo anual." },
      { property: "og:title", content: "AISignalRadar Pricing" },
      { property: "og:description", content: "Sinais de IA, Sentiment, Manipulation Radar e DNA Trader em planos para traders e mesas institucionais." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
          <PricingContent />
        </main>
      </div>
    </div>
  );
}

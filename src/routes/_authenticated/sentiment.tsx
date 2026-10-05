import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { Sentiment } from "@/components/dashboard/sentiment";

export const Route = createFileRoute("/_authenticated/sentiment")({
  head: () => ({
    meta: [
      { title: "Sentiment de Mercado — AISignalRadar" },
      {
        name: "description",
        content:
          "Leitura de sentimento de mercado baseada em preço, variação e momentum. Fontes sociais, notícias e on-chain aguardam decisão de produto.",
      },
    ],
  }),
  component: SentimentPage,
});

function SentimentPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">Sentiment de Mercado</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Leitura de mercado baseada em preço, variação e momentum, complementada por sentimento de notícias financeiras reais. Não representa dados sociais ou on-chain.
            </p>
          </header>

          <Sentiment />
        </main>
      </div>
    </div>
  );
}

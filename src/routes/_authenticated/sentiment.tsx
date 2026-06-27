import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { SentimentGauge } from "@/components/sentiment/sentiment-gauge";
import { MacroCards } from "@/components/sentiment/macro-cards";
import { SourceBreakdown } from "@/components/sentiment/source-breakdown";
import { NarrativeRadar } from "@/components/sentiment/narrative-radar";
import { AssetSentimentTable } from "@/components/sentiment/asset-table";
import { SentimentTimeline } from "@/components/sentiment/sentiment-timeline";
import { SocialHeatmap } from "@/components/sentiment/social-heatmap";
import { NewsFeed } from "@/components/sentiment/news-feed";
import { SentimentShiftAlert } from "@/components/sentiment/shift-alert";

export const Route = createFileRoute("/_authenticated/sentiment")({
  head: () => ({
    meta: [
      { title: "Sentiment AI — AISignalRadar" },
      { name: "description", content: "Multi-source sentiment intelligence: social, news, on-chain and narrative tracking across major crypto assets." },
    ],
  }),
  component: SentimentPage,
});

function SentimentPage() {
  const [narrative, setNarrative] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">Sentiment AI</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Multi-source sentiment aggregation across social, news, and on-chain signals.
            </p>
          </header>

          <SentimentShiftAlert />

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-1"><SentimentGauge /></div>
            <div className="lg:col-span-4"><MacroCards /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-10 gap-5">
            <div className="lg:col-span-3 space-y-5">
              <SourceBreakdown />
            </div>
            <div className="lg:col-span-4 space-y-5">
              <NarrativeRadar selected={narrative} onSelect={setNarrative} />
              <SentimentTimeline />
              <SocialHeatmap />
              <AssetSentimentTable />
            </div>
            <div className="lg:col-span-3">
              <NewsFeed narrativeFilter={narrative} onClearNarrative={() => setNarrative(null)} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

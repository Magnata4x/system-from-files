import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { ApiHero } from "@/components/api/api-hero";
import { EndpointCards } from "@/components/api/endpoint-cards";
import { SnippetsSection } from "@/components/api/snippets-section";
import { KeysManagement } from "@/components/api/keys-management";
import { WebhookConfig } from "@/components/api/webhook-config";

export const Route = createFileRoute("/_authenticated/api")({
  head: () => ({
    meta: [
      { title: "API Access — AISignalRadar" },
      { name: "description", content: "REST & WebSocket API for AISignalRadar: signals, AI scores, sentiment, manipulation alerts and webhooks." },
      { property: "og:title", content: "AISignalRadar API" },
      { property: "og:description", content: "Integrate live AI trading signals into your stack via REST and WebSocket." },
    ],
  }),
  component: ApiPage,
});

function ApiPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-5 py-8 space-y-10">
            <ApiHero />
            <EndpointCards />
            <SnippetsSection />
            <KeysManagement />
            <WebhookConfig />
          </div>
        </main>
      </div>
    </div>
  );
}

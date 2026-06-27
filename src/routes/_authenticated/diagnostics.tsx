import { createFileRoute } from "@tanstack/react-router";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { WsStatusPanel } from "@/components/diagnostics/ws-status-panel";
import { RsiCalibrationReport } from "@/components/diagnostics/rsi-calibration-report";

export const Route = createFileRoute("/_authenticated/diagnostics")({
  head: () => ({
    meta: [
      { title: "Diagnostics — AISignalRadar" },
      {
        name: "description",
        content:
          "Painel de diagnóstico: contrato de auth do WebSocket e relatório de calibração RSI.",
      },
    ],
  }),
  component: DiagnosticsPage,
});

function DiagnosticsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">Diagnostics</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Verificações de integridade do WebSocket e da calibração RSI.
            </p>
          </header>
          <WsStatusPanel />
          <RsiCalibrationReport />
        </main>
      </div>
    </div>
  );
}

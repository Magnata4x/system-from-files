import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useCalibratorState } from "@/hooks/useCalibratorState";

const STATE_COLOR: Record<string, string> = {
  OPTIMAL: "#1D9E75",
  WARNING: "#E0A93B",
  RISK_DRIFT: "#E0A93B",
  PROTECTION: "#E24B4A",
  SHUTDOWN: "#E24B4A",
};

/** Estado ao vivo do Bot4x Calibration Engine (polling 15s no backend interno). */
export function CalibratorEnginePanel({ userId }: { userId: string | undefined }) {
  const { data, isLoading, error, refetch } = useCalibratorState(userId);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Estado do motor de calibração</h2>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-7 px-2"
          onClick={() => void refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {!userId ? (
        <p className="text-xs text-muted-foreground">Faça login para ver o estado do motor.</p>
      ) : isLoading && !data ? (
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> carregando estado…
        </p>
      ) : error ? (
        <p className="inline-flex items-center gap-2 text-xs text-[#E24B4A]">
          <ShieldAlert className="size-3.5" /> {error.message}
        </p>
      ) : !data ? (
        <p className="text-xs text-muted-foreground">
          Nenhum estado disponível ainda — rode um backtest ou inicie o Bot4x.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
              style={{
                color: STATE_COLOR[data.state] ?? "var(--muted-foreground)",
                border: `1px solid ${STATE_COLOR[data.state] ?? "var(--border)"}`,
              }}
            >
              {data.state}
            </span>
            <Metric label="Risk multiplier" value={`${data.riskMultiplier.toFixed(2)}×`} />
            <Metric label="Trade allowance" value={data.tradeAllowance} />
          </div>

          {data.behavioralFlags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {data.behavioralFlags.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-md bg-secondary text-[11px]">{f}</span>
              ))}
            </div>
          )}

          {data.actions.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5 text-xs text-muted-foreground">
              {data.actions.map((a) => <li key={a}>{a}</li>)}
            </ul>
          )}

          {data.commentary && <p className="text-xs text-muted-foreground">{data.commentary}</p>}
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <span className="text-[11px] text-muted-foreground">
      {label}: <span className="text-foreground font-medium tabular-nums">{value}</span>
    </span>
  );
}

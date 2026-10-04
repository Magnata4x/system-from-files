import { X, Zap } from "lucide-react";

type AlertBannerProps = {
  count: number;
  assets: string[];
  riskLevel?: string | null;
  updatedAt?: Date | number | string | null;
  onDismiss: () => void;
};

export function AlertBanner({
  count,
  assets,
  riskLevel,
  updatedAt,
  onDismiss,
}: AlertBannerProps) {
  const normalizedRisk = riskLevel?.toUpperCase();
  const elevatedRisk = normalizedRisk === "HIGH" || normalizedRisk === "MEDIUM";

  if (count === 0 && !elevatedRisk) return null;

  const title =
    count > 0
      ? `⚡ ${count} ACTIVE MANIPULATION ALERTS DETECTED`
      : `⚠ Elevated manipulation risk: ${normalizedRisk}`;
  const detail =
    count > 0
      ? assets.join(" · ")
      : "Sem alerta ativo, mas o snapshot de risco está acima de LOW.";
  const updatedMs = updatedAt ? new Date(updatedAt).getTime() : NaN;
  const age = Number.isFinite(updatedMs)
    ? ` · atualizado há ${Math.max(0, Math.floor((Date.now() - updatedMs) / 1000))}s`
    : "";

  return (
    <div className="relative rounded-xl border-2 border-red-500/70 bg-red-500/10 px-4 py-3 flex items-center gap-3 overflow-hidden manip-pulse">
      <Zap className="size-5 text-red-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-red-200 tracking-wide">
          {title}
        </div>
        <div className="text-[11px] text-red-200/70 mt-0.5 truncate">
          {detail}{age}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="size-7 rounded-md flex items-center justify-center text-red-200/80 hover:bg-red-500/20 hover:text-red-100"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
      <style>{`
        @keyframes manipPulseBorder {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55), inset 0 0 0 0 rgba(239,68,68,0.0); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0), inset 0 0 18px 0 rgba(239,68,68,0.18); }
        }
        .manip-pulse { animation: manipPulseBorder 1.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

import { X, Zap } from "lucide-react";

export function AlertBanner({ count, assets, onDismiss }: { count: number; assets: string[]; onDismiss: () => void }) {
  if (count === 0) return null;
  return (
    <div className="relative rounded-xl border-2 border-red-500/70 bg-red-500/10 px-4 py-3 flex items-center gap-3 overflow-hidden manip-pulse">
      <Zap className="size-5 text-red-400 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-red-200 tracking-wide">
          ⚡ {count} ACTIVE MANIPULATION ALERTS DETECTED
        </div>
        <div className="text-[11px] text-red-200/70 mt-0.5 truncate">
          {assets.join(" · ")} — Updated 2s ago
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

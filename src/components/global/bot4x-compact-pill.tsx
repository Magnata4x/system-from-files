import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Cpu } from "lucide-react";
import { useBot4xStore } from "@/lib/bot4x-store";
import { useBot4xPrefs } from "@/lib/bot4x-prefs-store";

/**
 * Compact 64px Bot4x pill anchored bottom-left.
 * Enabled via Settings → Appearance → "Bot4x modo compacto".
 */
export function Bot4xCompactPill() {
  const enabled = useBot4xPrefs((s) => s.compactPill);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const mode = useBot4xStore((s) => s.mode);
  const pnl = useBot4xStore((s) => s.dailyPnlPct);

  if (!enabled) return null;
  if (path.startsWith("/bot4x")) return null;

  const triggered = pnl <= -1.5;
  const isReal = mode === "REAL";
  const accent = triggered ? "#E24B4A" : isReal ? "#E24B4A" : "#1D9E75";
  const pnlColor = pnl >= 0 ? "#1D9E75" : "#E24B4A";

  return (
    <Link
      to="/bot4x"
      className="fixed bottom-4 left-4 z-50"
      aria-label="Open Bot4x (compact)"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className={`flex flex-col items-center justify-center rounded-full bg-[#111318] border shadow-2xl ${
          triggered ? "animate-pulse" : ""
        }`}
        style={{
          width: 64,
          height: 64,
          borderColor: accent,
          boxShadow: `0 8px 28px -8px color-mix(in oklab, ${accent} 55%, transparent), inset 0 0 0 1px color-mix(in oklab, ${accent} 25%, transparent)`,
        }}
      >
        <Cpu className="size-4" style={{ color: accent }} />
        <span className="text-[10px] font-bold tabular-nums leading-none mt-0.5" style={{ color: pnlColor }}>
          {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
        </span>
        <span className="text-[8px] uppercase tracking-wider text-muted-foreground leading-none mt-0.5">
          {mode}
        </span>
      </motion.div>
    </Link>
  );
}

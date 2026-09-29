import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Shield, ShieldAlert } from "lucide-react";
import { useBot4xStore } from "@/lib/bot4x-store";

export function Bot4xFloatingWidget() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const init = useBot4xStore((s) => s.init);
  const mode = useBot4xStore((s) => s.mode);
  const pnl = useBot4xStore((s) => s.dailyPnlPct);
  const ordersCount = useBot4xStore((s) => s.orders.length);
  const triggered = pnl <= -1.5;
  const [hover, setHover] = useState(false);

  useEffect(() => { init(); }, [init]);

  // Hide on the Bot4x page itself (it has its own UI)
  if (path.startsWith("/bot4x")) return null;

  const isReal = mode === "REAL";
  const accent = triggered ? "#E24B4A" : isReal ? "#E24B4A" : "#1D9E75";
  const pnlColor = pnl >= 0 ? "#1D9E75" : "#E24B4A";

  return (
    <Link
      to="/bot4x"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="fixed bottom-4 right-4 z-50 group"
      aria-label="Open Bot4x"
    >
      <motion.div
        layout
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 22, stiffness: 280 }}
        className={`flex items-center gap-2.5 rounded-full bg-[#111318] border shadow-2xl overflow-hidden ${
          triggered ? "animate-pulse" : ""
        }`}
        style={{
          borderColor: accent,
          boxShadow: `0 8px 28px -8px color-mix(in oklab, ${accent} 55%, transparent), inset 0 0 0 1px color-mix(in oklab, ${accent} 25%, transparent)`,
          height: 56,
          paddingLeft: 6,
          paddingRight: hover ? 14 : 6,
        }}
      >
        <div
          className="size-11 rounded-full flex items-center justify-center shrink-0 relative"
          style={{ background: `color-mix(in oklab, ${accent} 20%, #0C447C)` }}
        >
          <Cpu className="size-5 text-[#E6F1FB]" />
          <span className="absolute -top-0.5 -right-0.5 flex size-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: accent }} />
            <span className="relative inline-flex size-2.5 rounded-full" style={{ background: accent }} />
          </span>
        </div>

        <AnimatePresence initial={false}>
          {hover && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="flex flex-col leading-tight pr-1">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: isReal ? "#E24B4A" : "#1D9E75" }}>
                  {isReal ? <ShieldAlert className="size-3" /> : <Shield className="size-3" />} {mode}
                </span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: pnlColor }}>
                  {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                </span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {ordersCount} ordens {triggered && <span className="text-[#E24B4A] font-semibold">· BREAKER</span>}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Link>
  );
}

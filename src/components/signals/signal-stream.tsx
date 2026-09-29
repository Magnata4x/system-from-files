import { useEffect, useState } from "react";
import { useSignalsStore } from "@/lib/signals-store";
import { formatPrice, formatAge, type Signal } from "@/lib/signals-data";

export function SignalStream() {
  const open = useSignalsStore((s) => s.streamOpen);
  const signals = useSignalsStore((s) => s.signals);
  const setHover = useSignalsStore((s) => s.setHover);
  const pin = useSignalsStore((s) => s.pin);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  // Duplicate the stream so the upward scroll loops seamlessly
  const stream = [...signals.slice(0, 30), ...signals.slice(0, 30)];
  // pixels-per-tick * tick, modulo half-height handled via translateY negative
  const offset = (tick * 0.6) % 1600;

  return (
    <aside className="w-[200px] shrink-0 border-r border-border bg-[#070809] sticky top-12 self-start h-[calc(100vh-3rem)] overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-2 h-7 bg-[#070809]/95 border-b border-border">
        <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--brand-cyan)] font-semibold">Signal Stream</span>
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75 animate-ping" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[#1D9E75]" />
        </span>
      </div>
      <div
        className="pt-8 pb-4 transition-none will-change-transform"
        style={{ transform: `translateY(-${offset}px)` }}
      >
        {stream.map((s, i) => (
          <StreamRow key={`${s.id}-${i}`} s={s} onHover={() => setHover(s.id)} onLeave={() => setHover(null)} onClick={() => pin(s.id)} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-7 h-10 bg-gradient-to-b from-[#070809] to-transparent z-10" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#070809] to-transparent z-10" />
    </aside>
  );
}

function StreamRow({ s, onHover, onLeave, onClick }: { s: Signal; onHover: () => void; onLeave: () => void; onClick: () => void }) {
  const accent = s.direction === "BUY" ? "#1D9E75" : "#E24B4A";
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="px-2.5 py-1.5 border-b border-border/40 hover:bg-card cursor-pointer font-mono text-[10px] leading-tight"
    >
      <div className="flex items-center justify-between">
        <span className="text-foreground font-semibold">{s.asset}</span>
        <span className="font-bold" style={{ color: accent }}>{s.direction === "BUY" ? "▲" : "▼"}</span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="tabular-nums" style={{ color: accent }}>{formatPrice(s.entry)}</span>
        <span className="tabular-nums">{s.score}</span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground/70 text-[9px]">
        <span>{s.tf}</span>
        <span>{formatAge(s.ageMin)}</span>
      </div>
    </div>
  );
}

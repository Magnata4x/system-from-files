import { AnimatePresence } from "framer-motion";
import { type Signal } from "@/lib/signals-data";
import { SignalCard } from "./signal-card";

export function CardGrid({ signals }: { signals: Signal[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <AnimatePresence mode="popLayout">
        {signals.map((s) => (
          <SignalCard key={s.id} signal={s} />
        ))}
      </AnimatePresence>
      {!signals.length && (
        <div className="col-span-full text-center py-16 text-muted-foreground text-sm">
          No signals match these filters.
        </div>
      )}
    </div>
  );
}

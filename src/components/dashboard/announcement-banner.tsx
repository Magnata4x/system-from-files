import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AnnouncementBanner() {
  const [open, setOpen] = useState(true);
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="overflow-hidden"
          style={{ background: "color-mix(in oklab, #E24B4A 22%, var(--background))" }}
        >
          <div className="flex items-center justify-between px-5 py-2 border-b border-[color:color-mix(in_oklab,#E24B4A_45%,transparent)]">
            <div className="flex items-center gap-2 text-[13px] text-foreground">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#E24B4A] opacity-75 animate-ping" />
                <span className="relative inline-flex size-2 rounded-full bg-[#E24B4A]" />
              </span>
              <AlertTriangle className="size-4 text-[#E24B4A]" />
              <span className="font-medium">3 manipulation alerts active</span>
              <span className="text-muted-foreground">—</span>
              <button className="text-[#FF9B9A] hover:text-white transition-colors font-medium">
                View details →
              </button>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-foreground/70 hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="size-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

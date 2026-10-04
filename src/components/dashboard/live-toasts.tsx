import { useDashboardStore } from "@/lib/dashboard-store";
import { ScoreBadge } from "./score-badge";
import { X } from "lucide-react";
import { AnimatePresence,motion } from "framer-motion";
import { relativeTime } from "./data-status";
export function LiveToasts(){const toasts=useDashboardStore(s=>s.toasts),dismiss=useDashboardStore(s=>s.dismissToast),select=useDashboardStore(s=>s.setSelectedSignal);return <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[300px]"><AnimatePresence>{toasts.map(t=><motion.div key={t.id} className="rounded-xl border border-border bg-card shadow-xl p-3"><div className="flex items-center gap-2"><ScoreBadge score={t.signal.score} size="sm"/><b>{t.signal.asset}</b><span>{t.signal.direction}</span><button className="ml-auto" onClick={()=>dismiss(t.id)} aria-label="Fechar alerta"><X className="size-3.5"/></button></div><div className="text-[11px] text-muted-foreground mt-2">Entry {t.signal.entry} · TF {t.signal.tf||"—"} · {relativeTime(t.signal.time)}</div><button className="w-full mt-2 text-[12px]" onClick={()=>{select(t.signal);dismiss(t.id)}}>View signal</button></motion.div>)}</AnimatePresence></div>}

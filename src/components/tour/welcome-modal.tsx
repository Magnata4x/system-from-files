import { motion } from "framer-motion";
import { Radar, ShieldAlert, Bot } from "lucide-react";
import { useTourStore } from "@/lib/tour-store";

export function WelcomeModal() {
  const welcomeSeen = useTourStore((s) => s.welcomeSeen);
  const skipAll = useTourStore((s) => s.skipAll);
  const activeTour = useTourStore((s) => s.activeTour);
  const markWelcomeSeen = useTourStore((s) => s.markWelcomeSeen);
  const setSkipAll = useTourStore((s) => s.setSkipAll);
  const startTour = useTourStore((s) => s.startTour);

  if (welcomeSeen || skipAll || activeTour) return null;

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-[#0A0B0E]/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="rounded-2xl border border-border bg-[#111318] p-7 w-[480px] max-w-[92vw] text-center"
      >
        <div className="size-12 rounded-xl brand-gradient mx-auto flex items-center justify-center mb-3">
          <Radar className="size-6 text-white" />
        </div>
        <h2 className="text-[22px] font-medium text-foreground">Bem-vindo ao AISignalRadar</h2>
        <p className="text-[14px] text-muted-foreground mt-1">
          Você está pronto para operar com inteligência institucional.
        </p>

        <div className="grid grid-cols-3 gap-2 my-5">
          <Feature icon={Radar} title="Radar de Sinais" text="Sinais em tempo real com score de IA" color="#378ADD" />
          <Feature icon={ShieldAlert} title="Manipulation" text="Detecte manipulações antes do impacto" color="#E24B4A" />
          <Feature icon={Bot} title="Bot4x" text="Execução algorítmica com proteção" color="#1D9E75" />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => { markWelcomeSeen(); startTour("dashboard"); }}
            className="h-10 rounded-md bg-[#185FA5] hover:bg-[#1E73C8] text-white text-[13px] font-medium transition-colors"
          >
            Iniciar tour guiado →
          </button>
          <button
            onClick={() => { markWelcomeSeen(); setSkipAll(true); }}
            className="h-9 rounded-md border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Explorar por conta própria
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground mt-3">O tour leva aproximadamente 5 minutos</p>
      </motion.div>
    </div>
  );
}

function Feature({ icon: Icon, title, text, color }: { icon: typeof Radar; title: string; text: string; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/50 p-3 text-left">
      <span className="size-7 rounded-md flex items-center justify-center mb-2"
        style={{ background: `color-mix(in oklab, ${color} 18%, transparent)`, color }}>
        <Icon className="size-3.5" />
      </span>
      <div className="text-[11.5px] font-medium text-foreground leading-tight">{title}</div>
      <div className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">{text}</div>
    </div>
  );
}

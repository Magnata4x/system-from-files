import { Link } from "@tanstack/react-router";
import { Cpu, ArrowRight, Check } from "lucide-react";
import { useBot4xStore } from "@/lib/bot4x-store";
import { toast } from "sonner";

export function DnaBot4xCompat() {
  const setProfile = useBot4xStore((s) => s.setProfile);
  const currentProfile = useBot4xStore((s) => s.profile);

  // Recommend based on DNA: "Strategic Sniper" → aiscore
  const recommended = "aiscore" as const;
  const applied = currentProfile === recommended;

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="size-7 rounded-md flex items-center justify-center bg-[#1D9E75]/15 text-[#1D9E75]">
          <Cpu className="size-4" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold">Compatibilidade Bot4x</h3>
          <p className="text-[11.5px] text-muted-foreground">Perfil ideal de execução baseado no seu DNA.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2 rounded-lg border border-[#1D9E75]/30 bg-[#1D9E75]/8 p-4">
          <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground">Perfil recomendado</div>
          <div className="text-lg font-semibold text-foreground mt-0.5">AI Score</div>
          <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
            Seu DNA (Strategic Sniper) combina entradas seletivas com gestão de risco controlada. O perfil
            <span className="text-foreground font-medium"> Regular </span>
            equilibra score mínimo (82) e alavancagem moderada — alinhado ao seu padrão histórico.
          </p>
        </div>

        <div className="flex flex-col gap-2 justify-between">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <Stat label="Score min" value="82" />
            <Stat label="Leverage" value="3×" />
            <Stat label="Risco/trade" value="1.0%" />
            <Stat label="Slots" value="3" />
          </div>
          {applied ? (
            <button
              disabled
              className="h-9 rounded-md border border-[#1D9E75]/40 bg-[#1D9E75]/12 text-[#1D9E75] text-[12px] font-medium inline-flex items-center justify-center gap-1.5"
            >
              <Check className="size-3.5" /> Perfil aplicado
            </button>
          ) : (
            <button
              onClick={() => {
                setProfile(recommended);
                toast.success("Perfil AI Score aplicado no Bot4x");
              }}
              className="h-9 rounded-md bg-[var(--brand-blue-deep)] hover:bg-[var(--brand-blue)] text-foreground text-[12px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              Aplicar no Bot4x <ArrowRight className="size-3.5" />
            </button>
          )}
          <Link to="/bot4x" className="text-[11px] text-[var(--brand-cyan)] hover:underline text-center">
            Abrir Bot4x →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background/30 p-2">
      <div className="text-[9.5px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-[12px] font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

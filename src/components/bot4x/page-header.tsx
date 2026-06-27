import { Cpu } from "lucide-react";
import { useBot4xStore, getEffectiveMode, REAL_MODE_ENABLED } from "@/lib/bot4x-store";

export function Bot4xHeader() {
  const mode = useBot4xStore((s) => s.mode);
  const now = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  // ARCH-01: usar SEMPRE o modo efetivo. Se o flag de build estiver off,
  // o `mode` persistido pode estar "REAL" mas o motor que roda é o DEMO.
  const effectiveMode = getEffectiveMode(mode);
  const isDemo = effectiveMode === "DEMO";

  return (
    <header className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-[10px] bg-[#0C447C] flex items-center justify-center shrink-0">
          <Cpu className="size-5 text-[#E6F1FB]" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[20px] font-medium text-foreground leading-none">Bot4x</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--brand-blue-deep)] text-foreground">v2.0</span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#1D9E75]">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75 animate-ping" />
                <span className="relative inline-flex size-1.5 rounded-full bg-[#1D9E75]" />
              </span>
              Sistema ativo
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-1">
            Motor de Execução Algorítmica · AISignalRadar
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            isDemo
              ? "bg-[color-mix(in_oklab,#1D9E75_18%,transparent)] text-[#7AD9B4] border border-[#1D9E75]"
              : "bg-[color-mix(in_oklab,#E24B4A_18%,transparent)] text-[#FF9B9A] border border-[#E24B4A]"
          }`}
        >
          <span className={`relative flex size-1.5 ${isDemo ? "" : "animate-pulse"}`}>
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isDemo ? "bg-[#1D9E75]" : "bg-[#E24B4A]"}`} />
            <span className={`relative inline-flex size-1.5 rounded-full ${isDemo ? "bg-[#1D9E75]" : "bg-[#E24B4A]"}`} />
          </span>
          {isDemo ? "DEMO MODE" : "REAL MODE"}
        </span>
        {!REAL_MODE_ENABLED && (
          <span className="text-[10px] text-muted-foreground" title="VITE_BOT4X_REAL_ENABLED=false neste build">
            modo real indisponível
          </span>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">Atualizado {now}</span>
      </div>
    </header>
  );
}

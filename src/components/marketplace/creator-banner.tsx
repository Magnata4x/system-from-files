import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATS = [
  { value: "500+", label: "creators" },
  { value: "R$2M+", label: "paid out" },
  { value: "50,000+", label: "customers" },
];

export function CreatorBanner() {
  return (
    <section className="rounded-xl border border-[#378ADD]/30 bg-gradient-to-br from-[#378ADD]/15 via-[#378ADD]/5 to-transparent p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#5fa8ff] bg-[#378ADD]/15 border border-[#378ADD]/30 rounded-full px-2 py-0.5 mb-3">
            <Sparkles className="size-3" /> Become a Creator
          </div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Crie e venda suas próprias estratégias</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Monetize seu edge: publique indicadores, bots, alerts ou cursos e receba 80% de cada venda recorrente.
          </p>
          <div className="flex flex-wrap gap-6 mt-5">
            {STATS.map((s) => (
              <div key={s.label}>
                <div className="text-xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="shrink-0">
          <Button
            size="lg"
            onClick={() => toast.success("Creator application form opened")}
            className="bg-[#378ADD] hover:bg-[#2d74bd] text-white"
          >
            Tornar-se Criador <ArrowRight className="size-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

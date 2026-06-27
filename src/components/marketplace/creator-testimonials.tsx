import { BadgeCheck, Quote } from "lucide-react";

type Testimonial = {
  handle: string;
  verified: boolean;
  role: string;
  quote: string;
  metric: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    handle: "InstitutionalFlow",
    verified: true,
    role: "Strategy creator",
    quote: "Em 4 meses no marketplace, atingi 800 assinantes e meu LTV passou a financiar 100% da minha mesa de research.",
    metric: "R$ 38k MRR",
  },
  {
    handle: "OnChainPro",
    verified: true,
    role: "Indicators creator",
    quote: "A audiência aqui realmente entende order flow. O feedback nas reviews subiu o nível dos meus indicadores em 2 versões.",
    metric: "267 reviews · 4.9★",
  },
  {
    handle: "WhaleHunter",
    verified: true,
    role: "Bots creator",
    quote: "Webhook nativo e split de pagamento automático. Lancei o bot na sexta, primeira venda em 11 minutos.",
    metric: "312 vendas",
  },
  {
    handle: "MindsetFX",
    verified: false,
    role: "Education creator",
    quote: "Saí de aulas avulsas no Instagram para um produto recorrente com 1,2k alunos ativos.",
    metric: "1,234 alunos",
  },
  {
    handle: "AlertsLab",
    verified: true,
    role: "Alerts creator",
    quote: "O sistema de reviews verificadas filtrou clientes errados e dobrou minha taxa de retenção.",
    metric: "92% retention",
  },
];

export function CreatorTestimonials() {
  return (
    <section className="space-y-3">
      <header className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Creator stories</h2>
        <span className="text-xs text-muted-foreground">Depoimentos de criadores verificados</span>
      </header>
      <div className="overflow-x-auto -mx-5 px-5 pb-2 scrollbar-thin">
        <div className="flex gap-3.5 min-w-min snap-x snap-mandatory">
          {TESTIMONIALS.map((t) => (
            <article
              key={t.handle}
              className="snap-start w-[340px] shrink-0 rounded-xl border border-border bg-card/40 hover:border-[#378ADD]/40 transition-colors p-4 flex flex-col gap-3"
            >
              <Quote className="size-4 text-[#5fa8ff]/70" />
              <p className="text-[13px] leading-relaxed text-foreground/85 flex-1">"{t.quote}"</p>
              <div className="flex items-center gap-2.5 pt-2 border-t border-border/60">
                <div className="size-8 rounded-full bg-gradient-to-br from-[#378ADD]/30 to-[#5fa8ff]/10 border border-border flex items-center justify-center text-[10px] font-semibold">
                  {t.handle.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium flex items-center gap-1">
                    @{t.handle}
                    {t.verified && <BadgeCheck className="size-3 text-[#5fa8ff]" />}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground">{t.role}</div>
                </div>
                <span className="text-[10.5px] font-medium text-emerald-400 tabular-nums">{t.metric}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

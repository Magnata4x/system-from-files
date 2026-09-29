import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Check, X, Sparkles, Minus, Play, Award } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PLANS, COMPARISON, FAQS, type CompareCell } from "@/lib/pricing-data";
import { cn } from "@/lib/utils";

export function PricingContent() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="max-w-6xl mx-auto px-5 py-12 space-y-16">
      <Header annual={annual} setAnnual={setAnnual} />
      <PlanGrid annual={annual} />
      <ComparisonTable />
      <Faq />
      <MrrSimulator annual={annual} />
      <Footnote />
    </div>
  );
}

function Header({ annual, setAnnual }: { annual: boolean; setAnnual: (v: boolean) => void }) {
  return (
    <header className="text-center space-y-5">
      <h1 className="text-[28px] md:text-[34px] font-semibold tracking-tight">Escolha seu plano</h1>
      <p className="text-muted-foreground text-sm">
        Comece gratuitamente por 7 dias. Cancele quando quiser.
      </p>
      <div className="inline-flex items-center gap-3 rounded-full bg-card border border-border px-4 py-2">
        <span className={cn("text-xs font-medium transition-colors", !annual ? "text-foreground" : "text-muted-foreground")}>
          Mensal
        </span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={cn("text-xs font-medium transition-colors", annual ? "text-foreground" : "text-muted-foreground")}>
          Anual
        </span>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 uppercase tracking-wider">
          Economize 20%
        </span>
      </div>
    </header>
  );
}

function PlanGrid({ annual }: { annual: boolean }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[1000px] mx-auto">
      {PLANS.map((p) => {
        const price = annual ? p.annualMonthly : p.monthly;
        const annualBilled = p.annualMonthly * 12;
        const annualSavings = (p.monthly - p.annualMonthly) * 12;

        return (
          <div
            key={p.id}
            className={cn(
              "relative rounded-2xl bg-card/50 p-6 flex flex-col transition-all",
              p.featured
                ? "border-2 border-[#378ADD] shadow-[0_0_40px_-10px_rgba(55,138,221,0.5)] md:-translate-y-2"
                : "border border-border"
            )}
          >
            {p.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#378ADD] text-white text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="size-3" /> Mais popular
              </div>
            )}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              {!p.featured && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground uppercase tracking-wider">
                  {p.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 mb-5">{p.tagline}</p>

            <div className="mb-5 min-h-[88px]">
              {p.showPrice ? (
                <>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tabular-nums">
                      R$<TweenNumber value={price} />
                    </span>
                    <span className="text-sm text-muted-foreground">/mês</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {annual ? `Cobrado R$${annualBilled.toLocaleString("pt-BR")}/ano` : "Cobrado mensalmente"}
                  </p>
                  {annual && (
                    <p className="text-[11px] text-emerald-300 mt-0.5">
                      Você economiza R${annualSavings.toLocaleString("pt-BR")}/ano
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="text-2xl font-semibold">Sob consulta</div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Preço customizado conforme volume e SLA
                  </p>
                </>
              )}
            </div>

            <ul className="space-y-2.5 mb-6 flex-1">
              {p.features.map((f) => (
                <li key={f.label} className="flex items-start gap-2 text-[13px]">
                  {f.included ? (
                    <Check className="size-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : (
                    <X className="size-4 text-muted-foreground/40 mt-0.5 shrink-0" />
                  )}
                  <span className={cn(f.included ? "text-foreground/90" : "text-muted-foreground/50 line-through")}>
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              variant={p.ctaVariant === "primary" ? "default" : "outline"}
              className={cn(
                "w-full",
                p.ctaVariant === "primary" && "bg-[#378ADD] hover:bg-[#378ADD]/90 text-white"
              )}
            >
              {p.cta}
            </Button>
            <button
              onClick={() =>
                toast.success(`Demo de 14 dias ativada — ${p.name}`, {
                  description: "Acesso completo às features deste plano, sem cartão de crédito.",
                  icon: <Play className="size-4" />,
                })
              }
              className="mt-2.5 w-full text-center text-[11px] text-muted-foreground hover:text-[#7BB5F0] transition-colors flex items-center justify-center gap-1 group"
            >
              <Play className="size-3 group-hover:scale-110 transition-transform" />
              Start with demo · 14 dias sem pagamento
            </button>
          </div>
        );
      })}
    </div>
  );
}

function TweenNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) return;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <>{Math.round(display)}</>;
}

function ComparisonTable() {
  return (
    <section>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Compare todos os recursos</h2>
        <p className="text-sm text-muted-foreground mt-1">Veja em detalhe o que cada plano entrega.</p>
      </div>
      <div className="rounded-xl border border-border overflow-hidden bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Recurso</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Starter</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider bg-[#378ADD]/10 text-[#7BB5F0]">Pro</th>
                <th className="px-4 py-3 font-medium text-xs uppercase tracking-wider">Institutional</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((group) => (
                <Fragment key={group.group}>
                  <tr className="bg-secondary/20">
                    <td colSpan={4} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.group}
                    </td>
                  </tr>
                  {group.rows.map((r) => (
                    <tr key={r.feature} className="border-t border-border/60 hover:bg-secondary/10">
                      <td className="px-4 py-3 text-foreground/90">{r.feature}</td>
                      <td className="px-4 py-3 text-center"><Cell v={r.starter} /></td>
                      <td className="px-4 py-3 text-center bg-[#378ADD]/5"><Cell v={r.pro} highlight /></td>
                      <td className="px-4 py-3 text-center"><Cell v={r.institutional} /></td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 z-10">
              <tr className="border-t-2 border-[#378ADD]/40 bg-background/95 backdrop-blur">
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Veredito
                </td>
                <td className="px-4 py-3 text-center text-[11px] text-muted-foreground">
                  Entrada
                </td>
                <td className="px-4 py-3 text-center bg-gradient-to-b from-[#378ADD]/15 to-[#378ADD]/5 relative">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#378ADD] text-white text-[10px] font-semibold uppercase tracking-wider shadow-[0_0_18px_-4px_rgba(55,138,221,0.7)]">
                    <Award className="size-3" /> Best value
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-[11px] text-muted-foreground">
                  Para mesas
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  );
}

function Cell({ v, highlight }: { v: CompareCell; highlight?: boolean }) {
  if (v === true) return <Check className={cn("size-4 mx-auto", highlight ? "text-[#7BB5F0]" : "text-emerald-400")} />;
  if (v === false) return <Minus className="size-4 mx-auto text-muted-foreground/40" />;
  return <span className={cn("text-xs", highlight ? "text-[#7BB5F0] font-medium" : "text-foreground/85")}>{v}</span>;
}

function Faq() {
  return (
    <section className="max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Perguntas frequentes</h2>
      </div>
      <Accordion type="single" collapsible className="rounded-xl border border-border bg-card/40 px-4">
        {FAQS.map((f, i) => (
          <AccordionItem key={i} value={`q-${i}`} className="border-border">
            <AccordionTrigger className="text-sm text-left hover:no-underline">{f.q}</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

function MrrSimulator({ annual }: { annual: boolean }) {
  const [starter, setStarter] = useState(20);
  const [pro, setPro] = useState(8);
  const [inst, setInst] = useState(1);

  const prices = useMemo(() => ({
    starter: annual ? 77 : 97,
    pro: annual ? 197 : 247,
    inst: annual ? 557 : 697,
  }), [annual]);

  const mrr = starter * prices.starter + pro * prices.pro + inst * prices.inst;
  const arr = mrr * 12;
  const totalClients = starter + pro + inst;
  const arpu = totalClients > 0 ? Math.round(mrr / totalClients) : 0;
  const fixedCosts = 12000;
  const breakeven = Math.ceil(fixedCosts / (prices.pro || 1));

  return (
    <section>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold">Simulador de MRR</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Projete sua receita combinando clientes em cada plano.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-xl border border-border bg-card/40 p-5 space-y-5">
          <SliderRow label="Clientes Starter" value={starter} max={500} onChange={setStarter} price={prices.starter} />
          <SliderRow label="Clientes Pro" value={pro} max={300} onChange={setPro} price={prices.pro} accent />
          <SliderRow label="Clientes Institutional" value={inst} max={50} onChange={setInst} price={prices.inst} />
        </div>

        <div className="rounded-xl border border-border bg-gradient-to-br from-[#378ADD]/10 to-card/40 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Metric label="MRR" value={`R$${mrr.toLocaleString("pt-BR")}`} accent />
            <Metric label="ARR" value={`R$${arr.toLocaleString("pt-BR")}`} />
            <Metric label="ARPU" value={`R$${arpu.toLocaleString("pt-BR")}`} />
            <Metric label="Clientes totais" value={totalClients.toString()} />
          </div>
          <div className="rounded-lg bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Breakeven estimado:</span> {breakeven} clientes Pro para cobrir R$12k/mês de custo fixo.
          </div>
          {!annual && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-2.5 text-xs text-emerald-200">
              Ative o ciclo anual e economize 20% — receita projetada permanece, custo do cliente cai.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SliderRow({ label, value, max, onChange, price, accent }: { label: string; value: number; max: number; onChange: (v: number) => void; price: number; accent?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{label}</span>
        <span className={cn("text-sm tabular-nums font-semibold", accent && "text-[#7BB5F0]")}>
          {value} <span className="text-[11px] text-muted-foreground font-normal">× R${price}</span>
        </span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} max={max} step={1} />
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-semibold mt-0.5 tabular-nums", accent && "text-[#7BB5F0]")}>{value}</div>
    </div>
  );
}

function Footnote() {
  return (
    <p className="text-center text-xs text-muted-foreground">
      Todos os preços em BRL. Impostos podem ser aplicados conforme localização.
    </p>
  );
}

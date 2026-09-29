import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, ArrowLeft, ArrowRight, Check, Rocket, Shield, ShieldAlert, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PROFILES, leverageRisk, type CalibProfile } from "@/lib/bot4x-data";
import { useBot4xStore } from "@/lib/bot4x-store";
import { useBot4xPrefs } from "@/lib/bot4x-prefs-store";

export const Route = createFileRoute("/_authenticated/bot4x/onboarding")({
  head: () => ({
    meta: [
      { title: "Bot4x Setup — AISignalRadar" },
      { name: "description", content: "Configure Bot4x: capital, allocation, leverage and calibration profile in 5 steps." },
    ],
  }),
  component: Bot4xOnboarding,
});

const STEPS = ["Capital", "Allocation", "Leverage", "Profile", "Review"] as const;

function Bot4xOnboarding() {
  const navigate = useNavigate();
  const setTotalCapital = useBot4xStore((s) => s.setTotalCapital);
  const setAllocationPct = useBot4xStore((s) => s.setAllocationPct);
  const setLeverage = useBot4xStore((s) => s.setLeverage);
  const setProfile = useBot4xStore((s) => s.setProfile);
  const setOnboardingDone = useBot4xPrefs((s) => s.setOnboardingDone);

  const [step, setStep] = useState(0);
  const [capital, setCapital] = useState(1000);
  const [allocation, setAllocation] = useState(30);
  const [leverage, setLev] = useState(3);
  const [profile, setProf] = useState<CalibProfile>("conservador");

  const activeCap = +(capital * (allocation / 100)).toFixed(2);
  const slot = +(activeCap / 3).toFixed(2);
  const risk = leverageRisk(leverage);
  const spec = PROFILES[profile];

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  const launch = () => {
    setTotalCapital(capital);
    setAllocationPct(allocation);
    setLeverage(leverage);
    setProfile(profile);
    setOnboardingDone(true);
    toast.success("Bot4x configurado", { description: "Iniciando em modo DEMO. Você pode alternar para REAL no painel." });
    navigate({ to: "/bot4x" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <header className="flex items-center gap-3 mb-6">
          <div className="size-10 rounded-full bg-[var(--brand-blue-deep)] flex items-center justify-center">
            <Cpu className="size-5 text-[var(--brand-cyan)]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Bot4x — Setup inicial</h1>
            <p className="text-xs text-muted-foreground">Configuração guiada em 5 passos. Tudo reversível depois no painel.</p>
          </div>
        </header>

        {/* Stepper */}
        <ol className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => {
            const active = i === step;
            const done = i < step;
            return (
              <li key={label} className="flex-1 flex items-center gap-2">
                <div
                  className={`flex items-center gap-2 text-[11px] font-medium whitespace-nowrap ${
                    active ? "text-foreground" : done ? "text-[var(--brand-cyan)]" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`size-5 rounded-full grid place-items-center text-[10px] border ${
                      active
                        ? "bg-[var(--brand-cyan)] text-background border-[var(--brand-cyan)]"
                        : done
                          ? "bg-[var(--brand-cyan)]/20 text-[var(--brand-cyan)] border-[var(--brand-cyan)]/40"
                          : "border-border"
                    }`}
                  >
                    {done ? <Check className="size-3" /> : i + 1}
                  </span>
                  {label}
                </div>
                {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
              </li>
            );
          })}
        </ol>

        <div className="rounded-2xl border border-border bg-card/40 p-6 min-h-[340px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Qual seu capital total?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Valor que você reserva para o bot. Não precisa ser tudo da carteira.</p>
                  </div>
                  <div>
                    <Label className="text-xs">Capital (USDT)</Label>
                    <Input
                      type="number"
                      min={100}
                      value={capital}
                      onChange={(e) => setCapital(Math.max(100, +e.target.value || 0))}
                      className="text-lg font-semibold tabular-nums"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[500, 1000, 2500, 5000, 10000].map((v) => (
                      <button
                        key={v}
                        onClick={() => setCapital(v)}
                        className={`px-3 py-1.5 rounded-full text-xs border ${
                          capital === v ? "border-[var(--brand-cyan)] text-[var(--brand-cyan)]" : "border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        ${v.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold">Quanto alocar ao bot?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Percentual do seu capital que ficará ativo em ordens. Recomendado: 20–40%.</p>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <Label className="text-xs">Alocação</Label>
                      <span className="text-2xl font-semibold tabular-nums text-[var(--brand-cyan)]">{allocation}%</span>
                    </div>
                    <Slider value={[allocation]} min={5} max={100} step={5} onValueChange={(v) => setAllocation(v[0])} />
                  </div>
                  <div className="rounded-lg border border-border bg-background/40 p-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Capital ativo</span><span className="font-semibold tabular-nums">${activeCap.toLocaleString()}</span></div>
                    <div className="flex justify-between mt-1"><span className="text-muted-foreground">Tamanho por slot (3 simultâneos)</span><span className="font-semibold tabular-nums">${slot.toLocaleString()}</span></div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-lg font-semibold">Qual alavancagem?</h2>
                    <p className="text-sm text-muted-foreground mt-1">Multiplicador aplicado a cada posição. Maior leverage = maior risco de liquidação.</p>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <Label className="text-xs">Leverage</Label>
                      <span className="text-2xl font-semibold tabular-nums" style={{ color: risk.color }}>{leverage}x</span>
                    </div>
                    <Slider value={[leverage]} min={1} max={10} step={1} onValueChange={(v) => setLev(v[0])} />
                  </div>
                  <div className="rounded-lg border p-3 text-sm" style={{ borderColor: `${risk.color}55`, background: `color-mix(in oklab, ${risk.color} 8%, transparent)` }}>
                    <div className="font-semibold" style={{ color: risk.color }}>{risk.label}</div>
                    <p className="text-xs text-muted-foreground mt-1">{risk.diagnosis}</p>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold">Perfil de calibração</h2>
                    <p className="text-sm text-muted-foreground mt-1">Define o filtro de sinais aceitos pelo bot.</p>
                  </div>
                  <RadioGroup value={profile} onValueChange={(v) => setProf(v as CalibProfile)} className="grid gap-2">
                    {Object.values(PROFILES).map((p) => (
                      <label
                        key={p.id}
                        htmlFor={`prof-${p.id}`}
                        className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                          profile === p.id ? "border-[var(--brand-cyan)] bg-[var(--brand-cyan)]/5" : "border-border hover:border-muted-foreground"
                        }`}
                      >
                        <RadioGroupItem value={p.id} id={`prof-${p.id}`} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm" style={{ color: p.color }}>{p.name}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">WR esperado {p.wr}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.desc}</p>
                        </div>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2"><Rocket className="size-5 text-[var(--brand-cyan)]" /> Revisar e lançar</h2>
                    <p className="text-sm text-muted-foreground mt-1">Você começa em <span className="font-semibold text-foreground">modo DEMO</span>. Alterne para REAL no painel quando estiver pronto.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <SummaryCell label="Capital total" value={`$${capital.toLocaleString()}`} />
                    <SummaryCell label="Alocação" value={`${allocation}% · $${activeCap.toLocaleString()}`} />
                    <SummaryCell label="Leverage" value={`${leverage}x`} accent={risk.color} />
                    <SummaryCell label="Perfil" value={spec.name} accent={spec.color} />
                  </div>
                  <div className="rounded-lg border border-[#1D9E75]/40 bg-[#1D9E75]/5 p-3 flex items-start gap-2 text-xs">
                    <Shield className="size-4 text-[#1D9E75] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#1D9E75]">Proteções ativas:</span>{" "}
                      <span className="text-muted-foreground">disjuntor diário em −1.5%, trailing stop em +3%, máx 3 ordens simultâneas.</span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-[#EF9F27]/40 bg-[#EF9F27]/5 p-3 flex items-start gap-2 text-xs">
                    <ShieldAlert className="size-4 text-[#EF9F27] shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">DEMO usa dados simulados. Nenhuma ordem real é enviada à corretora antes da troca de modo.</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-6">
          <Button variant="ghost" onClick={prev} disabled={step === 0}>
            <ArrowLeft className="size-4 mr-1" /> Voltar
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={next} className="bg-[var(--brand-cyan)] text-background hover:bg-[var(--brand-cyan)]/90">
              Próximo <ArrowRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={launch} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white">
              <Zap className="size-4 mr-1" /> Lançar Bot4x
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold tabular-nums mt-1" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}

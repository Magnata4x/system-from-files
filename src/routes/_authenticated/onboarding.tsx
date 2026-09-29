import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingPage,
});

const EXPERIENCE = [
  { id: "beginner", label: "Beginner", hint: "Less than 1 year" },
  { id: "intermediate", label: "Intermediate", hint: "1–3 years" },
  { id: "advanced", label: "Advanced", hint: "3+ years" },
  { id: "professional", label: "Professional", hint: "Trading is my job" },
];
const MARKETS = ["Crypto", "Forex", "Stocks", "Indices", "Futures"];
const GOALS = [
  "Better entries",
  "Avoid manipulation",
  "Understand context",
  "Improve consistency",
  "Reduce emotional trading",
];

function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [experience, setExperience] = useState<string | null>(null);
  const [markets, setMarkets] = useState<string[]>([]);
  const [goal, setGoal] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("onboarding_completed").eq("id", user.id).maybeSingle();
      if (data?.onboarding_completed) navigate({ to: "/dashboard" });
    })();
  }, [user, navigate]);

  const canContinue = step === 0 ? !!experience : step === 1 ? markets.length > 0 : !!goal;

  async function finish() {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      experience,
      markets,
      goal,
      onboarding_completed: true,
    });
    navigate({ to: "/dashboard" });
  }

  const next = () => {
    if (step < 2) { setDirection(1); setStep(step + 1); }
    else finish();
  };
  const skip = () => navigate({ to: "/dashboard" });

  return (
    <div className="min-h-screen bg-background bg-dot-grid flex flex-col">
      <header className="px-6 py-5 flex items-center gap-3 border-b border-border">
        <BrandLogo size={36} />
        <div className="flex flex-col leading-tight">
          <span className="text-base font-medium">AISignalRadar</span>
          <span className="text-[11px] text-muted-foreground">Setup</span>
        </div>
      </header>

      <div className="px-6 pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full transition-all duration-500"
                  style={{ width: i <= step ? "100%" : "0%", background: "var(--brand-cyan)" }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Step {step + 1} of 3</p>
        </div>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl overflow-hidden">
          <div
            key={step}
            className="animate-in fade-in slide-in-from-right-8 duration-300"
            style={{
              animationDirection: direction === 1 ? "normal" : "reverse",
              animation: `scale-up-enter 0.35s ease-out ${direction === 1 ? "forwards" : "reverse forwards"}`,
            }}
          >
            {step === 0 && (
              <StepWrapper title="What's your trading experience?" subtitle="We'll tailor signals to your level.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {EXPERIENCE.map((o) => (
                    <SelectCard key={o.id} active={experience === o.id} onClick={() => setExperience(o.id)}>
                      <div className="font-medium">{o.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{o.hint}</div>
                    </SelectCard>
                  ))}
                </div>
              </StepWrapper>
            )}
            {step === 1 && (
              <StepWrapper title="What do you trade?" subtitle="Select all that apply.">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {MARKETS.map((m) => {
                    const active = markets.includes(m);
                    return (
                      <SelectCard
                        key={m}
                        active={active}
                        onClick={() => setMarkets(active ? markets.filter((x) => x !== m) : [...markets, m])}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{m}</span>
                          {active && <Check className="size-4" style={{ color: "var(--brand-cyan)" }} />}
                        </div>
                      </SelectCard>
                    );
                  })}
                </div>
              </StepWrapper>
            )}
            {step === 2 && (
              <StepWrapper title="What's your main goal?" subtitle="We'll prioritize insights toward this outcome.">
                <div className="grid grid-cols-1 gap-2.5">
                  {GOALS.map((g) => (
                    <SelectCard key={g} active={goal === g} onClick={() => setGoal(g)}>
                      <span className="font-medium">{g}</span>
                    </SelectCard>
                  ))}
                </div>
              </StepWrapper>
            )}
          </div>
        </div>
      </main>

      <footer className="px-6 py-5 border-t border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => { if (step > 0) { setDirection(-1); setStep(step - 1); } }}
            disabled={step === 0}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            ← Back
          </button>
          <div className="flex items-center gap-4">
            <button onClick={skip} className="text-sm text-muted-foreground hover:text-foreground">Skip</button>
            <button
              onClick={next}
              disabled={!canContinue || saving}
              className="h-11 px-6 rounded-lg text-sm font-medium text-primary-foreground flex items-center gap-2 disabled:opacity-50 transition-opacity hover:opacity-90"
              style={{ background: "var(--brand-blue)" }}
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : (
                <>
                  {step === 2 ? "Start using AISignalRadar" : "Continue"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepWrapper({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-medium text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{subtitle}</p>
      {children}
    </div>
  );
}

function SelectCard({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border bg-card transition-all ${
        active
          ? "border-[var(--brand-cyan)] shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand-cyan)_15%,transparent)]"
          : "border-border hover:border-[color-mix(in_oklab,var(--brand-cyan)_50%,var(--border))]"
      }`}
    >
      {children}
    </button>
  );
}

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { BrandLogo, GoogleIcon } from "@/components/brand-logo";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — AISignalRadar" },
      { name: "description", content: "Sign in to AISignalRadar — the trading intelligence platform." },
    ],
  }),
  component: LoginPage,
});

type View = "auth" | "forgot" | "forgot-sent";
type Tab = "signin" | "signup";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email"),
  password: z.string().min(1, "Password required"),
  remember: z.boolean().optional(),
});

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Invalid email"),
    password: z
      .string()
      .min(12, "A senha deve ter no mínimo 12 caracteres")
      .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
      .regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula")
      .regex(/[0-9]/, "A senha deve conter pelo menos um dígito")
      .regex(/[^A-Za-z0-9]/, "A senha deve conter pelo menos um caractere especial"),
    confirm: z.string(),
    terms: z.literal(true, { errorMap: () => ({ message: "Please accept the terms" }) }),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "Passwords don't match" });

const forgotSchema = z.object({ email: z.string().trim().email("Invalid email") });

// Cinco critérios alinhados ao signUpSchema: comprimento, maiúscula,
// minúscula, dígito e caractere especial. Cada um vale 1 ponto (0–5).
function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}


function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [view, setView] = useState<View>("auth");
  const [tab, setTab] = useState<Tab>("signin");
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (!loading && session) routeAfterLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session]);

  async function routeAfterLogin() {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (!uid) return;
    const { data } = await supabase.from("profiles").select("onboarding_completed").eq("id", uid).maybeSingle();
    navigate({ to: data?.onboarding_completed ? "/dashboard" : "/onboarding" });
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background bg-dot-grid px-4 py-10 relative overflow-hidden">
      {/* Radar pulse behind card */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <div
          className="rounded-full border border-[var(--brand-cyan)]"
          style={{
            width: 420,
            height: 420,
            animation: "radar-pulse 6s ease-out infinite",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--brand-cyan)]"
          style={{
            width: 420,
            height: 420,
            animation: "radar-pulse 6s ease-out infinite",
            animationDelay: "3s",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-[420px] rounded-2xl border border-border bg-card shadow-xl shadow-black/40">
        <div className="p-7">
          <div className="flex items-center gap-3">
            <BrandLogo size={42} />
            <div className="flex flex-col leading-tight">
              <span className="text-[20px] font-medium text-foreground">AISignalRadar</span>
              <span className="text-[12px] text-muted-foreground">Intelligence Platform</span>
            </div>
          </div>
          <div className="my-6 h-px bg-border" />

          {view === "auth" && (
            <>
              <PillTabs tab={tab} onChange={setTab} />
              <div className="mt-6">
                {tab === "signin" ? (
                  <SignInForm onForgot={() => setView("forgot")} />
                ) : (
                  <SignUpForm />
                )}
              </div>
            </>
          )}

          {view === "forgot" && (
            <ForgotForm
              onBack={() => setView("auth")}
              onSent={(email) => {
                setResetEmail(email);
                setView("forgot-sent");
              }}
            />
          )}

          {view === "forgot-sent" && (
            <ForgotSent email={resetEmail} onBack={() => setView("auth")} />
          )}
        </div>
      </div>
    </div>
  );
}

function PillTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-secondary p-1">
      <button
        type="button"
        onClick={() => onChange("signin")}
        className={`relative z-10 rounded-full py-2 text-sm font-medium transition-colors ${
          tab === "signin" ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Sign In
      </button>
      <button
        type="button"
        onClick={() => onChange("signup")}
        className={`relative z-10 rounded-full py-2 text-sm font-medium transition-colors ${
          tab === "signup" ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        Create account
      </button>
      <div
        className="absolute top-1 bottom-1 w-1/2 rounded-full bg-card transition-transform duration-300 ease-out border border-border"
        style={{ transform: tab === "signin" ? "translateX(0)" : "translateX(100%)" }}
      />
    </div>
  );
}

function Field({
  icon,
  error,
  children,
}: {
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className={`group flex items-center gap-2 rounded-lg border bg-secondary/50 px-3 h-11 transition-colors focus-within:border-[var(--brand-cyan)] ${
          error ? "border-destructive" : "border-border"
        }`}
      >
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

const inputCls =
  "flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none";

function PrimaryButton({
  loading,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className="w-full h-11 rounded-lg text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center"
      style={{ background: "var(--brand-blue)" }}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : children}
    </button>
  );
}

function GoogleButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="w-full h-11 rounded-lg border border-border flex items-center justify-center gap-3 text-sm font-medium text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-60"
      style={{ background: "var(--card)" }}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <GoogleIcon />}
      Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or continue with</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

async function signInWithGoogle() {
  const result = await lovable.auth.signInWithOAuth("google", {
    redirect_uri: window.location.origin + "/login",
  });
  return result;
}

function SignInForm({ onForgot }: { onForgot: () => void }) {
  const [showPw, setShowPw] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof signInSchema>>({ resolver: zodResolver(signInSchema) });

  const onSubmit = async (v: z.infer<typeof signInSchema>) => {
    setFormErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
    if (error) setFormErr(error.message);
  };

  async function signInDemo() {
    setFormErr(null);
    // Throttle client-side: no máximo 1 tentativa demo a cada 60s por aba.
    // Não substitui o rate limit server-side, apenas reduz ruído acidental.
    const THROTTLE_MS = 60_000;
    const STORAGE_KEY = "demo_last_attempt";
    try {
      const last = Number(sessionStorage.getItem(STORAGE_KEY) ?? 0);
      const elapsed = Date.now() - last;
      if (last && elapsed < THROTTLE_MS) {
        const remaining = Math.ceil((THROTTLE_MS - elapsed) / 1000);
        setFormErr(`Aguarde ${remaining} segundos antes de tentar novamente.`);
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      // sessionStorage indisponível (modo privado raro) — segue sem throttle local.
    }
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo-session", { method: "POST" });
      if (!res.ok) throw new Error(`Demo session failed (${res.status})`);
      const { access_token, refresh_token } = await res.json();
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      if (error) throw error;
    } catch (err) {
      setFormErr(err instanceof Error ? err.message : "Demo sign-in failed");
    } finally {
      setDemoLoading(false);
    }
  }


  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field icon={<Mail className="size-4" />} error={errors.email?.message}>
        <input type="email" placeholder="Email" autoComplete="email" className={inputCls} {...register("email")} />
      </Field>
      <Field icon={<Lock className="size-4" />} error={errors.password?.message}>
        <input
          type={showPw ? "text" : "password"}
          placeholder="Password"
          autoComplete="current-password"
          className={inputCls}
          {...register("password")}
        />
        <button type="button" onClick={() => setShowPw((v) => !v)} className="text-muted-foreground hover:text-foreground">
          {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </Field>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
          <input type="checkbox" {...register("remember")} className="size-4 rounded border-border bg-secondary accent-[var(--brand-blue)]" />
          Remember me
        </label>
        <button type="button" onClick={onForgot} className="text-[var(--brand-cyan)] hover:underline">
          Forgot password?
        </button>
      </div>

      {formErr && <p className="text-xs text-destructive">{formErr}</p>}

      <PrimaryButton loading={isSubmitting} type="submit">Sign in</PrimaryButton>

      <div className="text-center">
        <button
          type="button"
          onClick={signInDemo}
          disabled={demoLoading}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-[var(--brand-cyan)] transition-colors disabled:opacity-60"
        >
          {demoLoading && <Loader2 className="size-3 animate-spin" />}
          New here? Try demo
        </button>
      </div>

      <Divider />
      <GoogleButton
        loading={googleLoading}
        onClick={async () => {
          setGoogleLoading(true);
          const r = await signInWithGoogle();
          if (r.error) { setFormErr(r.error.message ?? "Google sign-in failed"); setGoogleLoading(false); }
        }}
      />

      <p className="text-[11px] text-muted-foreground text-center pt-2">
        By signing in you agree to our{" "}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          Terms of Service
        </a>
      </p>
    </form>
  );
}

function SignUpForm() {
  const [showPw, setShowPw] = useState(false);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [signedUp, setSignedUp] = useState(false);
  const [signedUpEmail, setSignedUpEmail] = useState("");
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof signUpSchema>>({ resolver: zodResolver(signUpSchema) });

  const pw = watch("password") ?? "";
  const strength = passwordStrength(pw);
  const strengthColors = [
    "var(--destructive)",
    "var(--destructive)",
    "var(--warning)",
    "var(--warning)",
    "var(--success)",
  ];


  const onSubmit = async (v: z.infer<typeof signUpSchema>) => {
    setFormErr(null);
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: v.fullName },
      },
    });
    if (error) { setFormErr(error.message); return; }
    // Supabase retorna session=null quando email confirmation está habilitado.
    // Quando session != null, o usuário já está logado (confirmação desativada)
    // e o onAuthStateChange do root cuida do redirecionamento.
    if (!data.session) {
      setSignedUpEmail(v.email);
      setSignedUp(true);
    }
  };

  if (signedUp) {
    return (
      <div className="text-center py-4">
        <div className="mx-auto size-14 rounded-full flex items-center justify-center mb-4 bg-emerald-500/20">
          <Check className="size-7 text-emerald-400" />
        </div>
        <h2 className="text-lg font-medium">Verifique seu email</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enviamos um link de confirmação para
        </p>
        <p className="text-sm font-medium mt-0.5">{signedUpEmail}</p>
        <p className="text-xs text-muted-foreground mt-3">
          Clique no link do email para ativar sua conta e fazer login.
        </p>
        <button
          type="button"
          onClick={() => { setSignedUp(false); setSignedUpEmail(""); }}
          className="mt-6 text-sm text-[var(--brand-cyan)] hover:underline"
        >
          Usar outro email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field icon={<User className="size-4" />} error={errors.fullName?.message}>
        <input placeholder="Full name" autoComplete="name" className={inputCls} {...register("fullName")} />
      </Field>
      <Field icon={<Mail className="size-4" />} error={errors.email?.message}>
        <input type="email" placeholder="Email" autoComplete="email" className={inputCls} {...register("email")} />
      </Field>
      <Field icon={<Lock className="size-4" />} error={errors.password?.message}>
        <input
          type={showPw ? "text" : "password"}
          placeholder="Password"
          autoComplete="new-password"
          className={inputCls}
          {...register("password")}
        />
        <button type="button" onClick={() => setShowPw((v) => !v)} className="text-muted-foreground hover:text-foreground">
          {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </Field>

      <div className="grid grid-cols-5 gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (

          <div
            key={i}
            className="h-1 rounded-full bg-secondary overflow-hidden"
            style={{ background: i < strength ? strengthColors[strength - 1] : undefined }}
          />
        ))}
      </div>

      <Field icon={<Lock className="size-4" />} error={errors.confirm?.message}>
        <input
          type={showPw ? "text" : "password"}
          placeholder="Confirm password"
          autoComplete="new-password"
          className={inputCls}
          {...register("confirm")}
        />
      </Field>

      <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer pt-1">
        <input type="checkbox" {...register("terms")} className="mt-0.5 size-4 rounded border-border bg-secondary accent-[var(--brand-blue)]" />
        <span>
          I agree to the{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-cyan)] hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[var(--brand-cyan)] hover:underline">
            Privacy Policy
          </a>
        </span>
      </label>
      {errors.terms && <p className="text-xs text-destructive">{errors.terms.message as string}</p>}

      {formErr && <p className="text-xs text-destructive">{formErr}</p>}

      <PrimaryButton loading={isSubmitting} type="submit">Create account</PrimaryButton>

      <Divider />
      <GoogleButton
        loading={googleLoading}
        onClick={async () => {
          setGoogleLoading(true);
          const r = await signInWithGoogle();
          if (r.error) { setFormErr(r.error.message ?? "Google sign-in failed"); setGoogleLoading(false); }
        }}
      />
    </form>
  );
}

function ForgotForm({ onBack, onSent }: { onBack: () => void; onSent: (email: string) => void }) {
  const [formErr, setFormErr] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async (v: z.infer<typeof forgotSchema>) => {
    setFormErr(null);
    const { error } = await supabase.auth.resetPasswordForEmail(v.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setFormErr(error.message); return; }
    onSent(v.email);
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Back
      </button>
      <h2 className="text-lg font-medium text-foreground">Reset your password</h2>
      <p className="text-sm text-muted-foreground mb-5">We'll send a reset link to your email.</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <Field icon={<Mail className="size-4" />} error={errors.email?.message}>
          <input type="email" placeholder="Email" className={inputCls} {...register("email")} />
        </Field>
        {formErr && <p className="text-xs text-destructive">{formErr}</p>}
        <PrimaryButton loading={isSubmitting} type="submit">Send reset link</PrimaryButton>
      </form>
    </div>
  );
}

function ForgotSent({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="text-center py-4">
      <div className="mx-auto size-14 rounded-full flex items-center justify-center mb-4" style={{ background: "color-mix(in oklab, var(--success) 20%, transparent)" }}>
        <Check className="size-7" style={{ color: "var(--success)" }} />
      </div>
      <h2 className="text-lg font-medium text-foreground">Check your inbox</h2>
      <p className="text-sm text-muted-foreground mt-1">We sent a reset link to</p>
      <p className="text-sm text-foreground font-medium mt-0.5">{email}</p>
      <button onClick={onBack} className="mt-6 text-sm text-[var(--brand-cyan)] hover:underline">
        Back to sign in
      </button>
    </div>
  );
}

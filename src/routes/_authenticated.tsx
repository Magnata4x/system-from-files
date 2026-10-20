import { createFileRoute, useNavigate, useLocation, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState, lazy, Suspense } from "react";
import { Bot4xCompactPill } from "@/components/global/bot4x-compact-pill";
import { Bot4xGlobalNotifier } from "@/components/global/bot4x-notifier";
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav";
import { TourController } from "@/components/tour/tour-controller";
import { useBot4xStore } from "@/lib/bot4x-store";
import { useDnaAutoCorrector } from "@/lib/dna-auto-corrector";
import { useTraderProfile } from "@/hooks/useTraderProfile";
import { useMarketContext } from "@/hooks/useMarketContext";
import { useCopilotUI } from "@/lib/copilot-ui-store";
import { useStoreCleanup } from "@/hooks/useStoreCleanup";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthSession, getOnboardingStatus } from "@/lib/server-auth";
import { OfflineBanner } from "@/components/offline-banner";
import { MarketDataProvider } from "@/lib/market-data-store";


// PERF-01: code-split widgets pesados. CopilotPanel só monta após o
// usuário interagir com o Copilot (useCopilotUI.open).
const Bot4xFloatingWidget = lazy(() =>
  import("@/components/bot4x/floating-widget").then((m) => ({ default: m.Bot4xFloatingWidget })),
);
const CopilotPanel = lazy(() =>
  import("@/components/copilot/CopilotPanel").then((m) => ({ default: m.CopilotPanel })),
);

export const Route = createFileRoute("/_authenticated")({
  // SEG-01 (rev): camada server-side via createServerFn + bearer attacher.
  // - Em navegações client-side o functionMiddleware já anexa o Bearer; o
  //   handler valida o token contra o Supabase Auth e retorna a sessão.
  // - No SSR inicial (refresh / hard navigation) NÃO há bearer porque a
  //   sessão Supabase vive em localStorage; getAuthSession retorna
  //   isAuthenticated:false e DEIXAMOS passar — o AuthGate client-side
  //   abaixo cobre esse caso (defense in depth).
  // TODO(seg): migrar sessão para cookie httpOnly para conseguir bloquear
  // o shell já no SSR sem causar redirect-loop em usuários autenticados.
  beforeLoad: async ({ location }) => {
    const auth = await getAuthSession();
    if (auth.isAuthenticated) {
      // O setup do Bot4x é independente do onboarding geral da conta.
      // Essas rotas precisam ficar fora do guard para evitar redirect loops.
      const onboardingExempt =
        location.pathname === "/onboarding" ||
        location.pathname === "/bot4x/onboarding";

      if (!onboardingExempt) {
        const onboarding = await getOnboardingStatus();
        if (!onboarding.completed) {
          throw redirect({ to: "/onboarding", replace: true });
        }
      }

      return { serverUserId: auth.userId };
    }
    // Sem bearer: pode ser SSR sem cookie de sessão. Não redireciona aqui
    // para evitar loop; AuthGate trata no client.
    if (typeof window !== "undefined") {
      // No client com bearer ausente/ inválido: redireciona.
      throw redirect({ to: "/login", replace: true });
    }
    return { serverUserId: undefined as string | undefined };
  },
  component: AuthGate,
});


function AuthGate() {
  const { session, loading } = useAuth();
  const { serverUserId } = Route.useRouteContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileCheck, setProfileCheck] = useState<"checking" | "ready" | "error">("checking");
  const [retryProfileCheck, setRetryProfileCheck] = useState(0);
  const userId = session?.user.id;
  const onboardingExempt =
    location.pathname === "/onboarding" || location.pathname === "/bot4x/onboarding";
  // Server verification is authoritative only for the same authenticated user.
  // SSR without a bearer falls back to the client-side profile check.
  const needsClientCheck = !onboardingExempt && (!serverUserId || serverUserId !== userId);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!needsClientCheck) {
      setProfileCheck("ready");
      return;
    }

    let cancelled = false;
    setProfileCheck("checking");
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setProfileCheck("error");
          return;
        }
        if (data?.onboarding_completed !== true) {
          navigate({ to: "/onboarding", replace: true });
          return;
        }
        setProfileCheck("ready");
      } catch {
        if (!cancelled) setProfileCheck("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, userId, needsClientCheck, navigate, retryProfileCheck]);

  if (profileCheck === "error") {
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível verificar seu perfil. Tente novamente.</p>
        <button
          type="button"
          onClick={() => setRetryProfileCheck((attempt) => attempt + 1)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (loading || !session || (!onboardingExempt && profileCheck !== "ready")) {
    // UX-01: skeleton que aproxima o shell (sidebar + topbar + conteúdo)
    // em vez de spinner de tela cheia — reduz CLS e flash visual.
    return (
      <div className="min-h-screen flex bg-background">
        <div className="hidden lg:block w-60 border-r border-border/40 p-4 space-y-3">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-2 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-14 border-b border-border/40 px-4 flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // Sessão confirmada: monta o app autenticado. Todos os hooks que dependem
  // de session vivem em AuthenticatedApp, garantindo que side effects
  // (initBot4x, useDnaAutoCorrector, useTraderProfile, useMarketContext) só
  // disparam após autenticação bem-sucedida.
  return <AuthenticatedApp session={session} />;
}

function AuthenticatedApp({ session }: { session: NonNullable<ReturnType<typeof useAuth>["session"]> }) {
  const navigate = useNavigate();
  const copilotOpen = useCopilotUI((s) => s.open);
  // Uma vez aberto, mantenha montado para preservar estado/conversa.
  const [copilotEverOpened, setCopilotEverOpened] = useState(false);
  useEffect(() => {
    if (copilotOpen) setCopilotEverOpened(true);
  }, [copilotOpen]);

  // PERF-01: só busca perfil/contexto de mercado quando o Copilot está
  // (ou já foi) aberto — evita canal Realtime e fetch desnecessários em
  // toda rota autenticada.
  const copilotActive = copilotEverOpened;
  const { profile } = useTraderProfile(copilotActive ? session.user.id : undefined);
  const { marketContext } = useMarketContext(copilotActive ? session.user.id : undefined);

  const initBot4x = useBot4xStore((s) => s.init);
  useDnaAutoCorrector(true, session.user.id);
  useStoreCleanup();

  useEffect(() => {
    initBot4x();
  }, [initBot4x]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "b" && e.key !== "B") return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || target.isContentEditable) return;
      if (target.closest("[contenteditable='true']")) return;
      e.preventDefault();
      navigate({ to: "/bot4x" });
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <MarketDataProvider>
      <OfflineBanner />
      <Outlet />
      <Suspense fallback={null}>
        <Bot4xFloatingWidget />
      </Suspense>
      <Bot4xCompactPill />
      <MobileBottomNav />
      <Bot4xGlobalNotifier />
      <TourController />
      {copilotEverOpened && (
        <Suspense fallback={null}>
          <CopilotPanel
            userId={session.user.id}
            token={session.access_token}
            mode="float"
            traderProfile={profile}
            marketContext={marketContext}
          />
        </Suspense>
      )}
    </MarketDataProvider>
  );
}

import { createFileRoute, useNavigate, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
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
import { getAuthSession } from "@/lib/server-auth";
import { OfflineBanner } from "@/components/offline-banner";

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
  beforeLoad: async () => {
    const auth = await getAuthSession();
    if (auth.isAuthenticated) {
      return { serverUserId: auth.userId };
    }
    // Sem bearer: pode ser SSR sem cookie de sessão. Não redireciona aqui
    // para evitar loop; AuthGate trata no client.
    if (typeof window !== "undefined") {
      // No client com bearer ausente/ inválido: redireciona.
      throw redirect({ to: "/login" });
    }
    return { serverUserId: undefined as string | undefined };
  },
  component: AuthGate,
});

function AuthGate() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/login" });
  }, [loading, session, navigate]);

  if (loading || !session) {
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

function AuthenticatedApp({
  session,
}: {
  session: NonNullable<ReturnType<typeof useAuth>["session"]>;
}) {
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
    <>
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
    </>
  );
}

import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTourStore } from "@/lib/tour-store";
import { TourOverlay } from "./tour-overlay";
import { TourHelpButton } from "./help-button";
import { WelcomeModal } from "./welcome-modal";
// FIX PERF-05: tour-content.ts (16KB de strings) é usado apenas no
// fluxo de onboarding — um evento de uso único. Importar estaticamente
// colocava 16KB no bundle principal carregado por TODOS os usuários,
// incluindo os que já completaram o onboarding.
// Agora é um import dinâmico lazy, tree-shaken do bundle principal.
// O tipo é importado apenas como referência estática (apagado no build).
import type { TourDef } from "@/lib/tour-content";

export function TourController() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const skipAll = useTourStore((s) => s.skipAll);
  const completedTours = useTourStore((s) => s.completedTours);
  const activeTour = useTourStore((s) => s.activeTour);
  const welcomeSeen = useTourStore((s) => s.welcomeSeen);
  const startTour = useTourStore((s) => s.startTour);
  const lastPath = useRef<string>("");

  useEffect(() => {
    if (lastPath.current === path) return;
    lastPath.current = path;
    if (skipAll || activeTour) return;

    // FIX PERF-05: import dinâmico — tour-content.ts só é carregado
    // quando o usuário está em uma rota que pode ter tour ativo e não
    // completou ainda. Usuários que já passaram pelo onboarding nunca
    // carregam este chunk (16KB economizados no bundle principal).
    void import("@/lib/tour-content").then(({ tourForRoute }) => {
      const tour: TourDef | undefined = tourForRoute(path);
      if (!tour || tour.manualOnly) return;
      if (completedTours.includes(tour.id)) return;
      // The dashboard tour starts only after Welcome modal is dismissed
      if (tour.id === "dashboard" && !welcomeSeen) return;
      const t = setTimeout(() => startTour(tour.id), 800);
      return () => clearTimeout(t);
    });
  }, [path, skipAll, activeTour, completedTours, welcomeSeen, startTour]);

  // Welcome modal only on /dashboard
  const showWelcome = path === "/dashboard" || path.startsWith("/dashboard/");

  return (
    <>
      {showWelcome && <WelcomeModal />}
      <TourOverlay />
      <TourHelpButton />
    </>
  );
}

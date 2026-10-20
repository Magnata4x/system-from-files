import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { lookupOnboarding } from "@/lib/onboarding-status";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AISignalRadar — Radar de sinais e execução algorítmica" },
      {
        name: "description",
        content:
          "Plataforma de sinais institucionais com IA, detecção de manipulação, DNA do trader e execução automática Bot4x.",
      },
      { property: "og:title", content: "AISignalRadar — Radar de sinais e execução algorítmica" },
      {
        property: "og:description",
        content:
          "Sinais em tempo real, análise de manipulação e execução algorítmica calibrada pelo seu perfil de trader.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [lookupError, setLookupError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login", replace: true });
      return;
    }

    let cancelled = false;
    setLookupError(false);
    void lookupOnboarding(session.user.id).then((result) => {
      if (cancelled) return;
      if (result === "error") {
        setLookupError(true);
        return;
      }
      navigate({
        to: result === "completed" ? "/dashboard" : "/onboarding",
        replace: true,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [loading, session, navigate, attempt]);

  if (lookupError) {
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="text-sm text-muted-foreground">Não foi possível verificar seu perfil. Tente novamente.</p>
        <button
          type="button"
          onClick={() => setAttempt((value) => value + 1)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

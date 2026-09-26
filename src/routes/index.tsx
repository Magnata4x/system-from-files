import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

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

  useEffect(() => {
    if (loading) return;
    if (!session) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", session.user.id)
        .maybeSingle();
      navigate({ to: data?.onboarding_completed ? "/dashboard" : "/onboarding" });
    })();
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

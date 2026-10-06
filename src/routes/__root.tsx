import { Component, type ReactNode, type ErrorInfo, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import * as Sentry from "@sentry/react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { backendWs } from "@/adapters/backend/ws-client";
import { initSentry } from "@/lib/sentry";
import { logger } from "@/lib/logger";
import { registerPWA } from "@/lib/pwa/register";

// Idempotente — múltiplas chamadas (HMR, SSR rehydrate) são no-op.
initSentry();

const IS_DEV = import.meta.env.DEV;

// Padrões de erro intencionalmente amigáveis (lançados pelo próprio app)
// cujas mensagens são seguras para exibir ao usuário final.
const SAFE_ERROR_PATTERNS: RegExp[] = [
  /Missing Supabase environment variable/i,
  /API base URL n[ãa]o configurada/i,
  /Unauthorized/i,
];

function getSafeErrorMessage(error: Error): string {
  const msg = error.message || "";
  if (SAFE_ERROR_PATTERNS.some((p) => p.test(msg))) return msg;
  return "Ocorreu um erro inesperado. Nossa equipe foi notificada.";
}



// GlobalErrorBoundary: captura erros de runtime em componentes fora do ciclo
// de rotas (ex: Zustand side effects, providers, lazy chunks). Sem isso, esses
// erros resultam em tela branca sem nenhuma mensagem ao usuário.
interface EBState { error: Error | null }
class GlobalErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error("[GlobalErrorBoundary]", {
      error,
      componentStack: info.componentStack,
    });
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack },
    });
  }
  render() {
    if (this.state.error) {
      const rawMsg = this.state.error.message || "";
      const safeMsg = getSafeErrorMessage(this.state.error);
      const isMissingSupabaseEnv = /Missing Supabase environment variable/i.test(rawMsg);

      if (isMissingSupabaseEnv) {
        const missingMatch = rawMsg.match(/variable\(s\):\s*([^.]+)\./i);
        const missing = missingMatch ? missingMatch[1].trim() : "SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY";
        return (
          <div style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center", padding:"1.5rem", background:"#0a0a0a", fontFamily:"system-ui, sans-serif" }}>
            <div style={{ maxWidth:"34rem", width:"100%", color:"#fff", background:"#141414", border:"1px solid #2a2a2a", borderRadius:"0.75rem", padding:"2rem" }}>
              <div style={{ display:"flex", alignItems:"center", gap:"0.75rem", marginBottom:"1rem" }}>
                <div style={{ width:"2.5rem", height:"2.5rem", borderRadius:"0.5rem", background:"#f59e0b22", color:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.25rem" }}>⚠</div>
                <h1 style={{ fontSize:"1.125rem", fontWeight:600, margin:0 }}>Backend não configurado</h1>
              </div>
              <p style={{ fontSize:"0.875rem", color:"#a3a3a3", lineHeight:1.6, marginTop:0 }}>
                O app não conseguiu se conectar ao Lovable Cloud porque variáveis de ambiente obrigatórias estão ausentes no build:
              </p>
              <code style={{ display:"block", background:"#000", padding:"0.625rem 0.875rem", borderRadius:"0.375rem", fontSize:"0.8125rem", color:"#f59e0b", margin:"0.75rem 0 1.25rem", border:"1px solid #2a2a2a" }}>
                {missing}
              </code>
              <div style={{ fontSize:"0.875rem", color:"#d4d4d4" }}>
                <p style={{ fontWeight:600, margin:"0 0 0.5rem" }}>Como resolver:</p>
                <ol style={{ paddingLeft:"1.25rem", margin:0, lineHeight:1.7 }}>
                  <li>No editor Lovable, abra o painel lateral e clique em <strong>Cloud</strong> (ou <strong>View Backend</strong>) para verificar se o Lovable Cloud está ativo neste projeto.</li>
                  <li>Se acabou de rotacionar as chaves ou reconectar o backend, reinicie o servidor de desenvolvimento (o Vite só lê <code>VITE_*</code> no startup).</li>
                  <li>Em produção, confirme que o deploy foi refeito após a última rotação — variáveis trocadas não chegam ao bundle até um novo build.</li>
                  <li>Se o problema persistir, no editor diga <em>"reconectar o Lovable Cloud"</em> para regenerar o <code>.env</code> gerenciado.</li>
                </ol>
              </div>
              <button
                onClick={() => { this.setState({ error: null }); window.location.reload(); }}
                style={{ marginTop:"1.5rem", padding:"0.625rem 1rem", background:"#7c3aed", color:"#fff", border:"none", borderRadius:"0.375rem", cursor:"pointer", fontSize:"0.875rem", fontWeight:500 }}
              >
                Recarregar
              </button>
              {IS_DEV && (
                <details style={{ marginTop:"1rem", fontSize:"0.75rem", color:"#737373" }}>
                  <summary style={{ cursor:"pointer" }}>Detalhes técnicos (dev)</summary>
                  <pre style={{ whiteSpace:"pre-wrap", marginTop:"0.5rem" }}>{rawMsg}</pre>
                </details>
              )}
            </div>
          </div>
        );
      }

      return (
        <div style={{ display:"flex", minHeight:"100vh", alignItems:"center", justifyContent:"center", padding:"1rem", background:"#000" }}>
          <div style={{ maxWidth:"28rem", textAlign:"center", color:"#fff" }}>
            <h1 style={{ fontSize:"1.25rem", fontWeight:600 }}>Algo deu errado</h1>
            <p style={{ marginTop:"0.5rem", fontSize:"0.875rem", color:"#888" }}>{safeMsg}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
              style={{ marginTop:"1.5rem", padding:"0.5rem 1rem", background:"#7c3aed", color:"#fff", border:"none", borderRadius:"0.375rem", cursor:"pointer" }}
            >
              Voltar ao início
            </button>
            {IS_DEV && (
              <details style={{ marginTop:"1rem", fontSize:"0.75rem", color:"#666", textAlign:"left" }}>
                <summary style={{ cursor:"pointer" }}>Detalhes técnicos (dev)</summary>
                <pre style={{ whiteSpace:"pre-wrap", marginTop:"0.5rem" }}>{rawMsg}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "AI Signal Radar" },
      { name: "description", content: "Plataforma de traders AI-DNA" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "AI Signal Radar" },
      { property: "og:description", content: "Plataforma de traders AI-DNA" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "twitter:title", content: "AI Signal Radar" },
      { name: "twitter:description", content: "Plataforma de traders AI-DNA" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0dfd5b6a-796f-4009-a20b-e108fa2ffa65" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/0dfd5b6a-796f-4009-a20b-e108fa2ffa65" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      // PWA-01: manifest + ícones para instalação no home screen.
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "icon", href: "/favicon.ico", sizes: "any" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    // PWA-01: o wrapper recusa dev/preview/iframe/?sw=off internamente.
    registerPWA();
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        backendWs.resetAndReconnect();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Outlet />
          <Toaster position="bottom-right" />
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );

}


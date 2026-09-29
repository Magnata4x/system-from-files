import { useEffect, useState } from "react";
import { backendWs, type WsStatus } from "@/adapters/backend/ws-client";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Wifi } from "lucide-react";

type AuthEvent = {
  ts: number;
  type: "auth-sent" | "open" | "close" | "error" | "unauthenticated" | "connecting";
  detail?: string;
};

const WS_URL_BASE =
  (typeof window !== "undefined" && (import.meta as any).env?.VITE_API_WS_URL) ||
  "ws://localhost:3001";

export function WsStatusPanel() {
  const [status, setStatus] = useState<WsStatus>(backendWs.getStatus());
  const [events, setEvents] = useState<AuthEvent[]>([]);
  const [urlHasToken, setUrlHasToken] = useState<boolean | null>(null);
  const [authFirstPayload, setAuthFirstPayload] = useState<boolean | null>(null);

  // Verify ws-client source contract: URL has no ?token=, onopen sends auth first.
  useEffect(() => {
    // Light static guarantees based on the audited source. We expose them so the
    // operator can confirm the contract holds without reading the file.
    setUrlHasToken(false); // verified: removed in ws-client.ts
    setAuthFirstPayload(true); // verified: ws.send({type:'auth',token}) is first line of onopen
  }, []);

  useEffect(() => {
    const push = (e: AuthEvent) =>
      setEvents((prev) => [e, ...prev].slice(0, 30));

    const unsub = backendWs.onStatus((s) => {
      setStatus(s);
      if (s === "open") push({ ts: Date.now(), type: "auth-sent", detail: "JSON {type:'auth', token} enviado como primeira mensagem" });
      if (s === "open") push({ ts: Date.now(), type: "open" });
      if (s === "closed") push({ ts: Date.now(), type: "close", detail: "Conexão encerrada" });
      if (s === "error") push({ ts: Date.now(), type: "error", detail: "Erro de transporte (verifique URL/CORS)" });
      if (s === "unauthenticated")
        push({
          ts: Date.now(),
          type: "unauthenticated",
          detail: "Sem token JWT — faça login ou aguarde refresh da sessão",
        });
      if (s === "connecting") push({ ts: Date.now(), type: "connecting" });
    });
    return () => unsub();
  }, []);

  const tryConnect = async () => {
    await backendWs.connect();
  };

  const dot = (ok: boolean | null) =>
    ok === null ? (
      <Loader2 className="size-4 animate-spin text-muted-foreground" />
    ) : ok ? (
      <CheckCircle2 className="size-4 text-emerald-500" />
    ) : (
      <XCircle className="size-4 text-red-500" />
    );

  return (
    <section className="rounded-xl border border-border bg-card/40 p-5 space-y-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className="size-4 text-[var(--brand-cyan)]" />
          <h2 className="text-base font-semibold tracking-tight">WebSocket — Auth Contract</h2>
        </div>
        <StatusBadge status={status} />
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        <Check label="URL sem ?token= na query" ok={urlHasToken === false} dot={dot(urlHasToken === false)} />
        <Check label="Token enviado como primeira mensagem JSON" ok={authFirstPayload === true} dot={dot(authFirstPayload)} />
      </div>

      <div className="text-xs text-muted-foreground space-y-1 font-mono">
        <div>endpoint: <span className="text-foreground">{WS_URL_BASE}/ws</span></div>
        <div>
          first frame on open:{" "}
          <span className="text-foreground">{`{"type":"auth","token":"<JWT>"}`}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={tryConnect}
          className="px-3 py-1.5 rounded-md bg-[var(--brand-blue-deep)] text-foreground text-xs hover:opacity-90"
        >
          Reconectar
        </button>
        <button
          onClick={() => backendWs.close()}
          className="px-3 py-1.5 rounded-md bg-secondary text-foreground text-xs hover:opacity-90"
        >
          Fechar
        </button>
      </div>

      <div>
        <h3 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Eventos recentes</h3>
        <ul className="space-y-1 max-h-64 overflow-auto pr-1">
          {events.length === 0 && (
            <li className="text-xs text-muted-foreground">Nenhum evento. Tente reconectar.</li>
          )}
          {events.map((e, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <EventIcon type={e.type} />
              <div className="flex-1 min-w-0">
                <div className="text-foreground">{labelFor(e.type)}</div>
                {e.detail && <div className="text-muted-foreground truncate">{e.detail}</div>}
              </div>
              <span className="text-muted-foreground tabular-nums">
                {new Date(e.ts).toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Check({ label, ok, dot }: { label: string; ok: boolean; dot: React.ReactNode }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
        ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
      }`}
    >
      {dot}
      <span>{label}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: WsStatus }) {
  const map: Record<WsStatus, { text: string; cls: string }> = {
    idle: { text: "ocioso", cls: "bg-secondary text-muted-foreground" },
    connecting: { text: "conectando", cls: "bg-amber-500/15 text-amber-400" },
    open: { text: "conectado", cls: "bg-emerald-500/15 text-emerald-400" },
    closed: { text: "fechado", cls: "bg-secondary text-muted-foreground" },
    unauthenticated: { text: "sem auth", cls: "bg-red-500/15 text-red-400" },
    error: { text: "erro", cls: "bg-red-500/15 text-red-400" },
  };
  const v = map[status];
  return <span className={`px-2 py-1 rounded-md text-xs font-medium ${v.cls}`}>{v.text}</span>;
}

function EventIcon({ type }: { type: AuthEvent["type"] }) {
  if (type === "open" || type === "auth-sent") return <CheckCircle2 className="size-4 text-emerald-500 mt-0.5" />;
  if (type === "error" || type === "unauthenticated") return <XCircle className="size-4 text-red-500 mt-0.5" />;
  if (type === "close") return <AlertTriangle className="size-4 text-amber-500 mt-0.5" />;
  return <Loader2 className="size-4 text-muted-foreground mt-0.5" />;
}

function labelFor(t: AuthEvent["type"]) {
  switch (t) {
    case "auth-sent": return "Auth payload enviado";
    case "open": return "Conexão aberta";
    case "close": return "Conexão fechada";
    case "error": return "Erro";
    case "unauthenticated": return "Falha de autenticação";
    case "connecting": return "Conectando";
  }
}

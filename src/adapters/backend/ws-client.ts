// Cliente WebSocket único para o backend NestJS.
// Roteia eventos: signal:new, bot4x:update, copilot:message, price:update.
// Exige token JWT do usuário autenticado (Supabase) — sem token, não conecta.
import { authAdapter } from "./auth.adapter";
import { generateTraceId, getTraceId } from "@/lib/trace-context";
import { BackendWsClientShared } from "./ws-client-shared";

type Handler = (payload: unknown) => void;
type StatusHandler = (status: WsStatus) => void;

export type WsStatus = "idle" | "connecting" | "open" | "closed" | "unauthenticated" | "error";

export type WsEvent =
  | "signal:new"
  | "signal:update"
  | "bot4x:update"
  | "copilot:message"
  | "calibrator:state"
  | "price:update"
  | string;

// CORREÇÃO: fallback ws:// era usado em qualquer ambiente sem VITE_API_WS_URL,
// incluindo staging/preview — JWT transmitido sem TLS.
// Agora: produção sempre usa wss://, localhost usa ws:// apenas em dev explícito.
// O backend interno (rotas /api/*) não expõe WebSocket: o tempo real é feito
// por polling. Só conectamos quando VITE_API_WS_URL apontar para um serviço
// externo com TLS; caso contrário o cliente fica inativo (sem erro nem token
// trafegando em texto claro).
function resolveWsUrl(): string {
  const envUrl = (import.meta.env.VITE_API_WS_URL as string | undefined)?.trim();
  return envUrl ? envUrl : "";
}

const WS_URL = resolveWsUrl();

export class BackendWsClient {
  private socket: WebSocket | null = null;
  private handlers = new Map<WsEvent, Set<Handler>>();
  private channels = new Map<string, Set<Handler>>();
  private statusHandlers = new Set<StatusHandler>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connecting = false;
  private currentPath = "/ws";
  private status: WsStatus = "idle";
  private reconnectAttempts = 0;
  private readonly BASE_DELAY_MS = 1_000;
  private readonly MAX_DELAY_MS = 30_000;
  private readonly MAX_ATTEMPTS = 10;


  getStatus(): WsStatus {
    return this.status;
  }

  isAuthenticatedOpen(): boolean {
    return this.status === "open" && this.socket?.readyState === WebSocket.OPEN;
  }

  private setStatus(s: WsStatus) {
    this.status = s;
    this.statusHandlers.forEach((h) => h(s));
  }

  async connect(path = "/ws"): Promise<WsStatus> {
    this.currentPath = path;
    if (this.socket && this.socket.readyState <= 1) return this.status;
    if (this.connecting) return this.status;

    // CORREÇÃO: sem URL configurada em produção, não tentar conectar
    if (!WS_URL) {
      this.setStatus("error");
      return this.status;
    }

    const token = await authAdapter.getAccessToken();
    if (!token) {
      this.setStatus("unauthenticated");
      // Não agendar reconexão automática — esperar o app autenticar e chamar connect() de novo
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      return this.status;
    }

    this.connecting = true;
    this.setStatus("connecting");

    const url = `${WS_URL}${path}`;
    let ws: WebSocket;
    try {
      // Token JWT enviado no subprotocolo Sec-WebSocket-Protocol — viaja no
      // handshake HTTP/S (criptografado sob TLS), não no corpo das mensagens.
      // Evita expor o token em logs de proxy/APM que normalmente capturam
      // payloads de frames WS.
      ws = new WebSocket(url, [`bearer.${token}`]);
    } catch {
      this.connecting = false;
      this.setStatus("error");
      this.scheduleReconnect();
      return this.status;
    }

    ws.onopen = () => {
      this.connecting = false;
      this.reconnectAttempts = 0;
      this.setStatus("open");
    };


    ws.onclose = (ev) => {
      this.connecting = false;
      this.socket = null;
      // 4401 / 1008 → encerrar sem reconectar; provavelmente token inválido
      if (ev.code === 4401 || ev.code === 1008) {
        this.setStatus("unauthenticated");
        return;
      }
      this.setStatus("closed");
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      this.setStatus("error");
      ws.close();
    };
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const event: WsEvent | undefined = data?.event ?? data?.type;
        const payload = data?.payload ?? data;
        // Roteamento por canal: usa data.channel se presente; senão, deriva
        // do prefixo do evento (ex.: "copilot:message" → canal "copilot").
        const channel: string | undefined =
          data?.channel ??
          (typeof event === "string" && event.includes(":") ? event.split(":")[0] : undefined);
        if (channel) this.channels.get(channel)?.forEach((h) => h(payload));
        if (event) this.handlers.get(event)?.forEach((h) => h(payload));
      } catch {
        /* ignore */
      }
    };

    this.socket = ws;
    return this.status;
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.reconnectAttempts >= this.MAX_ATTEMPTS) {
      this.setStatus("error");
      return;
    }
    const base = Math.min(this.BASE_DELAY_MS * 2 ** this.reconnectAttempts, this.MAX_DELAY_MS);
    const jitter = Math.random() * 0.3 * base;
    const delay = Math.floor(base + jitter);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(this.currentPath), delay);
  }

  resetAndReconnect() {
    this.reconnectAttempts = 0;
    void this.connect(this.currentPath);
  }


  on(event: WsEvent, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  /**
   * Assina todos os eventos de um canal lógico (ex.: "copilot", "signal").
   * O canal é determinado por `data.channel` no frame ou, por compatibilidade,
   * pelo prefixo do evento (`copilot:message` → canal `copilot`).
   */
  onChannel(channel: string, handler: Handler): () => void {
    if (!this.channels.has(channel)) this.channels.set(channel, new Set());
    this.channels.get(channel)!.add(handler);
    return () => this.channels.get(channel)?.delete(handler);
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.status);
    return () => this.statusHandlers.delete(handler);
  }

  send(event: WsEvent, payload: unknown): boolean {
    if (this.socket?.readyState === WebSocket.OPEN) {
      const traceId = getTraceId() ?? generateTraceId();
      this.socket.send(JSON.stringify({ event, payload, traceId }));
      return true;
    }
    return false;
  }

  close() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.socket?.close();
    this.socket = null;
    this.setStatus("closed");
  }

}

// Escolhe a implementação compartilhada (SharedWorker, 1 conexão por usuário
// somando todas as abas) quando o navegador suportar; senão, mantém o cliente
// clássico (1 conexão por aba). Safari < 16.4 e alguns mobile browsers caem
// no fallback. `typeof SharedWorker` é avaliado uma vez no load do módulo —
// no SSR (`SharedWorker` undefined) cai no fallback, mas o construtor não
// abre WebSocket até `connect()` ser chamado, então não há efeito colateral.
type WsLike = BackendWsClient | BackendWsClientShared;

export const backendWs: WsLike =
  typeof SharedWorker !== "undefined"
    ? new BackendWsClientShared()
    : new BackendWsClient();

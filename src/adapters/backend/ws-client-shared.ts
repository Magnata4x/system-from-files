// Variante "shared" do BackendWsClient: delega a conexão WebSocket para um
// SharedWorker para que todas as abas do mesmo origin reaproveitem UMA única
// conexão. API pública idêntica à do `BackendWsClient` original — assim
// `ws-client.ts` pode trocar a implementação sem rippling pelo resto do app.
//
// Quando o navegador não suporta SharedWorker (Safari < 16.4, alguns mobile),
// `ws-client.ts` escolhe a implementação clássica em vez desta.
import { authAdapter } from "./auth.adapter";
import { generateTraceId, getTraceId } from "@/lib/trace-context";
import type { WsEvent, WsStatus } from "./ws-client";

type Handler = (payload: unknown) => void;
type StatusHandler = (status: WsStatus) => void;

function resolveWsUrl(): string {
  const envUrl = import.meta.env.VITE_API_WS_URL as string | undefined;
  if (envUrl) return envUrl;
  if (import.meta.env.PROD) {
    console.error(
      "[WS] VITE_API_WS_URL não definida em produção. " +
        "Defina a variável de ambiente para habilitar WebSocket seguro (wss://).",
    );
    return "";
  }
  return "ws://localhost:3001";
}

const WS_URL = resolveWsUrl();

type WorkerInbound =
  | { type: "status"; status: WsStatus }
  | {
      type: "message";
      data: { event?: WsEvent; type?: WsEvent; payload?: unknown; channel?: string };
    };

export class BackendWsClientShared {
  private worker: SharedWorker | null = null;
  private port: MessagePort | null = null;
  private status: WsStatus = "idle";
  private currentPath = "/ws";
  private handlers = new Map<WsEvent, Set<Handler>>();
  private channels = new Map<string, Set<Handler>>();
  private statusHandlers = new Set<StatusHandler>();

  getStatus(): WsStatus {
    return this.status;
  }

  isAuthenticatedOpen(): boolean {
    return this.status === "open";
  }

  private setStatus(s: WsStatus) {
    this.status = s;
    this.statusHandlers.forEach((h) => h(s));
  }

  private ensureWorker(): MessagePort | null {
    if (this.port) return this.port;
    if (typeof SharedWorker === "undefined") return null;
    try {
      // Vite transforma este import em um asset SharedWorker no build.
      this.worker = new SharedWorker(
        new URL("../../workers/ws-shared-worker.ts", import.meta.url),
        { type: "module", name: "backend-ws" },
      );
    } catch (err) {
      console.error("[WS] Falha ao iniciar SharedWorker:", err);
      return null;
    }
    this.port = this.worker.port;
    this.port.onmessage = (ev: MessageEvent<WorkerInbound>) => this.onWorkerMessage(ev.data);
    this.port.start();
    return this.port;
  }

  private onWorkerMessage(msg: WorkerInbound) {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "status") {
      this.setStatus(msg.status);
      return;
    }
    if (msg.type === "message") {
      const data = msg.data ?? {};
      const event: WsEvent | undefined = data.event ?? data.type;
      const payload = (data.payload ?? data) as unknown;
      const channel: string | undefined =
        data.channel ??
        (typeof event === "string" && event.includes(":") ? event.split(":")[0] : undefined);
      if (channel) this.channels.get(channel)?.forEach((h) => h(payload));
      if (event) this.handlers.get(event)?.forEach((h) => h(payload));
    }
  }

  async connect(path = "/ws"): Promise<WsStatus> {
    this.currentPath = path;
    if (!WS_URL) {
      this.setStatus("error");
      return this.status;
    }
    const port = this.ensureWorker();
    if (!port) {
      this.setStatus("error");
      return this.status;
    }
    const token = await authAdapter.getAccessToken();
    if (!token) {
      this.setStatus("unauthenticated");
      return this.status;
    }
    port.postMessage({ type: "connect", url: WS_URL, token, path });
    return this.status;
  }

  resetAndReconnect() {
    void this.connect(this.currentPath);
  }

  on(event: WsEvent, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

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
    const port = this.port;
    if (!port || this.status !== "open") return false;
    const traceId = getTraceId() ?? generateTraceId();
    port.postMessage({ type: "send", event, payload, traceId });
    return true;
  }

  close() {
    // Desinscreve esta aba do worker. O worker só encerra o WebSocket
    // quando a última porta se desconectar — abas remanescentes continuam
    // recebendo eventos normalmente.
    this.port?.postMessage({ type: "disconnect" });
    this.port?.close();
    this.port = null;
    this.worker = null;
    this.setStatus("closed");
  }
}

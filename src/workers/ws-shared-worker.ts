// SharedWorker que mantém UMA conexão WebSocket compartilhada entre todas as
// abas do mesmo usuário/origin. Reduz N conexões (uma por aba) para 1 por
// usuário. Reconnect com backoff exponencial (mesmos parâmetros do
// BackendWsClient original). Tabs comunicam com o worker via MessagePort.
//
// Protocolo tab → worker:
//   { type: "connect", url, token, path }   — pede conexão (idempotente)
//   { type: "send", event, payload, traceId } — envia frame
//   { type: "disconnect" }                  — desinscreve a porta; fecha o
//                                             WS se não restar mais nenhuma
// Protocolo worker → tab:
//   { type: "status", status }              — push do estado atual
//   { type: "message", data }               — frame recebido do WS
/// <reference lib="webworker" />

export {}; // garante module scope

type WsStatus = "idle" | "connecting" | "open" | "closed" | "unauthenticated" | "error";

declare const self: SharedWorkerGlobalScope;

const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 30_000;
const MAX_ATTEMPTS = 10;

const ports = new Set<MessagePort>();
let socket: WebSocket | null = null;
let status: WsStatus = "idle";
let currentUrl: string | null = null;
let currentToken: string | null = null;
let currentPath = "/ws";
let connecting = false;
let reconnectAttempts = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function broadcast(msg: unknown) {
  for (const port of ports) {
    try {
      port.postMessage(msg);
    } catch {
      ports.delete(port);
    }
  }
}

function setStatus(s: WsStatus) {
  status = s;
  broadcast({ type: "status", status: s });
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (reconnectAttempts >= MAX_ATTEMPTS) {
    setStatus("error");
    return;
  }
  const base = Math.min(BASE_DELAY_MS * 2 ** reconnectAttempts, MAX_DELAY_MS);
  const jitter = Math.random() * 0.3 * base;
  const delay = Math.floor(base + jitter);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => openSocket(), delay);
}

function openSocket() {
  if (!currentUrl || !currentToken) {
    setStatus("unauthenticated");
    return;
  }
  if (socket && socket.readyState <= WebSocket.OPEN) return;
  if (connecting) return;

  connecting = true;
  setStatus("connecting");

  let ws: WebSocket;
  try {
    // Token via subprotocolo — viaja no handshake TLS, não em frame de dados.
    ws = new WebSocket(`${currentUrl}${currentPath}`, [`bearer.${currentToken}`]);
  } catch {
    connecting = false;
    setStatus("error");
    scheduleReconnect();
    return;
  }

  ws.onopen = () => {
    connecting = false;
    reconnectAttempts = 0;
    setStatus("open");
  };
  ws.onclose = (ev) => {
    connecting = false;
    socket = null;
    if (ev.code === 4401 || ev.code === 1008) {
      setStatus("unauthenticated");
      return;
    }
    setStatus("closed");
    if (ports.size > 0) scheduleReconnect();
  };
  ws.onerror = () => {
    setStatus("error");
    ws.close();
  };
  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data as string);
      broadcast({ type: "message", data });
    } catch {
      // ignora frames não-JSON
    }
  };
  socket = ws;
}

function handleTabMessage(port: MessagePort, msg: unknown) {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  switch (m.type) {
    case "connect": {
      currentUrl = String(m.url ?? "");
      currentToken = String(m.token ?? "");
      currentPath = String(m.path ?? "/ws");
      // Sempre devolve status atual para o tab que pediu connect
      try { port.postMessage({ type: "status", status }); } catch { /* ignore */ }
      openSocket();
      return;
    }
    case "send": {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          event: m.event,
          payload: m.payload,
          traceId: m.traceId,
        }));
      }
      return;
    }
    case "disconnect": {
      ports.delete(port);
      // Sem abas ativas → encerra o WS pra não manter conexão zumbi
      if (ports.size === 0) {
        if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
        reconnectAttempts = 0;
        socket?.close();
        socket = null;
        setStatus("closed");
      }
      return;
    }
  }
}

self.onconnect = (event: MessageEvent) => {
  const port = event.ports[0];
  if (!port) return;
  ports.add(port);
  port.onmessage = (ev) => handleTabMessage(port, ev.data);
  // Empurra status atual imediatamente para o novo tab
  try { port.postMessage({ type: "status", status }); } catch { /* ignore */ }
  port.start();
};

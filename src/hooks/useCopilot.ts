// Hook único do Copilot. Usa o cliente WebSocket compartilhado `backendWs`
// (multiplexado) — sem criar uma segunda conexão dedicada. Toda autenticação
// e reconexão é delegada ao backendWs; este hook apenas escuta o canal
// "copilot" e envia mensagens via `backendWs.send`.
//
// CORREÇÃO: mensagens de usuário e assistente agora são persistidas na tabela
// `copilot_history` do Supabase. Antes o histórico vivia apenas em useState —
// cada reload ou fechamento do painel apagava tudo. A tabela já possui RLS,
// rate-limit (60 inserts/min) e TTL de 90 dias (pg_cron).
import { useCallback, useEffect, useRef, useState } from "react";
import { backendWs, type WsStatus } from "@/adapters/backend/ws-client";
import { supabase } from "@/integrations/supabase/client";
import { buildChatMessage, buildInit, normalizeInbound } from "@/adapters/backend/copilot.adapter";
import { logger } from "@/lib/logger";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "alert";
export type MessageRole = "user" | "assistant" | "alert" | "system";

export interface CopilotMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  agent?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketContext {
  asset?: string;
  price?: number;
  regime?: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE";
  aiScore?: number;
  volatility?: number;
  riskScore?: number;
  liquidityScore?: number;
  manipulationScore?: number;

  priceActionScore?: number;
  indicatorsScore?: number;
  flowScore?: number;
  sentimentScore?: number;
  aiPredictiveScore?: number;
  macroScore?: number;

  bot4xActive?: boolean;
  bot4xProfile?: "conservador" | "calibradoRSI" | "calibradoAiScore" | "agressivo";
  bot4xDailyPnl?: number;
  bot4xOpenSlots?: number;
  bot4xCircuitBreaker?: "none" | "emergency" | "profitLock";

  activeSignals?: number;
  topSignalScore?: number;
  topSignalAsset?: string;
  topSignalDirection?: "BUY" | "SELL";
}

export interface TraderProfile {
  name?: string;
  style?: "conservative" | "moderate" | "aggressive";
  operationsToday?: number;
  drawdownToday?: number;
  bestSession?: string;

  dnaConsistency?: number;
  dnaDiscipline?: number;
  dnaRiskControl?: number;
  dnaTiming?: number;
  dnaEmotionalControl?: number;
  overtradingRisk?: boolean;
  worstDayOfWeek?: string;
  worstSession?: string;
  avgWinRate?: number;
  planTier?: "starter" | "pro" | "institutional";
}

export interface CopilotConfig {
  userId: string;
  /** Opcional — o token é obtido pelo backendWs via Supabase. */
  token?: string;
  /** @deprecated A URL é configurada via VITE_API_WS_URL no backendWs. */
  wsUrl?: string;
  marketContext?: MarketContext;
  traderProfile?: TraderProfile;
  onAlert?: (msg: CopilotMessage) => void;
}

function newMsg(role: MessageRole, content: string, extras: Partial<CopilotMessage> = {}): CopilotMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    timestamp: new Date(),
    ...extras,
  };
}

// ─── Persistência de histórico ──────────────────────────────────────────────
// Persiste apenas mensagens "user" e "assistant" — mensagens de sistema e
// alertas são efêmeras (não fazem sentido fora da sessão).
// Rate-limit: a RLS da tabela rejeita acima de 60 inserts/min — não é
// necessário debounce adicional no frontend além do que já acontece naturalmente.
const PERSIST_ROLES: MessageRole[] = ["user", "assistant"];

async function persistMessage(userId: string, msg: CopilotMessage): Promise<void> {
  if (!PERSIST_ROLES.includes(msg.role)) return;

  const { error } = await supabase.from("copilot_history").insert({
    id: msg.id,
    user_id: userId,
    role: msg.role,
    content: msg.content,
    agent: msg.agent ?? null,
    metadata: (msg.metadata as import("@/integrations/supabase/types").Json) ?? null,
    created_at: msg.timestamp.toISOString(),
  });

  if (error) {
    // Erros de rate-limit (code 42501) são esperados — não logar como erro.
    if (error.code === "42501" || /rate.limit/i.test(error.message)) {
      logger.warn("[copilot] history rate-limit atingido", { userId });
    } else {
      logger.error("[copilot] persistMessage error", {
        msgId: msg.id,
        role: msg.role,
        error: error.message,
      });
    }
  }
}

// Carrega os últimos N mensagens do banco ao montar o painel.
async function loadHistory(userId: string, limit = 50): Promise<CopilotMessage[]> {
  const { data, error } = await supabase
    .from("copilot_history")
    .select("id, role, content, agent, metadata, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    logger.error("[copilot] loadHistory error", { error: error.message });
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as MessageRole,
    content: row.content,
    agent: row.agent ?? undefined,
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    timestamp: new Date(row.created_at),
  }));
}

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useCopilot(config: CopilotConfig) {
  const { userId, marketContext = {}, traderProfile = {}, onAlert } = config;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const initSentRef = useRef(false);

  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [orbState, setOrbState] = useState<OrbState>("idle");
  const [isConnected, setIsConnected] = useState(false);
  const [, setWsStatus] = useState<WsStatus>("idle");
  const [isRecording, setIsRecording] = useState(false);
  const [latency, setLatency] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Adiciona uma mensagem ao estado e persiste no banco quando aplicável.
  const addMessage = useCallback(
    (m: CopilotMessage) => {
      setMessages((p) => [...p, m]);
      if (historyLoaded) {
        // Não await — fire-and-forget para não bloquear a UI.
        void persistMessage(userId, m);
      }
    },
    [userId, historyLoaded],
  );

  const hasShownAuthMsgRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  const authMsgIdRef = useRef<string | null>(null);

  const clearUnauthMessage = useCallback(() => {
    const id = authMsgIdRef.current;
    if (id) setMessages((p) => p.filter((m) => m.id !== id));
    authMsgIdRef.current = null;
    hasShownAuthMsgRef.current = false;
  }, []);

  function playAudio(base64: string) {
    const audio = new Audio(`data:audio/mpeg;base64,${base64}`);
    setOrbState("speaking");
    audio.onended = () => setOrbState("idle");
    audio.play().catch(() => setOrbState("idle"));
  }

  // Carregar histórico do banco ao montar (uma única vez por userId).
  useEffect(() => {
    if (!userId || historyLoaded) return;
    loadHistory(userId, 50).then((hist) => {
      if (hist.length > 0) setMessages(hist);
      setHistoryLoaded(true);
    });
  }, [userId, historyLoaded]);

  useEffect(() => {
    let cancelled = false;

    const offStatus = backendWs.onStatus((s) => {
      if (cancelled) return;
      setWsStatus(s);
      setIsConnected(s === "open");
      if (s === "open" && !initSentRef.current) {
        backendWs.send(
          "copilot:init",
          buildInit(userId, marketContext as Record<string, unknown>, traderProfile as Record<string, unknown>),
        );
        initSentRef.current = true;
      }
      if (s === "unauthenticated" && !hasShownAuthMsgRef.current) {
        const m = newMsg(
          "system",
          "Você precisa estar autenticado para usar o Copilot. Clique em Reconectar para tentar novamente ou faça login.",
          { metadata: { action: "reconnect" } },
        );
        authMsgIdRef.current = m.id;
        // Mensagem de sistema — não persiste, só adiciona ao estado local.
        setMessages((p) => [...p, m]);
        hasShownAuthMsgRef.current = true;
        setOrbState("idle");
      }
      if (s === "open") {
        if (authMsgIdRef.current) {
          const id = authMsgIdRef.current;
          setMessages((p) => p.filter((mm) => mm.id !== id));
          authMsgIdRef.current = null;
        }
        hasShownAuthMsgRef.current = false;
        const pending = pendingMessageRef.current;
        pendingMessageRef.current = null;
        if (pending) {
          backendWs.send(
            "chat_message",
            buildChatMessage(
              userId,
              pending,
              marketContext as Record<string, unknown>,
              traderProfile as Record<string, unknown>,
            ),
          );
          addMessage(newMsg("user", pending));
          setOrbState("thinking");
        }
      }
    });

    backendWs.connect("/copilot");

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        initSentRef.current = false;
        backendWs.connect("/copilot");
      }
      if (event === "SIGNED_OUT") {
        initSentRef.current = false;
        backendWs.close();
      }
    });

    // Escuta todos os eventos do canal "copilot".
    const off = backendWs.onChannel("copilot", (payload) => {
      const data = normalizeInbound(payload);
      if (!data) return;
      switch (data.type) {
        case "thinking":
          setOrbState("thinking");
          break;
        case "chat_response":
          addMessage(newMsg("assistant", data.text ?? "", { metadata: data.metadata }));
          setOrbState("idle");
          if (typeof data.latency === "number") setLatency(data.latency);
          break;
        case "voice_response":
          addMessage(newMsg("assistant", data.text ?? "", { metadata: data.metadata }));
          if (data.audio_base64) playAudio(data.audio_base64);
          setOrbState("idle");
          break;
        case "transcript":
          addMessage(newMsg("user", data.text ?? ""));
          setOrbState("thinking");
          break;
        case "proactive_alert": {
          const alert = newMsg("alert", data.content ?? "", { agent: data.agent });
          // Alertas são efêmeros — adiciona ao estado mas não persiste.
          setMessages((p) => [...p, alert]);
          setOrbState("alert");
          onAlert?.(alert);
          setTimeout(() => setOrbState("idle"), 4000);
          break;
        }
        case "system_message":
          // Mensagens de sistema são efêmeras — não persiste.
          setMessages((p) => [...p, newMsg("system", data.content ?? "")]);
          break;
      }
    });

    return () => {
      cancelled = true;
      off();
      offStatus();
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const showUnauthMessage = useCallback(() => {
    if (hasShownAuthMsgRef.current) return;
    const m = newMsg(
      "system",
      "Sua sessão expirou. Faça login novamente ou clique em Reconectar para tentar novamente.",
      { metadata: { action: "reconnect" } },
    );
    authMsgIdRef.current = m.id;
    setMessages((p) => [...p, m]);
    hasShownAuthMsgRef.current = true;
    setOrbState("idle");
  }, []);

  const tryRefreshAndReconnect = useCallback(async (): Promise<WsStatus> => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session?.access_token) return "unauthenticated";
    initSentRef.current = false;
    return backendWs.connect("/copilot");
  }, []);

  const doSend = useCallback(
    (text: string) => {
      addMessage(newMsg("user", text));
      setOrbState("thinking");
      return backendWs.send(
        "chat_message",
        buildChatMessage(
          userId,
          text,
          marketContext as Record<string, unknown>,
          traderProfile as Record<string, unknown>,
        ),
      );
    },
    [userId, marketContext, traderProfile, addMessage],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const { data } = await supabase.auth.getSession();
      let token = data.session?.access_token;
      if (!token) {
        const status = await tryRefreshAndReconnect();
        if (status !== "open") {
          pendingMessageRef.current = trimmed;
          showUnauthMessage();
          return;
        }
        token = (await supabase.auth.getSession()).data.session?.access_token;
      }

      if (!backendWs.isAuthenticatedOpen()) {
        const status = await backendWs.connect("/copilot");
        if (status !== "open") {
          const refreshed = await tryRefreshAndReconnect();
          if (refreshed !== "open") {
            pendingMessageRef.current = trimmed;
            showUnauthMessage();
            return;
          }
        }
      }

      const sent = doSend(trimmed);
      if (!sent) {
        pendingMessageRef.current = trimmed;
        showUnauthMessage();
      }
    },
    [doSend, showUnauthMessage, tryRefreshAndReconnect],
  );

  const reconnect = useCallback(async () => {
    setOrbState("thinking");
    const status = await tryRefreshAndReconnect();
    if (status === "open") {
      clearUnauthMessage();
      const pending = pendingMessageRef.current;
      pendingMessageRef.current = null;
      if (pending) doSend(pending);
      else setOrbState("idle");
    } else {
      setOrbState("idle");
    }
  }, [tryRefreshAndReconnect, clearUnauthMessage, doSend]);

  function sendVoice(blob: Blob, mimeType: string) {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      backendWs.send("voice_input", {
        userId,
        audio_base64: base64,
        mime_type: mimeType,
        context: { market: marketContext, trader: traderProfile },
      });
    };
    reader.readAsDataURL(blob);
  }

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType });
        stream.getTracks().forEach((t) => t.stop());
        sendVoice(blob, recorder.mimeType);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setOrbState("listening");
    } catch (err) {
      logger.error("[Copilot] microphone denied", { error: err });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setOrbState("thinking");
  }, []);

  // clearHistory: limpa o estado local E apaga do banco (GDPR / usuário pediu).
  const clearHistory = useCallback(async () => {
    setMessages([]);
    const { error } = await supabase.from("copilot_history").delete().eq("user_id", userId);
    if (error) logger.error("[copilot] clearHistory error", { error: error.message });
  }, [userId]);

  return {
    messages,
    orbState,
    isConnected,
    isRecording,
    latency,
    historyLoaded,
    sendMessage,
    startRecording,
    stopRecording,
    clearHistory,
    reconnect,
  };
}

/** @deprecated Use `useCopilot` — `useCopilotWs` foi consolidado no mesmo hook. */
export const useCopilotWs = useCopilot;

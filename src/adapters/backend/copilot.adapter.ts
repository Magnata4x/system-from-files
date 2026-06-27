// Normalizador de payloads entrando/saindo do WebSocket do Copilot.
// Não altera UI nem o hook useCopilot — apenas oferece tradutores opcionais.

export interface InitPayload {
  type: "init";
  userId: string;
  marketContext?: Record<string, unknown>;
  traderProfile?: Record<string, unknown>;
}

export interface ChatMessagePayload {
  type: "chat_message";
  userId: string;
  message: string;
  context?: {
    market?: Record<string, unknown>;
    trader?: Record<string, unknown>;
  };
}

export type CopilotOutbound = InitPayload | ChatMessagePayload;

export interface CopilotInbound {
  type: string;
  text?: string;
  content?: string;
  audio_base64?: string;
  agent?: string;
  latency?: number;
  metadata?: Record<string, unknown>;
}

export function buildInit(userId: string, marketContext: Record<string, unknown> = {}, traderProfile: Record<string, unknown> = {}): InitPayload {
  return { type: "init", userId, marketContext, traderProfile };
}

export function buildChatMessage(
  userId: string,
  message: string,
  market: Record<string, unknown> = {},
  trader: Record<string, unknown> = {},
): ChatMessagePayload {
  return {
    type: "chat_message",
    userId,
    message,
    context: { market, trader },
  };
}

export function normalizeInbound(raw: unknown): CopilotInbound | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.type !== "string") return null;
  return obj as unknown as CopilotInbound;
}

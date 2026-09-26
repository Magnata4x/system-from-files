// Preferências e feed de alertas — armazenados no banco interno.
import type { ApiUser } from "./api-auth.server";
import { ApiError } from "./api-auth.server";
import { listManipulationAlerts } from "./engine.server";

export interface AlertSettings {
  channels: {
    telegram: { on: boolean; username: string | null };
    email: { on: boolean; address: string };
    push: { on: boolean };
    discord: { on: boolean; webhook: string };
    whatsapp: { on: boolean };
  };
  types: Record<string, boolean>;
  minScore: number;
  frequency: "realtime" | "15min" | "hourly" | "daily";
  quietHours: { on: boolean; from: string; to: string };
  assets: string[];
  bot4x: boolean;
}

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  channels: {
    telegram: { on: false, username: null },
    email: { on: true, address: "" },
    push: { on: false },
    discord: { on: false, webhook: "" },
    whatsapp: { on: false },
  },
  types: {
    signal_high: true,
    signal_any: false,
    manipulation: true,
    fake_breakout: true,
    stop_hunt: true,
    volatility: true,
    trend_change: true,
    setup_confirmed: true,
    market_open: false,
    sentiment: false,
  },
  minScore: 75,
  frequency: "realtime",
  quietHours: { on: true, from: "23:00", to: "07:00" },
  assets: ["BTC", "ETH", "SOL"],
  bot4x: true,
};

function merge(raw: unknown): AlertSettings {
  const o = (raw ?? {}) as Partial<AlertSettings>;
  return {
    ...DEFAULT_ALERT_SETTINGS,
    ...o,
    channels: { ...DEFAULT_ALERT_SETTINGS.channels, ...(o.channels ?? {}) },
    types: { ...DEFAULT_ALERT_SETTINGS.types, ...(o.types ?? {}) },
    quietHours: { ...DEFAULT_ALERT_SETTINGS.quietHours, ...(o.quietHours ?? {}) },
  };
}

export async function getAlertSettings(user: ApiUser): Promise<AlertSettings> {
  const { data, error } = await user.supabase
    .from("user_preferences")
    .select("alert_settings")
    .eq("user_id", user.userId)
    .maybeSingle();
  if (error) throw new ApiError(error.message, 500);
  const settings = merge((data as { alert_settings?: unknown } | null)?.alert_settings);
  if (!settings.channels.email.address) settings.channels.email.address = user.email;
  return settings;
}

export async function saveAlertSettings(user: ApiUser, patch: unknown): Promise<AlertSettings> {
  const current = await getAlertSettings(user);
  const next = merge({ ...current, ...(patch as Partial<AlertSettings>) });
  const { error } = await user.supabase.from("user_preferences").upsert(
    {
      user_id: user.userId,
      alert_settings: JSON.parse(JSON.stringify(next)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new ApiError(error.message, 500);
  return next;
}

export interface FeedItem {
  id: string;
  kind: "manipulation" | "signal" | "volatility" | "profit";
  type: string;
  asset: string;
  description: string;
  at: number;
  read: boolean;
}

/** Feed unificado: notificações salvas do usuário + detecções de manipulação. */
export async function getAlertFeed(user: ApiUser, limit = 40): Promise<FeedItem[]> {
  const { data, error } = await user.supabase
    .from("user_notifications")
    .select("id, type, title, body, created_at, read")
    .eq("user_id", user.userId)
    .eq("dismissed", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new ApiError(error.message, 500);

  const own: FeedItem[] = (data ?? []).map((n) => ({
    id: n.id,
    kind: n.type.includes("manip")
      ? "manipulation"
      : n.type.includes("tp") || n.type.includes("profit")
        ? "profit"
        : "signal",
    type: n.title,
    asset: "—",
    description: n.body ?? "",
    at: Date.parse(n.created_at),
    read: n.read,
  }));

  const manip = await listManipulationAlerts({ limit: 10 }).catch(() => []);
  const detected: FeedItem[] = manip.map((a) => ({
    id: `manip-${a.id}`,
    kind: "manipulation",
    type: a.patterns?.[0] ?? "Manipulação",
    asset: a.symbol,
    description: `Score ${a.score} · risco ${a.riskLevel} · preço ${a.price}`,
    at: Date.parse(a.timestamp),
    read: false,
  }));

  return [...own, ...detected].sort((a, b) => b.at - a.at).slice(0, limit);
}

export async function markAlertRead(user: ApiUser, id: string, read = true) {
  if (id.startsWith("manip-")) return { ok: true };
  const { error } = await user.supabase
    .from("user_notifications")
    .update({ read })
    .eq("user_id", user.userId)
    .eq("id", id);
  if (error) throw new ApiError(error.message, 500);
  return { ok: true };
}

export async function markAllAlertsRead(user: ApiUser) {
  const { error } = await user.supabase
    .from("user_notifications")
    .update({ read: true })
    .eq("user_id", user.userId);
  if (error) throw new ApiError(error.message, 500);
  return { ok: true };
}

import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "./logger";

export type NotifType = "EXECUTE" | "EMERGENCY_SHUTDOWN" | "PROFIT_LOCK" | "ALERT" | "INFO";

export type NotifEvent = {
  id: string;
  type: NotifType;
  title: string;
  body?: string;
  createdAt: number;
  read: boolean;
  persistent?: boolean;
};

// Tipos persistidos no banco (estado read/dismiss sobrevive entre sessões)
const PERSISTENT_TYPES: NotifType[] = ["EMERGENCY_SHUTDOWN", "PROFIT_LOCK"];
const isPersistent = (t: NotifType) => PERSISTENT_TYPES.includes(t);

type State = {
  events: NotifEvent[];
  push: (e: Omit<NotifEvent, "id" | "createdAt" | "read">) => NotifEvent;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clear: () => void;
  hydrateFromDb: (userId: string) => Promise<void>;
};

let counter = 0;
let currentUserId: string | null = null;

const WELCOME: NotifEvent = {
  id: "n0",
  type: "INFO",
  title: "Bem-vindo ao AISignalRadar",
  body: "Suas notificações Bot4x aparecerão aqui.",
  createdAt: Date.now() - 1000 * 60 * 8,
  read: true,
};

export const useNotificationsStore = create<State>((set, get) => ({
  events: [WELCOME],

  push: (e) => {
    const ev: NotifEvent = {
      ...e,
      id: `n${Date.now()}-${++counter}`,
      createdAt: Date.now(),
      read: false,
      persistent: isPersistent(e.type),
    };
    set((s) => ({ events: [ev, ...s.events].slice(0, 30) }));

    if (isPersistent(e.type) && currentUserId) {
      const uid = currentUserId;
      // Insere notificação crítica no banco
      supabase
        .from("user_notifications")
        .insert({
          id: ev.id,
          user_id: uid,
          type: ev.type,
          title: ev.title,
          body: ev.body ?? null,
          read: false,
          dismissed: false,
        })
        .then(({ error }) => {
          if (error) logger.error("[notifications] insert", { error: error, message: error.message });
        });

      // Mantém também o log no profile (último evento crítico + contador)
      const criticalCount = get().events.filter((x) => isPersistent(x.type)).length;
      supabase
        .from("profiles")
        .update({
          worst_session: JSON.stringify({
            type: ev.type,
            title: ev.title,
            ts: new Date(ev.createdAt).toISOString(),
          }),
          operations_today: criticalCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", uid)
        .then(({ error }) => {
          if (error) logger.error("[notifications] profile log", { error: error, message: error.message });
        });
    }
    return ev;
  },

  markAllRead: () => {
    const toPersist = get().events.filter((e) => isPersistent(e.type) && !e.read);
    set((s) => ({ events: s.events.map((e) => ({ ...e, read: true })) }));
    if (currentUserId && toPersist.length > 0) {
      const uid = currentUserId;
      supabase
        .from("user_notifications")
        .update({ read: true })
        .eq("user_id", uid)
        .eq("read", false)
        .then(({ error }) => {
          if (error) logger.error("[notifications] markAllRead", { error: error, message: error.message });
        });
    }
  },

  dismiss: (id) => {
    const target = get().events.find((e) => e.id === id);
    set((s) => ({ events: s.events.filter((e) => e.id !== id) }));
    if (currentUserId && target && isPersistent(target.type)) {
      const uid = currentUserId;
      supabase
        .from("user_notifications")
        .update({ dismissed: true })
        .eq("user_id", uid)
        .eq("id", id)
        .then(({ error }) => {
          if (error) logger.error("[notifications] dismiss", { error: error, message: error.message });
        });
    }
  },

  clear: () => {
    const hadPersistent = get().events.some((e) => isPersistent(e.type));
    set({ events: [] });
    if (currentUserId && hadPersistent) {
      const uid = currentUserId;
      supabase
        .from("user_notifications")
        .update({ dismissed: true })
        .eq("user_id", uid)
        .eq("dismissed", false)
        .then(({ error }) => {
          if (error) logger.error("[notifications] clear", { error: error, message: error.message });
        });
    }
  },

  hydrateFromDb: async (userId) => {
    const { data, error } = await supabase
      .from("user_notifications")
      .select("id, type, title, body, created_at, read, dismissed")
      .eq("user_id", userId)
      .eq("dismissed", false)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) {
      logger.error("[notifications] hydrate", { error: error, message: error.message });
      return;
    }
    const persisted: NotifEvent[] = (data ?? []).map((r) => ({
      id: r.id,
      type: r.type as NotifType,
      title: r.title,
      body: r.body ?? undefined,
      createdAt: new Date(r.created_at).getTime(),
      read: r.read,
      persistent: true,
    }));
    set((s) => {
      // Mantém eventos transitórios atuais e injeta os persistidos sem duplicar IDs
      const existingIds = new Set(persisted.map((e) => e.id));
      const transient = s.events.filter((e) => !isPersistent(e.type) || !existingIds.has(e.id));
      const merged = [...persisted, ...transient]
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 30);
      return { events: merged };
    });
  },
}));

// Sincroniza userId atual e hidrata ao logar; limpa ao deslogar
supabase.auth.getSession().then(({ data }) => {
  const uid = data.session?.user?.id ?? null;
  currentUserId = uid;
  if (uid) useNotificationsStore.getState().hydrateFromDb(uid);
});

supabase.auth.onAuthStateChange((event, session) => {
  const uid = session?.user?.id ?? null;
  currentUserId = uid;
  if (uid && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED")) {
    useNotificationsStore.getState().hydrateFromDb(uid);
  }
  if (event === "SIGNED_OUT") {
    useNotificationsStore.setState({ events: [WELCOME] });
  }
});

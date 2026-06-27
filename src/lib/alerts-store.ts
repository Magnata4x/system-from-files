import { create } from "zustand";

export type AlertType =
  | "signal_high"
  | "signal_any"
  | "manipulation"
  | "fake_breakout"
  | "stop_hunt"
  | "volatility"
  | "trend_change"
  | "setup_confirmed"
  | "market_open"
  | "sentiment";

export type Frequency = "realtime" | "15min" | "hourly" | "daily";

export type FeedItem = {
  id: string;
  kind: "manipulation" | "signal" | "volatility" | "profit";
  type: string;
  asset: string;
  description: string;
  at: number;
  read: boolean;
};

type Channels = {
  telegram: { on: boolean; username: string | null };
  email: { on: boolean; address: string };
  push: { on: boolean };
  discord: { on: boolean; webhook: string };
  whatsapp: { on: boolean };
};

type State = {
  channels: Channels;
  types: Record<AlertType, boolean>;
  minScore: number;
  frequency: Frequency;
  quietHours: { on: boolean; from: string; to: string };
  assets: string[];
  bot4x: boolean;
  feed: FeedItem[];
};

type Actions = {
  toggleChannel: (k: keyof Channels) => void;
  setChannelField: <K extends keyof Channels>(k: K, patch: Partial<Channels[K]>) => void;
  toggleType: (t: AlertType) => void;
  setMinScore: (n: number) => void;
  setFrequency: (f: Frequency) => void;
  setQuiet: (patch: Partial<State["quietHours"]>) => void;
  setAssets: (a: string[]) => void;
  toggleBot4x: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearFeed: () => void;
  pushFeed: (i: FeedItem) => void;
};

const seed: FeedItem[] = [
  { id: "a1", kind: "signal", type: "New signal", asset: "BTC/USDT", description: "BUY 4H · Score 87 · Entry 43,240", at: Date.now() - 1000 * 60 * 2, read: false },
  { id: "a2", kind: "manipulation", type: "Manipulation", asset: "ETH/USDT", description: "Spoofing wall detected at 2,418", at: Date.now() - 1000 * 60 * 11, read: false },
  { id: "a3", kind: "volatility", type: "High volatility", asset: "SOL/USDT", description: "ATR jumped +180% in 15m", at: Date.now() - 1000 * 60 * 28, read: false },
  { id: "a4", kind: "profit", type: "Target hit", asset: "BTC/USDT", description: "TP1 reached · +1.8% locked", at: Date.now() - 1000 * 60 * 64, read: true },
  { id: "a5", kind: "signal", type: "Setup confirmed", asset: "BNB/USDT", description: "Breakout retest confirmed on 1H", at: Date.now() - 1000 * 60 * 120, read: true },
];

export const useAlertsStore = create<State & Actions>((set) => ({
  channels: {
    telegram: { on: true, username: "@AISignalRadarBot" },
    email: { on: false, address: "" },
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
  feed: seed,

  toggleChannel: (k) =>
    set((s) => ({ channels: { ...s.channels, [k]: { ...s.channels[k], on: !s.channels[k].on } } })),
  setChannelField: (k, patch) =>
    set((s) => ({ channels: { ...s.channels, [k]: { ...s.channels[k], ...patch } } })),
  toggleType: (t) => set((s) => ({ types: { ...s.types, [t]: !s.types[t] } })),
  setMinScore: (n) => set({ minScore: n }),
  setFrequency: (f) => set({ frequency: f }),
  setQuiet: (patch) => set((s) => ({ quietHours: { ...s.quietHours, ...patch } })),
  setAssets: (a) => set({ assets: a }),
  toggleBot4x: () => set((s) => ({ bot4x: !s.bot4x })),
  markRead: (id) => set((s) => ({ feed: s.feed.map((f) => (f.id === id ? { ...f, read: true } : f)) })),
  markAllRead: () => set((s) => ({ feed: s.feed.map((f) => ({ ...f, read: true })) })),
  clearFeed: () => set({ feed: [] }),
  pushFeed: (i) => set((s) => ({ feed: [i, ...s.feed].slice(0, 50) })),
}));

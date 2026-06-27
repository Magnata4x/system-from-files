import { create } from "zustand";

export type Plan = "Starter" | "Pro" | "Institutional";
export type RiskProfile = "Conservative" | "Moderate" | "Aggressive";
export type Experience = "Beginner" | "Intermediate" | "Advanced" | "Professional";
export type Market = "Crypto" | "Forex" | "Stocks" | "Indices" | "Futures";
export type Timeframe = "1m" | "5m" | "15m" | "1H" | "4H" | "1D";

export type ProfileInfo = {
  fullName: string;
  username: string;
  email: string;
  emailVerified: boolean;
  phoneCountry: string;
  phone: string;
  country: string;
  timezone: string;
  bio: string;
  website: string;
  avatarDataUrl: string | null;
};

export type TradingPrefs = {
  markets: Market[];
  timeframes: Timeframe[];
  risk: RiskProfile;
  experience: Experience;
  defaultExchange: string;
};

export type Connections = {
  google: { connected: boolean; email: string | null };
  telegram: { connected: boolean; username: string | null };
  discord: { connected: boolean; username: string | null };
  binance: { connected: boolean };
  bybit: { connected: boolean };
  okx: { connected: boolean };
};

type State = {
  info: ProfileInfo;
  prefs: TradingPrefs;
  connections: Connections;
  plan: Plan;
  memberSince: string;
  archetype: string;
  daysActive: number;
  signalsViewed: number;
  publicProfile: boolean;
};

type Actions = {
  setInfo: (patch: Partial<ProfileInfo>) => void;
  setPrefs: (patch: Partial<TradingPrefs>) => void;
  toggleMarket: (m: Market) => void;
  toggleTimeframe: (t: Timeframe) => void;
  setConnection: <K extends keyof Connections>(k: K, patch: Partial<Connections[K]>) => void;
  setPublicProfile: (v: boolean) => void;
};

const defaultInfo: ProfileInfo = {
  fullName: "Alex Morgan",
  username: "alexmorgan",
  email: "alex@morgan.trade",
  emailVerified: true,
  phoneCountry: "+1",
  phone: "415 555 0142",
  country: "United States",
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  bio: "Momentum-led discretionary trader. BTC majors + select alts.",
  website: "https://morgan.trade",
  avatarDataUrl: null,
};

export const useProfileStore = create<State & Actions>((set) => ({
  info: defaultInfo,
  prefs: {
    markets: ["Crypto", "Futures"],
    timeframes: ["15m", "1H", "4H"],
    risk: "Moderate",
    experience: "Advanced",
    defaultExchange: "Binance",
  },
  connections: {
    google: { connected: true, email: "alex@morgan.trade" },
    telegram: { connected: false, username: null },
    discord: { connected: false, username: null },
    binance: { connected: true },
    bybit: { connected: false },
    okx: { connected: false },
  },
  plan: "Starter",
  memberSince: "Jan 2025",
  archetype: "MOMENTUM TRADER",
  daysActive: 47,
  signalsViewed: 312,
  publicProfile: false,

  setPublicProfile: (v) => set({ publicProfile: v }),

  setInfo: (patch) => set((s) => ({ info: { ...s.info, ...patch } })),
  setPrefs: (patch) => set((s) => ({ prefs: { ...s.prefs, ...patch } })),
  toggleMarket: (m) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        markets: s.prefs.markets.includes(m)
          ? s.prefs.markets.filter((x) => x !== m)
          : [...s.prefs.markets, m],
      },
    })),
  toggleTimeframe: (t) =>
    set((s) => ({
      prefs: {
        ...s.prefs,
        timeframes: s.prefs.timeframes.includes(t)
          ? s.prefs.timeframes.filter((x) => x !== t)
          : [...s.prefs.timeframes, t],
      },
    })),
  setConnection: (k, patch) =>
    set((s) => ({ connections: { ...s.connections, [k]: { ...s.connections[k], ...patch } } })),
}));

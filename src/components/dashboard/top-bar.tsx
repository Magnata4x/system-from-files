import { Bell, Search, ChevronDown, LogOut, Settings, User, Cpu, Activity, ShieldAlert, Sparkles, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardStore } from "@/lib/dashboard-store";
import { useBot4xStore } from "@/lib/bot4x-store";
import { useNotificationsStore, type NotifType } from "@/lib/notifications-store";
import { useLivePrices } from "@/hooks/useLivePrices";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useRef, useEffect } from "react";
import { TourHelpButton } from "@/components/tour/help-button";
import { useCopilotUI } from "@/lib/copilot-ui-store";

const PROFILE_INITIAL: Record<string, string> = {
  conservador: "C",
  regular: "R",
  agressivo: "A",
  "agressivo-galaxy": "G",
};

const NOTIF_META: Record<NotifType, { icon: typeof Cpu; color: string }> = {
  EXECUTE: { icon: Activity, color: "#1D9E75" },
  EMERGENCY_SHUTDOWN: { icon: ShieldAlert, color: "#E24B4A" },
  PROFIT_LOCK: { icon: TrendingUp, color: "#1D9E75" },
  ALERT: { icon: Bell, color: "#EF9F27" },
  INFO: { icon: Sparkles, color: "#7F77DD" },
};

/* ── Price flash animation ── */
function usePriceFlash(price: number) {
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(price);

  useEffect(() => {
    if (prev.current !== price && prev.current !== 0) {
      setFlash(price > prev.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 400);
      prev.current = price;
      return () => clearTimeout(t);
    }
    prev.current = price;
  }, [price]);

  return flash;
}

function fmtPrice(p: number) {
  if (p >= 1000) return "$" + p.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return "$" + p.toFixed(4);
  return "$" + p.toFixed(6);
}

/* ── Skeleton ── */
function SkeletonBar({ className }: { className?: string }) {
  return (
    <span className={`inline-block rounded-md bg-secondary animate-pulse ${className ?? ""}`} />
  );
}

export function TopBar() {
  const { user } = useAuth();
  const setCmdkOpen = useDashboardStore((s) => s.setCmdkOpen);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { prices, global, fearGreed, loading, error, lastUpdate } = useLivePrices();

  /* UTC clock */
  const [utcTime, setUtcTime] = useState("");
  useEffect(() => {
    const tick = () => setUtcTime(new Date().toUTCString().slice(17, 22) + " UTC");
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name = (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0]
    ?? user?.email?.split("@")[0]
    ?? "Trader";

  const btc = prices.BTC;
  const eth = prices.ETH;
  const btcDom = global?.btcDominance;
  const fg = fearGreed;

  /* Fear & Greed color */
  const fgColor = !fg
    ? "#888780"
    : fg.value >= 75
      ? "#E24B4A"
      : fg.value >= 55
        ? "#EF9F27"
        : fg.value >= 45
          ? "#888780"
          : fg.value >= 25
            ? "#378ADD"
            : "#185FA5";

  /* Live dot color */
  const isLive = !loading && !error;

  return (
    <header className="h-12 sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur flex items-center px-4 gap-3 md:gap-6">
      {/* Left: greeting */}
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="hidden sm:inline text-[14px] text-muted-foreground">Dashboard</span>
        <span className="text-[14px] md:text-[16px] font-medium text-foreground truncate">{greeting}, {name}</span>
      </div>

      {/* Center: live prices */}
      <div data-tour="top-bar-prices" className="hidden xl:flex items-center gap-4 mx-auto text-[13px] tabular-nums">
        {/* Market status */}
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary border border-border">
          <span className={`size-1.5 rounded-full animate-pulse ${isLive ? "bg-[#1D9E75]" : "bg-[#EF9F27]"}`} />
          <span className="text-foreground">{loading ? "Syncing…" : "Markets Open"}</span>
        </span>

        {/* BTC */}
        {loading ? (
          <span className="flex items-center gap-1.5">
            <SkeletonBar className="w-8 h-4" />
            <SkeletonBar className="w-16 h-4" />
            <SkeletonBar className="w-10 h-4" />
          </span>
        ) : (
          btc && <PriceItem symbol="BTC" price={btc.price} change24h={btc.change24h} />
        )}

        {/* ETH */}
        {loading ? (
          <span className="flex items-center gap-1.5">
            <SkeletonBar className="w-8 h-4" />
            <SkeletonBar className="w-16 h-4" />
            <SkeletonBar className="w-10 h-4" />
          </span>
        ) : (
          eth && <PriceItem symbol="ETH" price={eth.price} change24h={eth.change24h} />
        )}

        {/* BTC Dominance */}
        {loading ? (
          <SkeletonBar className="w-24 h-4" />
        ) : (
          btcDom !== undefined && (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">BTC.D</span>
              <span className="text-foreground">{btcDom.toFixed(1)}%</span>
            </span>
          )
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 ml-auto">
        {/* Error badge */}
        {error && (
          <span
            className="hidden md:flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium"
            style={{
              background: "color-mix(in oklab, #EF9F27 18%, transparent)",
              color: "#EF9F27",
              border: "1px solid color-mix(in oklab, #EF9F27 35%, transparent)",
            }}
            title={error}
          >
            <AlertTriangle className="size-3" />
            API error
          </span>
        )}

        {/* Fear & Greed */}
        {loading ? (
          <SkeletonBar className="hidden md:inline-block w-20 h-6" />
        ) : (
          fg && (
            <span
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] font-medium"
              style={{
                background: `color-mix(in oklab, ${fgColor} 18%, transparent)`,
                color: fgColor,
                border: `1px solid color-mix(in oklab, ${fgColor} 35%, transparent)`,
              }}
            >
              <span className="tabular-nums">{fg.value}</span>
              <span>·</span>
              <span>{fg.label}</span>
            </span>
          )
        )}

        {/* UTC + Live */}
        <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3" />
          <span className="tabular-nums">{utcTime}</span>
        </span>
        {lastUpdate && (
          <span className="hidden lg:flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
            <span>Live</span>
          </span>
        )}

        <Bot4xPill />

        <button
          onClick={() => setCmdkOpen(true)}
          className="hidden sm:flex size-8 rounded-md hover:bg-secondary items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Search (Cmd+K)"
        >
          <Search className="size-4" />
        </button>

        <CopilotTopBarButton />

        <TourHelpButton />

        <NotificationsBell />

        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 px-2 h-8 rounded-md hover:bg-secondary"
          >
            <span className="size-7 rounded-full brand-gradient flex items-center justify-center text-[11px] font-semibold text-white uppercase">
              {name.slice(0, 1)}
            </span>
            <ChevronDown className="hidden sm:inline size-3.5 text-muted-foreground" />
          </button>
          {open && (
            <div className="absolute right-0 top-10 w-56 rounded-lg border border-border bg-card shadow-xl py-1.5 text-sm">
              <div className="px-3 py-2 border-b border-border">
                <div className="font-medium text-foreground truncate">{name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
              <Link to="/profile" onClick={() => setOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary">
                <User className="size-4" /> Profile
              </Link>
              <Link to="/settings" onClick={() => setOpen(false)} className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary">
                <Settings className="size-4" /> Settings
              </Link>
              <div className="my-1 h-px bg-border" />
              <button
                onClick={() => supabase.auth.signOut()}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-[#E24B4A] hover:bg-secondary"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ── PriceItem with flash animation ── */
function PriceItem({ symbol, price, change24h }: { symbol: string; price: number; change24h: number }) {
  const flash = usePriceFlash(price);
  const up = change24h >= 0;

  const flashBg = flash === "up"
    ? "color-mix(in oklab, #1D9E75 14%, transparent)"
    : flash === "down"
      ? "color-mix(in oklab, #E24B4A 14%, transparent)"
      : "transparent";

  return (
    <span
      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md transition-colors duration-400"
      style={{ background: flashBg }}
    >
      <span className="text-muted-foreground">{symbol}</span>
      <span className="text-foreground tabular-nums">{fmtPrice(price)}</span>
      <span style={{ color: up ? "#1D9E75" : "#E24B4A" }}>
        {up ? "+" : ""}{change24h.toFixed(1)}%
      </span>
    </span>
  );
}

function Bot4xPill() {
  const mode = useBot4xStore((s) => s.mode);
  const profile = useBot4xStore((s) => s.profile);
  const pnl = useBot4xStore((s) => s.dailyPnlPct);
  const orders = useBot4xStore((s) => s.orders);

  const breaker = pnl <= -1.5;
  const warn = pnl < -0.5 && !breaker;
  const pnlColor = breaker ? "#E24B4A" : warn ? "#EF9F27" : pnl >= 0 ? "#1D9E75" : "#E24B4A";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="hidden sm:flex items-center gap-2 px-2 h-8 rounded-md border text-[11.5px] font-medium tabular-nums transition-colors hover:bg-secondary"
          style={{ borderColor: `color-mix(in oklab, ${pnlColor} 35%, var(--border))` }}
          title="Bot4x status"
        >
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider"
            style={{
              background: mode === "REAL" ? "color-mix(in oklab, #E24B4A 18%, transparent)" : "color-mix(in oklab, #1D9E75 18%, transparent)",
              color: mode === "REAL" ? "#E24B4A" : "#1D9E75",
              border: `1px solid color-mix(in oklab, ${mode === "REAL" ? "#E24B4A" : "#1D9E75"} 35%, transparent)`,
            }}
          >
            {mode}
          </span>
          <Cpu className="size-3.5" style={{ color: pnlColor }} />
          <span style={{ color: pnlColor }}>{pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0 overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Bot4x</h4>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold border"
              style={{ borderColor: `${pnlColor}55`, color: pnlColor, background: `color-mix(in oklab, ${pnlColor} 14%, transparent)` }}
            >
              {breaker ? "SHUTDOWN" : warn ? "WARNING" : "ACTIVE"}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <Stat label="Mode" value={mode} />
            <Stat label="Profile" value={profile.split("-")[0]} />
            <Stat label="PnL hoje" value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}%`} color={pnlColor} />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Ordens abertas</span>
            <span className="text-foreground font-medium tabular-nums">{orders.length}</span>
          </div>
          <Link
            to="/bot4x"
            className="block text-center w-full h-8 leading-8 rounded-md bg-[var(--brand-blue-deep)] hover:bg-[var(--brand-blue)] text-foreground text-[12px] font-medium transition-colors"
          >
            Open Bot4x →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-md border border-border bg-card/40 p-2">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
      <div className="text-[12px] font-medium tabular-nums truncate uppercase" style={{ color: color ?? "var(--foreground)" }}>{value}</div>
    </div>
  );
}

function NotificationsBell() {
  const events = useNotificationsStore((s) => s.events);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);
  const dismiss = useNotificationsStore((s) => s.dismiss);
  const unread = events.filter((e) => !e.read).length;

  return (
    <Popover onOpenChange={(o) => { if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative size-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#E24B4A] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <h4 className="text-sm font-semibold">Notifications</h4>
          <span className="text-[11px] text-muted-foreground">{events.length} eventos</span>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {events.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Sem notificações</div>
          ) : (
            events.slice(0, 10).map((e) => {
              const M = NOTIF_META[e.type];
              const Icon = M.icon;
              return (
                <div key={e.id} className="flex items-start gap-2.5 px-3 py-2.5 border-b border-border/60 last:border-b-0 hover:bg-secondary/40">
                  <div
                    className="size-7 rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${M.color} 16%, transparent)`, color: M.color }}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-medium text-foreground line-clamp-1">{e.title}</div>
                    {e.body && <div className="text-[11px] text-muted-foreground line-clamp-2">{e.body}</div>}
                    <div className="text-[10px] text-muted-foreground mt-0.5">{relativeTime(e.createdAt)}</div>
                  </div>
                  <button
                    onClick={() => dismiss(e.id)}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function relativeTime(ts: number) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

/* ── legacy Ticker kept for safety ── */
function Ticker({ symbol, price, change }: { symbol: string; price: number; change: number }) {
  const up = change >= 0;
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{symbol}</span>
      <span className="text-foreground tabular-nums">${price.toLocaleString(undefined, { maximumFractionDigits: price > 100 ? 0 : 2 })}</span>
      <span style={{ color: up ? "#1D9E75" : "#E24B4A" }}>{up ? "+" : ""}{change.toFixed(1)}%</span>
    </span>
  );
}

function CopilotTopBarButton() {
  const open = useCopilotUI((s) => s.open);
  const toggle = useCopilotUI((s) => s.toggle);
  return (
    <button
      onClick={toggle}
      className="hidden sm:flex size-8 rounded-md items-center justify-center transition-all hover:scale-105"
      style={{
        border: `1.5px solid ${open ? "#00e5a0" : "#00e5a055"}`,
        background: open ? "#00e5a015" : "transparent",
      }}
      title="AI Copilot"
      aria-label="AI Copilot"
    >
      <span
        className="size-2 rounded-full"
        style={{
          background: "#00e5a0",
          boxShadow: "0 0 8px #00e5a088",
        }}
      />
    </button>
  );
}

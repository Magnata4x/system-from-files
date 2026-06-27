import { useAlertsStore, type FeedItem } from "@/lib/alerts-store";
import { AlertTriangle, Activity, Zap, TrendingUp, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const META: Record<FeedItem["kind"], { color: string; icon: typeof Activity }> = {
  manipulation: { color: "#E24B4A", icon: AlertTriangle },
  signal: { color: "#3B82F6", icon: Activity },
  volatility: { color: "#F59E0B", icon: Zap },
  profit: { color: "#10B981", icon: TrendingUp },
};

function timeAgo(t: number) {
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function RecentFeed() {
  const { feed, markRead, markAllRead, clearFeed } = useAlertsStore();
  const unread = feed.filter((f) => !f.read).length;

  return (
    <section className="rounded-xl border border-border bg-card/40">
      <header className="px-5 py-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">Recent alerts</h2>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--brand-cyan)] text-background">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={markAllRead}
            disabled={unread === 0}
            className="px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Mark all read
          </button>
          <button
            onClick={clearFeed}
            disabled={feed.length === 0}
            className="px-2.5 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Clear all
          </button>
        </div>
      </header>

      <ul className="divide-y divide-border max-h-[480px] overflow-y-auto">
        <AnimatePresence initial={false}>
          {feed.length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-muted-foreground">No alerts yet.</li>
          )}
          {feed.map((item) => {
            const meta = META[item.kind];
            const Icon = meta.icon;
            return (
              <motion.li
                key={item.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="group relative px-5 py-3 flex items-start gap-3 hover:bg-secondary/30"
                style={{ borderLeft: `3px solid ${meta.color}`, opacity: item.read ? 0.55 : 1 }}
              >
                <div
                  className="size-8 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${meta.color}1a`, color: meta.color }}
                >
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium">{item.type}</span>
                    <span className="text-xs font-mono text-muted-foreground">{item.asset}</span>
                    {!item.read && <span className="size-1.5 rounded-full bg-[var(--brand-cyan)]" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-muted-foreground tabular-nums">{timeAgo(item.at)}</span>
                  {!item.read && (
                    <button
                      onClick={() => markRead(item.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity size-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                      title="Mark read"
                    >
                      <Check className="size-3.5" />
                    </button>
                  )}
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </section>
  );
}

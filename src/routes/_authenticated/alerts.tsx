import { createFileRoute } from "@tanstack/react-router";
import { useState, KeyboardEvent } from "react";
import { Send, Mail, Bell, MessageSquare, Phone, X, Check, Zap } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { ChannelRow } from "@/components/alerts/channel-row";
import { TelegramConnectModal } from "@/components/alerts/telegram-modal";
import { MessagePreview } from "@/components/alerts/message-preview";
import { RecentFeed } from "@/components/alerts/recent-feed";
import { VolumeChart } from "@/components/alerts/volume-chart";
import { useAlertsStore, type AlertType, type Frequency } from "@/lib/alerts-store";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — AISignalRadar" },
      { name: "description", content: "Configure delivery channels, alert types, frequency and quiet hours." },
    ],
  }),
  component: AlertsPage,
});

const TYPES: { id: AlertType; label: string }[] = [
  { id: "signal_high", label: "New signal (score ≥80)" },
  { id: "signal_any", label: "New signal (any)" },
  { id: "manipulation", label: "Manipulation detected" },
  { id: "fake_breakout", label: "Fake breakout" },
  { id: "stop_hunt", label: "Stop hunt" },
  { id: "volatility", label: "High volatility" },
  { id: "trend_change", label: "Trend change" },
  { id: "setup_confirmed", label: "Setup confirmed" },
  { id: "market_open", label: "Market open (London/NY)" },
  { id: "sentiment", label: "Sentiment shift" },
];

const FREQS: { id: Frequency; label: string }[] = [
  { id: "realtime", label: "Real-time" },
  { id: "15min", label: "Every 15min" },
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily digest" },
];

function AlertsPage() {
  const s = useAlertsStore();
  const [tgOpen, setTgOpen] = useState(false);
  const [assetInput, setAssetInput] = useState("");

  const addAsset = (raw: string) => {
    const t = raw.trim().toUpperCase().replace(/[, ]+/g, "");
    if (!t || s.assets.includes(t)) return;
    s.setAssets([...s.assets, t]);
  };
  const onAssetKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addAsset(assetInput);
      setAssetInput("");
    } else if (e.key === "Backspace" && !assetInput && s.assets.length) {
      s.setAssets(s.assets.slice(0, -1));
    }
  };

  const sendTestAlert = () => {
    const active = Object.entries(s.channels).filter(([, c]) => c.on).map(([k]) => k);
    if (active.length === 0) {
      toast.error("No channels enabled", { description: "Turn on at least one delivery channel." });
      return;
    }
    s.pushFeed({
      id: `test-${Date.now()}`,
      kind: "signal",
      type: "Test alert",
      asset: "BTC/USDT",
      description: `Sample notification delivered via ${active.join(", ")}.`,
      at: Date.now(),
      read: false,
    });
    toast.success("Test alert sent", {
      description: `Delivered to ${active.length} channel${active.length > 1 ? "s" : ""}: ${active.join(", ")}.`,
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5">
          <header className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Alerts</h1>
              <p className="text-sm text-muted-foreground mt-1">Choose how and when AISignalRadar reaches you.</p>
            </div>
            <Button onClick={sendTestAlert} variant="outline" className="gap-2">
              <Zap className="size-4 text-[var(--brand-cyan)]" />
              Test alert
            </Button>
          </header>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
            <div className="space-y-5 min-w-0">
              {/* Section 1: Channels */}
              <Section title="Alert channels" subtitle="Connect one or more delivery channels.">
                <div className="space-y-2.5">
                  <ChannelRow
                    icon={Send}
                    iconColor="#229ED9"
                    label="Telegram"
                    description="Receive signals via Telegram bot"
                    on={s.channels.telegram.on}
                    onToggle={() => s.toggleChannel("telegram")}
                    badge={
                      s.channels.telegram.on && s.channels.telegram.username ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                          <span className="size-1.5 rounded-full bg-emerald-400" />
                          Connected
                        </span>
                      ) : null
                    }
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">Bot:</span>
                      <code className="px-2 py-1 rounded bg-secondary font-mono text-foreground">
                        {s.channels.telegram.username ?? "@AISignalRadarBot"}
                      </code>
                      <Button size="sm" variant="outline" onClick={() => setTgOpen(true)} className="h-7 text-xs">
                        Reconnect
                      </Button>
                    </div>
                  </ChannelRow>

                  <ChannelRow
                    icon={Mail}
                    iconColor="#F59E0B"
                    label="Email"
                    description="Daily digest and critical alerts"
                    on={s.channels.email.on}
                    onToggle={() => s.toggleChannel("email")}
                  >
                    <Input
                      type="email"
                      placeholder="you@domain.com"
                      value={s.channels.email.address}
                      onChange={(e) => s.setChannelField("email", { address: e.target.value })}
                      className="h-9 text-sm"
                    />
                  </ChannelRow>

                  <ChannelRow
                    icon={Bell}
                    iconColor="#A78BFA"
                    label="Push notifications"
                    description="Browser push"
                    on={s.channels.push.on}
                    onToggle={() => s.toggleChannel("push")}
                  >
                    <Button size="sm" variant="outline" className="h-8 text-xs">
                      Enable browser push
                    </Button>
                  </ChannelRow>

                  <ChannelRow
                    icon={MessageSquare}
                    iconColor="#5865F2"
                    label="Discord"
                    description="Send to Discord server"
                    on={s.channels.discord.on}
                    onToggle={() => s.toggleChannel("discord")}
                  >
                    <Input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={s.channels.discord.webhook}
                      onChange={(e) => s.setChannelField("discord", { webhook: e.target.value })}
                      className="h-9 text-sm font-mono"
                    />
                  </ChannelRow>

                  <ChannelRow
                    icon={Phone}
                    iconColor="#25D366"
                    label="WhatsApp"
                    description="Via WhatsApp Business API"
                    on={false}
                    disabled
                    badge={
                      <span className="px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
                        Coming soon
                      </span>
                    }
                  />
                </div>
              </Section>

              {/* Section 2: Alert types */}
              <Section title="Alert types" subtitle="Pick the events worth interrupting you.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TYPES.map((t) => {
                    const on = s.types[t.id];
                    return (
                      <button
                        key={t.id}
                        onClick={() => s.toggleType(t.id)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left text-[13px] transition-colors ${
                          on
                            ? "border-[var(--brand-cyan)]/40 bg-[var(--brand-cyan)]/5 text-foreground"
                            : "border-border bg-card/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span
                          className={`size-4 rounded border flex items-center justify-center shrink-0 ${
                            on ? "bg-[var(--brand-cyan)] border-[var(--brand-cyan)]" : "border-border"
                          }`}
                        >
                          {on && <Check className="size-3 text-background" strokeWidth={3} />}
                        </span>
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </Section>

              {/* Section 3: Filters & Frequency */}
              <Section title="Filters & frequency">
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[13px] font-medium">Minimum score</label>
                      <span className="text-xs font-mono text-[var(--brand-cyan)]">{s.minScore}</span>
                    </div>
                    <Slider
                      value={[s.minScore]}
                      min={0}
                      max={100}
                      step={5}
                      onValueChange={(v) => s.setMinScore(v[0])}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      You'll receive alerts scored <b className="text-foreground">{s.minScore}+</b>.
                    </p>
                  </div>

                  <div>
                    <label className="text-[13px] font-medium block mb-2">Frequency</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FREQS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => s.setFrequency(f.id)}
                          className={`px-3 py-2 rounded-md border text-[12px] font-medium transition-colors ${
                            s.frequency === f.id
                              ? "border-[var(--brand-cyan)]/50 bg-[var(--brand-cyan)]/10 text-foreground"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[13px] font-medium">Quiet hours</div>
                        <div className="text-xs text-muted-foreground">Silence non-critical alerts overnight.</div>
                      </div>
                      <Switch checked={s.quietHours.on} onCheckedChange={(v) => s.setQuiet({ on: v })} />
                    </div>
                    {s.quietHours.on && (
                      <div className="mt-3 flex items-center gap-2 text-sm">
                        <Input
                          type="time"
                          value={s.quietHours.from}
                          onChange={(e) => s.setQuiet({ from: e.target.value })}
                          className="h-9 w-32"
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <Input
                          type="time"
                          value={s.quietHours.to}
                          onChange={(e) => s.setQuiet({ to: e.target.value })}
                          className="h-9 w-32"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[13px] font-medium block mb-2">Assets to monitor</label>
                    <div className="flex flex-wrap items-center gap-1.5 min-h-9 px-2 py-1.5 rounded-md border border-border bg-card/40 focus-within:border-[var(--brand-cyan)]/50">
                      {s.assets.map((a) => (
                        <span
                          key={a}
                          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded bg-[var(--brand-blue-deep)] text-foreground text-xs font-mono"
                        >
                          {a}
                          <button
                            onClick={() => s.setAssets(s.assets.filter((x) => x !== a))}
                            className="size-4 rounded hover:bg-white/10 flex items-center justify-center"
                          >
                            <X className="size-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={assetInput}
                        onChange={(e) => setAssetInput(e.target.value)}
                        onKeyDown={onAssetKey}
                        onBlur={() => {
                          if (assetInput) {
                            addAsset(assetInput);
                            setAssetInput("");
                          }
                        }}
                        placeholder={s.assets.length ? "" : "BTC, ETH, SOL..."}
                        className="flex-1 min-w-[100px] bg-transparent outline-none text-sm py-1"
                      />
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-3 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium">Include Bot4x execution alerts</div>
                      <div className="text-xs text-muted-foreground">Fills, stops, circuit breakers, shutdowns.</div>
                    </div>
                    <Switch checked={s.bot4x} onCheckedChange={s.toggleBot4x} />
                  </div>
                </div>
              </Section>

              {/* Section 4: Volume */}
              <VolumeChart />

              {/* Section 5: Recent feed */}
              <RecentFeed />
            </div>

            <aside className="hidden xl:block">
              <MessagePreview />
            </aside>
          </div>

          <div className="xl:hidden">
            <MessagePreview />
          </div>
        </main>
      </div>

      <TelegramConnectModal open={tgOpen} onOpenChange={setTgOpen} />
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card/40 p-5">
      <header className="mb-4">
        <h2 className="text-sm font-medium">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

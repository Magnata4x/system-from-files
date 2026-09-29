import { useState } from "react";
import { Send, MessageSquare, KeyRound, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/lib/profile-store";
import { TelegramConnectModal } from "@/components/alerts/telegram-modal";
import { toast } from "sonner";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#5865F2" aria-hidden>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .031-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function ConnectedAccounts() {
  const { connections, setConnection } = useProfileStore();
  const [tgOpen, setTgOpen] = useState(false);

  return (
    <>
      <section className="rounded-xl border border-border bg-card/40 p-5">
        <header className="mb-4">
          <h2 className="text-sm font-medium">Connected accounts</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Sign-in providers and chat integrations.</p>
        </header>

        <div className="space-y-2.5">
          <Row
            icon={<GoogleIcon className="size-5" />}
            label="Google"
            status={connections.google.connected ? `Connected — ${connections.google.email}` : "Not connected"}
            connected={connections.google.connected}
            action={
              connections.google.connected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConnection("google", { connected: false, email: null });
                    toast.success("Google disconnected");
                  }}
                  className="border-destructive/40 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={() => setConnection("google", { connected: true, email: "you@gmail.com" })}>
                  Connect
                </Button>
              )
            }
          />

          <Row
            icon={<Send className="size-5 text-[#229ED9]" />}
            label="Telegram"
            status={connections.telegram.connected ? `Connected — ${connections.telegram.username}` : "Connect via @AISignalRadarBot"}
            connected={connections.telegram.connected}
            action={
              connections.telegram.connected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConnection("telegram", { connected: false, username: null })}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  Disconnect
                </Button>
              ) : (
                <Button size="sm" onClick={() => setTgOpen(true)}>Connect</Button>
              )
            }
          />

          <Row
            icon={<DiscordIcon className="size-5" />}
            label="Discord"
            status={connections.discord.connected ? `Connected — ${connections.discord.username}` : "Not connected"}
            connected={connections.discord.connected}
            action={
              connections.discord.connected ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConnection("discord", { connected: false, username: null })}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    setConnection("discord", { connected: true, username: "alex#4421" });
                    toast.success("Discord connected");
                  }}
                >
                  Connect
                </Button>
              )
            }
          />
        </div>

        {/* Exchange APIs */}
        <div className="mt-6">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <KeyRound className="size-3.5" /> Exchange APIs <span className="text-muted-foreground/60">(read-only)</span>
          </h3>
          <div className="space-y-2.5">
            {[
              { id: "binance", label: "Binance", color: "#F0B90B" },
              { id: "bybit", label: "Bybit", color: "#F7A600" },
              { id: "okx", label: "OKX", color: "#FFFFFF" },
            ].map((ex) => {
              const c = connections[ex.id as "binance" | "bybit" | "okx"];
              return (
                <Row
                  key={ex.id}
                  icon={
                    <div className="size-9 rounded-md flex items-center justify-center" style={{ background: `${ex.color}1f` }}>
                      <span className="text-[11px] font-bold tracking-tight" style={{ color: ex.color }}>{ex.label.slice(0, 3).toUpperCase()}</span>
                    </div>
                  }
                  customIcon
                  label={ex.label}
                  status={c.connected ? "Connected — read-only" : "Not connected"}
                  connected={c.connected}
                  action={
                    c.connected ? (
                      <Button size="sm" variant="outline">Manage</Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setConnection(ex.id as "binance" | "bybit" | "okx", { connected: true });
                          toast.success(`${ex.label} API connected (read-only)`);
                        }}
                      >
                        Connect API
                      </Button>
                    )
                  }
                />
              );
            })}
          </div>

          <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/5 text-[12px] text-amber-200">
            <AlertTriangle className="size-4 mt-0.5 shrink-0 text-amber-400" />
            <span>
              We only accept <b>read-only</b> API keys. AISignalRadar never requests trading or withdrawal permissions.
            </span>
          </div>
        </div>
      </section>

      <TelegramConnectModal open={tgOpen} onOpenChange={setTgOpen} />
    </>
  );
}

function Row({
  icon,
  label,
  status,
  connected,
  action,
  customIcon,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  connected: boolean;
  action: React.ReactNode;
  customIcon?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card/40 p-3">
      {customIcon ? icon : (
        <div className="size-9 rounded-md flex items-center justify-center shrink-0 bg-secondary">{icon}</div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium">{label}</span>
          {connected && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="size-3" /> Connected
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{status}</p>
      </div>
      {action}
    </div>
  );
}

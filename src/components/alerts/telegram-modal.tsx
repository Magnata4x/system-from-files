import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Send, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAlertsStore } from "@/lib/alerts-store";
import { toast } from "sonner";

type Status = "idle" | "waiting" | "connected";

export function TelegramConnectModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [copiedField, setCopiedField] = useState<"link" | "code" | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const code = "AISR-3F92-8KQ1";
  const botLink = "https://t.me/AISignalRadarBot";
  const { setChannelField, toggleChannel, channels } = useAlertsStore();

  useEffect(() => {
    if (!open) {
      setStatus("idle");
      setCopiedField(null);
    }
  }, [open]);

  const copy = async (text: string, field: "link" | "code") => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const verify = () => {
    setStatus("waiting");
    setTimeout(() => {
      setStatus("connected");
      if (!channels.telegram.on) toggleChannel("telegram");
      setChannelField("telegram", { username: "@AISignalRadarBot" });
      toast.success("Telegram connected", { description: "You'll receive alerts on this chat." });
    }, 1800);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="size-4 text-[#229ED9]" />
            Connect Telegram
          </DialogTitle>
          <DialogDescription>Three steps to link your account to the bot.</DialogDescription>
        </DialogHeader>

        <ol className="space-y-4 text-sm">
          <Step n={1} title="Open the bot in Telegram">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-2.5 py-2 rounded-md bg-secondary text-foreground font-mono text-xs truncate">
                {botLink}
              </code>
              <button
                onClick={() => copy(botLink, "link")}
                className="size-8 rounded-md bg-secondary hover:bg-secondary/70 flex items-center justify-center text-muted-foreground hover:text-foreground"
                title="Copy link"
              >
                {copiedField === "link" ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-3.5" />}
              </button>
              <a
                href={botLink}
                target="_blank"
                rel="noreferrer"
                className="size-8 rounded-md bg-[#229ED9] hover:bg-[#229ED9]/90 text-white flex items-center justify-center"
                title="Open"
              >
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </Step>

          <Step n={2} title="Send the start command">
            <div className="flex items-center gap-2">
              <code className="px-2.5 py-2 rounded-md bg-secondary text-foreground font-mono text-xs">/start</code>
              <span className="text-xs text-muted-foreground">in the chat with the bot.</span>
            </div>
          </Step>

          <Step n={3} title="Paste your pairing code">
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-secondary text-foreground font-mono text-sm tracking-wider">
                {code}
              </code>
              <button
                onClick={() => copy(code, "code")}
                className="size-9 rounded-md bg-secondary hover:bg-secondary/70 flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                {copiedField === "code" ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5">Expires in 10 minutes.</p>
          </Step>
        </ol>

        <div className="border-t border-border pt-3 flex items-center justify-between gap-3">
          <div className="text-xs flex items-center gap-2 min-w-0">
            {status === "idle" && (
              <span className="text-muted-foreground">Waiting for you to paste the code…</span>
            )}
            {status === "waiting" && (
              <>
                <Loader2 className="size-3.5 animate-spin text-[var(--brand-cyan)]" />
                <span className="text-muted-foreground">Listening for confirmation…</span>
              </>
            )}
            {status === "connected" && (
              <>
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium">Connected to @AISignalRadarBot</span>
              </>
            )}
          </div>
          {status === "connected" ? (
            <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <Button size="sm" onClick={verify} disabled={status === "waiting"}>
              {status === "waiting" ? "Verifying…" : "I've sent the code"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="size-6 rounded-full bg-[var(--brand-blue-deep)] text-foreground flex items-center justify-center text-xs font-medium shrink-0">
        {n}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium mb-1.5">{title}</div>
        {children}
      </div>
    </li>
  );
}

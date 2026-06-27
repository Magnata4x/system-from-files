import { useState } from "react";
import { Copy, Check, RefreshCw, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { WEBHOOK_EVENTS, RECENT_DELIVERIES } from "@/lib/api-data";
import { cn } from "@/lib/utils";

function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function WebhookConfig() {
  const [url, setUrl] = useState("https://example.com/webhooks/aisr");
  const [secret, setSecret] = useState(() => randomSecret());
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState<string[]>(["new_signal", "manipulation_alert"]);
  const [deliveries, setDeliveries] = useState(RECENT_DELIVERIES);
  const [testing, setTesting] = useState(false);

  function toggle(id: string) {
    setEvents((p) => (p.includes(id) ? p.filter((e) => e !== id) : [...p, id]));
  }

  async function copySecret() {
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  }

  async function testWebhook() {
    setTesting(true);
    await new Promise((r) => setTimeout(r, 900));
    const ok = Math.random() > 0.2;
    const entry = {
      ts: new Date().toISOString().replace("T", " ").slice(0, 19),
      event: "test.ping",
      status: ok ? 200 : 502,
      ms: Math.round(80 + Math.random() * 200),
    };
    setDeliveries((p) => [entry, ...p].slice(0, 8));
    toast[ok ? "success" : "error"](
      ok ? `Webhook delivered (${entry.ms}ms)` : `Webhook failed: ${entry.status}`
    );
    setTesting(false);
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">Webhooks</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Receive real-time events on your own infrastructure.</p>
      </header>

      <div className="rounded-lg border border-border bg-card/40 p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Endpoint URL</label>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhook"
            className="font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Signing secret</label>
          <div className="flex gap-2">
            <div className="flex-1 font-mono text-xs px-3 py-2 rounded-md border border-border bg-secondary/40 text-foreground/80 truncate">
              {secret}
            </div>
            <Button variant="outline" size="icon" onClick={copySecret} title="Copy secret">
              {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setSecret(randomSecret())} title="Regenerate">
              <RefreshCw className="size-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Events</label>
          <div className="flex flex-wrap gap-4">
            {WEBHOOK_EVENTS.map((ev) => (
              <label key={ev.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={events.includes(ev.id)}
                  onCheckedChange={() => toggle(ev.id)}
                />
                <span>{ev.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={testWebhook} disabled={testing} className="bg-[#378ADD] hover:bg-[#2d74bd] text-white">
            <Send className="size-3.5 mr-1.5" />
            {testing ? "Sending..." : "Test webhook"}
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Recent deliveries</h3>
        <div className="rounded-lg border border-border bg-card/40 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wide text-muted-foreground bg-secondary/30">
              <tr>
                <th className="text-left font-medium px-4 py-2.5">Timestamp</th>
                <th className="text-left font-medium px-4 py-2.5">Event</th>
                <th className="text-left font-medium px-4 py-2.5">Status</th>
                <th className="text-right font-medium px-4 py-2.5">Latency</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d, i) => (
                <tr key={i} className="border-t border-border/60">
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{d.ts}</td>
                  <td className="px-4 py-2.5 font-mono text-xs">{d.event}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "text-[11px] font-mono px-1.5 py-0.5 rounded border",
                        d.status < 300
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-red-500/10 text-red-400 border-red-500/30"
                      )}
                    >
                      {d.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{d.ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

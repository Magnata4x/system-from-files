import { useState } from "react";
import { SectionCard } from "./section-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CreditCard, ExternalLink, Download, Check, Sparkles, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const INVOICES = [
  { date: "May 01, 2026", desc: "Pro plan — monthly", amount: "$49.00", status: "paid" },
  { date: "Apr 01, 2026", desc: "Pro plan — monthly", amount: "$49.00", status: "paid" },
  { date: "Mar 01, 2026", desc: "Pro plan — monthly", amount: "$49.00", status: "paid" },
  { date: "Feb 01, 2026", desc: "Pro plan — monthly", amount: "$49.00", status: "failed" },
  { date: "Jan 01, 2026", desc: "Pro plan — monthly", amount: "$49.00", status: "paid" },
];

const PLANS = [
  { name: "Pro", price: "$49/mo", features: ["Real-time signals", "Bot4x access", "Email + Telegram alerts"], current: true },
  { name: "Institutional", price: "$199/mo", features: ["API key management", "Webhooks", "Priority support", "Multi-user team"], current: false },
];

export function SettingsBilling() {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("price");
  const [action, setAction] = useState<"cancel" | "pause">("cancel");
  const [pauseLen, setPauseLen] = useState("1");

  return (
    <>
      <SectionCard title="Current plan" action={<Button size="sm" onClick={() => toast.message("Opening Stripe Customer Portal…")}><ExternalLink className="size-3.5 mr-1" /> Manage</Button>}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">Pro</span>
              <Badge className="bg-[var(--brand-blue-deep)] text-foreground border-0">Active</Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-1">$49.00 USD / month · Next billing on June 01, 2026</div>
          </div>
          <Button size="sm" variant="secondary">Upgrade to Institutional</Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Switch to annual billing"
        description="Pay yearly and get 2 months free."
        action={<Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"><Sparkles className="size-3 mr-1" /> Save 17%</Badge>}
      >
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-background/30 p-3">
            <div className="text-xs text-muted-foreground">Monthly (current)</div>
            <div className="text-lg font-semibold mt-1">$588<span className="text-xs text-muted-foreground font-normal">/yr</span></div>
            <div className="text-xs text-muted-foreground mt-0.5">$49 × 12</div>
          </div>
          <div className="rounded-lg border border-[var(--brand-cyan)] bg-[var(--brand-blue-deep)]/30 p-3">
            <div className="text-xs text-[var(--brand-cyan)]">Annual</div>
            <div className="text-lg font-semibold mt-1">$490<span className="text-xs text-muted-foreground font-normal">/yr</span></div>
            <div className="text-xs text-muted-foreground mt-0.5">$40.83 effective / mo</div>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
            <div className="text-xs text-emerald-400 flex items-center gap-1"><TrendingDown className="size-3" /> Projected savings</div>
            <div className="text-lg font-semibold mt-1 text-emerald-400">$98<span className="text-xs text-muted-foreground font-normal">/yr</span></div>
            <div className="text-xs text-muted-foreground mt-0.5">≈ 2 months free</div>
          </div>
        </div>
        <div className="mt-3">
          <Button size="sm" onClick={() => toast.success("Switched to annual billing — you'll save $98/yr")}>Switch to annual</Button>
        </div>
      </SectionCard>

      <SectionCard title="Payment method" action={<Button size="sm" variant="outline" onClick={() => toast.message("Opening Stripe portal…")}>Update</Button>}>
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background/30">
          <div className="size-10 rounded-md bg-secondary flex items-center justify-center">
            <CreditCard className="size-5" />
          </div>
          <div>
            <div className="text-sm font-medium">Visa •••• 4242</div>
            <div className="text-xs text-muted-foreground">Expires 09/2028</div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Billing history">
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left font-medium px-2 py-2">Date</th>
                <th className="text-left font-medium px-2 py-2">Description</th>
                <th className="text-right font-medium px-2 py-2">Amount</th>
                <th className="text-center font-medium px-2 py-2">Status</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {INVOICES.map((i, k) => (
                <tr key={k} className="border-b border-border/50">
                  <td className="px-2 py-2">{i.date}</td>
                  <td className="px-2 py-2">{i.desc}</td>
                  <td className="px-2 py-2 text-right font-mono">{i.amount}</td>
                  <td className="px-2 py-2 text-center">
                    <Badge className={
                      i.status === "paid" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                      i.status === "failed" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                      "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                    }>{i.status}</Badge>
                  </td>
                  <td className="px-2 py-2 text-right">
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => toast.success("Downloading PDF…")}>
                      <Download className="size-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Plan comparison">
        <div className="grid sm:grid-cols-2 gap-3">
          {PLANS.map((p) => (
            <div key={p.name} className={`rounded-lg border p-4 ${p.current ? "border-[var(--brand-cyan)] bg-background/30" : "border-border"}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{p.name}</span>
                {p.current && <Badge variant="secondary">Current</Badge>}
              </div>
              <div className="text-lg font-semibold mt-1">{p.price}</div>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {p.features.map((f) => <li key={f} className="flex gap-2"><Check className="size-3.5 text-emerald-400 mt-0.5" />{f}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Cancel subscription" description="You can pause for 1–3 months instead.">
        <Button size="sm" variant="outline" className="text-red-400 border-red-500/30" onClick={() => setCancelOpen(true)}>Cancel subscription</Button>
      </SectionCard>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>We're sorry to see you go</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Reason</Label>
              <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                {[
                  { v: "price", l: "Too expensive" },
                  { v: "unused", l: "Not using it enough" },
                  { v: "missing", l: "Missing features" },
                  { v: "other", l: "Other" },
                ].map((r) => (
                  <label key={r.v} className="flex items-center gap-2 text-sm">
                    <RadioGroupItem value={r.v} /> {r.l}
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="rounded-lg border border-border p-3 bg-background/30">
              <Label className="text-xs mb-2 block">Or pause instead</Label>
              <RadioGroup value={action} onValueChange={(v) => setAction(v as "cancel" | "pause")} className="flex gap-4 text-sm">
                <label className="flex items-center gap-2"><RadioGroupItem value="pause" /> Pause</label>
                <label className="flex items-center gap-2"><RadioGroupItem value="cancel" /> Cancel</label>
              </RadioGroup>
              {action === "pause" && (
                <div className="mt-3 flex gap-2">
                  {["1","2","3"].map((m) => (
                    <button key={m} onClick={() => setPauseLen(m)} className={`px-3 py-1.5 rounded text-xs border ${pauseLen===m ? "border-[var(--brand-cyan)] bg-[var(--brand-blue-deep)]" : "border-border"}`}>{m} mo</button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep plan</Button>
            <Button
              variant={action === "cancel" ? "destructive" : "default"}
              onClick={() => {
                setCancelOpen(false);
                toast.success(action === "pause" ? `Subscription paused for ${pauseLen} month(s)` : "Subscription will end on June 01, 2026");
              }}
            >
              {action === "pause" ? "Pause subscription" : "Cancel subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

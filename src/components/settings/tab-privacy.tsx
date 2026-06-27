import { useState } from "react";
import { SectionCard } from "./section-card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SettingsPrivacy() {
  const [analytics, setAnalytics] = useState(true);
  const [perf, setPerf] = useState(true);
  const [personalization, setPersonalization] = useState(false);
  const [retention, setRetention] = useState("1y");
  const [format, setFormat] = useState("json");

  return (
    <>
      <SectionCard title="Data collection" description="Required to comply with LGPD / GDPR.">
        <div className="space-y-2">
          {[
            { l: "Product analytics", d: "Anonymous usage metrics to improve features.", v: analytics, set: setAnalytics },
            { l: "Performance tracking", d: "Latency and crash diagnostics.", v: perf, set: setPerf },
            { l: "Personalization", d: "Recommend signals based on your history.", v: personalization, set: setPersonalization },
          ].map((row) => (
            <div key={row.l} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30">
              <div>
                <div className="text-sm font-medium">{row.l}</div>
                <div className="text-xs text-muted-foreground">{row.d}</div>
              </div>
              <Switch checked={row.v} onCheckedChange={row.set} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Data retention" description="How long we keep your trading history.">
        <RadioGroup value={retention} onValueChange={setRetention} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { v: "3m", l: "3 months" },
            { v: "6m", l: "6 months" },
            { v: "1y", l: "1 year" },
            { v: "forever", l: "Forever" },
          ].map((r) => (
            <label key={r.v} className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer ${retention === r.v ? "border-[var(--brand-cyan)] bg-background/30" : "border-border"}`}>
              <RadioGroupItem value={r.v} /> {r.l}
            </label>
          ))}
        </RadioGroup>
      </SectionCard>

      <SectionCard title="Clear trading history" description="This removes your trade logs but keeps your account.">
        <Button size="sm" variant="outline" className="text-red-400 border-red-500/30" onClick={() => toast.success("Trading history cleared")}>Clear trading history</Button>
      </SectionCard>

      <SectionCard title="Export your data" description="Download a copy of all data we hold about you.">
        <div className="space-y-3">
          <RadioGroup value={format} onValueChange={setFormat} className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><RadioGroupItem value="json" /> JSON</label>
            <label className="flex items-center gap-2"><RadioGroupItem value="csv" /> CSV</label>
          </RadioGroup>
          <Button size="sm" onClick={() => toast.success(`We'll email you a ${format.toUpperCase()} export within 24h`)}>Export all data</Button>
        </div>
      </SectionCard>

      <SectionCard title="Legal">
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <a className="text-[var(--brand-cyan)] hover:underline" href="#">Privacy policy</a>
          <a className="text-[var(--brand-cyan)] hover:underline" href="#">Terms of service</a>
          <a className="text-red-400 hover:underline" href="#">Request account deletion</a>
        </div>
      </SectionCard>
    </>
  );
}

import { SectionCard } from "./section-card";
import { useAlertsStore } from "@/lib/alerts-store";
import { useBot4xPrefs } from "@/lib/bot4x-prefs-store";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Mail, MessageCircle, Smartphone, Hash, Phone } from "lucide-react";

const CHANNELS = [
  {
    id: "telegram" as const,
    icon: MessageCircle,
    label: "Telegram",
    desc: "Instant push via @AISignalRadarBot",
  },
  {
    id: "email" as const,
    icon: Mail,
    label: "Email",
    desc: "Daily digest and high-priority alerts",
  },
  {
    id: "push" as const,
    icon: Smartphone,
    label: "Mobile push",
    desc: "iOS / Android app notifications",
  },
  { id: "discord" as const, icon: Hash, label: "Discord", desc: "Webhook to your server" },
  {
    id: "whatsapp" as const,
    icon: Phone,
    label: "WhatsApp",
    desc: "Direct message to your number",
  },
];

const TYPES = [
  { id: "signal_high" as const, label: "High-confidence signals" },
  { id: "manipulation" as const, label: "Manipulation alerts" },
  { id: "volatility" as const, label: "Volatility spikes" },
  { id: "setup_confirmed" as const, label: "Setup confirmed" },
];

const BOT4X_ALERTS = [
  {
    id: "configChanged" as const,
    label: "Configuração alterada",
    desc: "Perfil, alavancagem, SL/TP ou alocação",
  },
  {
    id: "slTpHit" as const,
    label: "SL / TP atingidos",
    desc: "Fechamento de operações no stop ou alvo",
  },
  {
    id: "executionFailed" as const,
    label: "Execuções falhas",
    desc: "Erros de sincronização ou execução do motor",
  },
  {
    id: "circuitBreaker" as const,
    label: "Disjuntor / lucro travado",
    desc: "Circuit breaker e profit lock",
  },
];

export function SettingsNotifications() {
  const s = useAlertsStore();
  const bot4xAlerts = useBot4xPrefs((st) => st.bot4xAlerts);
  const setBot4xAlert = useBot4xPrefs((st) => st.setBot4xAlert);
  return (
    <>
      <SectionCard title="Channels" description="Where you want to receive alerts.">
        <div className="space-y-2">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            const enabled = s.channels[c.id].on;
            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30"
              >
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-md bg-secondary flex items-center justify-center">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{c.label}</div>
                    <div className="text-xs text-muted-foreground">{c.desc}</div>
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={() => s.toggleChannel(c.id)} />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Alert types" description="Categories you want to subscribe to.">
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <label
              key={t.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30"
            >
              <span className="text-sm">{t.label}</span>
              <Switch checked={s.types[t.id]} onCheckedChange={() => s.toggleType(t.id)} />
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Bot4x" description="Eventos do motor de execução que geram notificação.">
        <div className="space-y-2">
          {BOT4X_ALERTS.map((a) => (
            <label
              key={a.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/30"
            >
              <span>
                <span className="block text-sm font-medium">{a.label}</span>
                <span className="block text-xs text-muted-foreground">{a.desc}</span>
              </span>
              <Switch checked={bot4xAlerts[a.id]} onCheckedChange={(v) => setBot4xAlert(a.id, v)} />
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Filters" description={`Minimum signal score: ${s.minScore}`}>
        <Slider
          value={[s.minScore]}
          min={0}
          max={100}
          step={5}
          onValueChange={(v) => s.setMinScore(v[0])}
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>All signals</span>
          <span>High-confidence only</span>
        </div>
      </SectionCard>
    </>
  );
}

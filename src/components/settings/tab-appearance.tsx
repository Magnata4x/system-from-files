import { useState } from "react";
import { SectionCard } from "./section-card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Monitor, Cpu, RotateCcw, Check } from "lucide-react";
import { useBot4xPrefs } from "@/lib/bot4x-prefs-store";
import { useTourStore } from "@/lib/tour-store";
import { TOURS } from "@/lib/tour-content";

const THEMES = [
  { id: "dark", label: "Dark", icon: Moon, bg: "bg-zinc-900", fg: "bg-zinc-700" },
  { id: "light", label: "Light", icon: Sun, bg: "bg-zinc-100", fg: "bg-zinc-300" },
  { id: "system", label: "System", icon: Monitor, bg: "bg-gradient-to-br from-zinc-900 to-zinc-100", fg: "bg-zinc-500" },
];

export function SettingsAppearance() {
  const [theme, setTheme] = useState("dark");
  const [density, setDensity] = useState("default");
  const [sidebarPos, setSidebarPos] = useState("left");
  const [sidebarStyle, setSidebarStyle] = useState("icons");
  const [landing, setLanding] = useState("/dashboard");
  const [candle, setCandle] = useState("hollow");
  const [tf, setTf] = useState("15m");
  const [indicators, setIndicators] = useState(true);
  const [lang, setLang] = useState("pt-BR");
  const [currency, setCurrency] = useState("USD");
  const [dateFmt, setDateFmt] = useState("DD/MM/YYYY");
  const compactPill = useBot4xPrefs((s) => s.compactPill);
  const setCompactPill = useBot4xPrefs((s) => s.setCompactPill);

  return (
    <>
      <SectionCard title="Theme">
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const Icon = t.icon;
            const active = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`rounded-lg border p-3 text-left transition-colors ${active ? "border-[var(--brand-cyan)] ring-1 ring-[var(--brand-cyan)]" : "border-border hover:border-muted-foreground"}`}
              >
                <div className={`h-20 w-full rounded mb-2 ${t.bg} p-2 flex flex-col gap-1`}>
                  <div className={`h-1.5 w-1/3 rounded ${t.fg}`} />
                  <div className={`h-1.5 w-2/3 rounded ${t.fg}`} />
                  <div className={`h-1.5 w-1/2 rounded ${t.fg}`} />
                </div>
                <div className="flex items-center gap-1.5 text-sm">
                  <Icon className="size-3.5" /> {t.label}
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Density">
        <RadioGroup value={density} onValueChange={setDensity} className="grid grid-cols-3 gap-3">
          {[
            { v: "compact", label: "Compact", h: "h-1" },
            { v: "default", label: "Default", h: "h-1.5" },
            { v: "comfortable", label: "Comfortable", h: "h-2.5" },
          ].map((d) => (
            <label key={d.v} className={`rounded-lg border p-3 cursor-pointer flex flex-col gap-2 ${density === d.v ? "border-[var(--brand-cyan)]" : "border-border"}`}>
              <div className="space-y-1">
                <div className={`${d.h} bg-muted-foreground/30 rounded w-2/3`} />
                <div className={`${d.h} bg-muted-foreground/30 rounded w-full`} />
                <div className={`${d.h} bg-muted-foreground/30 rounded w-3/4`} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={d.v} /> {d.label}
              </div>
            </label>
          ))}
        </RadioGroup>
      </SectionCard>

      <SectionCard title="Sidebar">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Position</Label>
            <Select value={sidebarPos} onValueChange={setSidebarPos}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="left">Left</SelectItem>
                <SelectItem value="right">Right</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Display</Label>
            <Select value={sidebarStyle} onValueChange={setSidebarStyle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="icons">Icons only</SelectItem>
                <SelectItem value="labels">Icons + labels</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Defaults">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Default landing page</Label>
            <Select value={landing} onValueChange={setLanding}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="/dashboard">Dashboard</SelectItem>
                <SelectItem value="/signals">Signals</SelectItem>
                <SelectItem value="/bot4x">Bot4x</SelectItem>
                <SelectItem value="/alerts">Alerts</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Default timeframe</Label>
            <Select value={tf} onValueChange={setTf}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["1m","5m","15m","1h","4h","1d"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Candle style</Label>
            <Select value={candle} onValueChange={setCandle}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hollow">Hollow</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
                <SelectItem value="heikin">Heikin Ashi</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between pt-5">
            <Label className="text-xs">Show default indicators</Label>
            <Switch checked={indicators} onCheckedChange={setIndicators} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Regional">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label className="text-xs">Language</Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">PT-BR</SelectItem>
                <SelectItem value="en">EN</SelectItem>
                <SelectItem value="es">ES</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Date format</Label>
            <Select value={dateFmt} onValueChange={setDateFmt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Bot4x">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card/40 p-3">
          <div className="flex items-start gap-3">
            <div className="size-9 rounded-full bg-[var(--brand-blue-deep)] flex items-center justify-center shrink-0">
              <Cpu className="size-4 text-[var(--brand-cyan)]" />
            </div>
            <div>
              <Label className="text-sm font-medium">Modo compacto</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mostra um pill fixo de 64px no canto inferior esquerdo em todas as páginas com modo e PnL do dia.
              </p>
            </div>
          </div>
          <Switch checked={compactPill} onCheckedChange={setCompactPill} />
        </div>
      </SectionCard>

      <TourSection />
    </>
  );
}

function TourSection() {
  const completed = useTourStore((s) => s.completedTours);
  const resetTour = useTourStore((s) => s.resetTour);
  const resetAll = useTourStore((s) => s.resetAll);
  const startTour = useTourStore((s) => s.startTour);
  const setSkipAll = useTourStore((s) => s.setSkipAll);
  const skipAll = useTourStore((s) => s.skipAll);

  return (
    <SectionCard
      title="Tutoriais e Tour"
      description="Reveja o tour guiado de qualquer página a qualquer momento."
    >
      <div className="space-y-2">
        {TOURS.map((t) => {
          const done = completed.includes(t.id);
          return (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/40 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[13px] text-foreground truncate">{t.label}</span>
                {done ? (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30 inline-flex items-center gap-1">
                    <Check className="size-2.5" /> Concluído
                  </span>
                ) : (
                  <span className="px-1.5 py-0.5 rounded text-[10px] text-muted-foreground border border-border">
                    Não iniciado
                  </span>
                )}
                {t.steps.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{t.steps.length} passos</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {done && (
                  <button
                    onClick={() => resetTour(t.id)}
                    className="px-2 h-7 rounded-md text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary inline-flex items-center gap-1"
                    title="Marcar como não concluído"
                  >
                    <RotateCcw className="size-3" /> Resetar
                  </button>
                )}
                {!t.manualOnly && t.route ? (
                  <a
                    href={t.route}
                    onClick={(e) => {
                      if (window.location.pathname === t.route) {
                        e.preventDefault();
                        resetTour(t.id);
                        startTour(t.id);
                      }
                    }}
                    className="px-2.5 h-7 rounded-md text-[11px] bg-[var(--brand-blue-deep)] hover:bg-[var(--brand-blue)] text-foreground inline-flex items-center"
                  >
                    Iniciar tour →
                  </a>
                ) : (
                  <button
                    onClick={() => { resetTour(t.id); startTour(t.id); }}
                    className="px-2.5 h-7 rounded-md text-[11px] bg-[var(--brand-blue-deep)] hover:bg-[var(--brand-blue)] text-foreground"
                  >
                    Reiniciar
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between pt-3 mt-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            O tour não interfere com suas operações — pode ser pausado a qualquer momento.
          </p>
          <div className="flex items-center gap-2">
            {skipAll && (
              <button
                onClick={() => setSkipAll(false)}
                className="px-2.5 h-7 rounded-md text-[11px] border border-border hover:bg-secondary"
              >
                Reativar tours
              </button>
            )}
            <button
              onClick={resetAll}
              className="px-2.5 h-7 rounded-md text-[11px] border border-[#E24B4A]/40 text-[#E24B4A] hover:bg-[#E24B4A]/10"
            >
              Reiniciar todos
            </button>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

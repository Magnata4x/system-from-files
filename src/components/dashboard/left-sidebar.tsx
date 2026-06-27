import { LayoutDashboard, Activity, Radar, Bell, Brain, Settings, Cpu, User, Sparkles, Tag, Code2, Users, Store, LogOut, Bot, FlaskConical, History, Layers, Stethoscope } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" as const },
  { icon: Activity, label: "Signals", to: "/signals" as const },
  { icon: Bot, label: "Bot4x", to: "/bot4x" as const },
  { icon: Brain, label: "DNA Trader", to: "/dna-trader" as const },
  { icon: History, label: "DNA Correções", to: "/dna-corrections" as const },
  { icon: Layers, label: "DNA Pares", to: "/dna-pairs" as const },
  { icon: FlaskConical, label: "Calibrator", to: "/calibrator" as const },
  { icon: Radar, label: "Manipulation", to: "/manipulation" as const },
  { icon: Sparkles, label: "Sentiment", to: "/sentiment" as const },
  { icon: Bell, label: "Alerts", to: "/alerts" as const },
  { icon: Users, label: "Copy Trading", to: "/copy-trading" as const },
  { icon: Store, label: "Marketplace", to: "/marketplace" as const },
  { icon: Code2, label: "API Access", to: "/api" as const },
  { icon: Tag, label: "Pricing", to: "/pricing" as const },
  { icon: Stethoscope, label: "Diagnostics", to: "/diagnostics" as const },
];

const bottomItems = [
  { icon: Settings, label: "Settings", to: "/settings" as const },
  { icon: User, label: "Profile", to: "/profile" as const },
];

export function LeftSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:flex w-16 shrink-0 border-r border-border bg-card/40 flex-col items-center py-3 gap-1.5 sticky top-12 self-start h-[calc(100vh-3rem)]">
      <div className="mb-2">
        <BrandLogo size={36} />
      </div>
      {items.map((it) => (
        <SideLink key={it.label} item={it} active={path === it.to || (it.to === "/signals" && path.startsWith("/signals/"))} />
      ))}
      <div className="mt-auto w-10 h-px bg-border my-2" />
      {bottomItems.map((it) => (
        <SideLink key={it.label} item={it} active={path === it.to} />
      ))}
      <button
        onClick={() => supabase.auth.signOut()}
        title="Sign out"
        className="group relative size-10 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-[#E24B4A] transition-colors"
      >
        <LogOut className="size-[18px]" />
        <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-card border border-border text-[11px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
          Sign out
        </span>
      </button>
    </aside>
  );
}

function SideLink({ item, active }: { item: { icon: typeof LayoutDashboard; label: string; to: string }; active: boolean }) {
  const Icon = item.icon;
  const shortcut = item.to === "/bot4x" ? " — Press B" : "";
  return (
    <Link
      to={item.to}
      className={`group relative size-10 rounded-lg flex items-center justify-center transition-colors ${
        active ? "bg-[var(--brand-blue-deep)] text-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      <Icon className="size-[18px]" />
      {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r bg-[var(--brand-cyan)]" />}
      <span className="pointer-events-none absolute left-full ml-2 px-2 py-1 rounded-md bg-card border border-border text-[11px] text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
        {item.label}{shortcut}
      </span>
    </Link>
  );
}

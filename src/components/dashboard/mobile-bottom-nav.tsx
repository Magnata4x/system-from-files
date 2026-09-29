import { LayoutDashboard, Activity, Bot, Brain, Menu, History } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Radar, Sparkles, Bell, Users, Store, Code2, Tag, Settings, User, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const primary = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" as const },
  { icon: Activity, label: "Radar", to: "/signals" as const },
  { icon: Bot, label: "Bot4x", to: "/bot4x" as const },
  { icon: Brain, label: "DNA", to: "/dna-trader" as const },
];

const more = [
  { icon: Radar, label: "Manipulation", to: "/manipulation" as const },
  { icon: Sparkles, label: "Sentiment", to: "/sentiment" as const },
  { icon: Bell, label: "Alerts", to: "/alerts" as const },
  { icon: History, label: "DNA Correções", to: "/dna-corrections" as const },
  { icon: Users, label: "Copy Trading", to: "/copy-trading" as const },
  { icon: Store, label: "Marketplace", to: "/marketplace" as const },
  { icon: Code2, label: "API Access", to: "/api" as const },
  { icon: Tag, label: "Pricing", to: "/pricing" as const },
  { icon: Settings, label: "Settings", to: "/settings" as const },
  { icon: User, label: "Profile", to: "/profile" as const },
];

export function MobileBottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur h-14 flex items-center justify-around px-1">
      {primary.map((it) => {
        const active = path === it.to || (it.to === "/signals" && path.startsWith("/signals/"));
        const Icon = it.icon;
        return (
          <Link
            key={it.label}
            to={it.to}
            className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md min-w-[56px] ${
              active ? "text-[var(--brand-cyan)]" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-[18px]" />
            <span className="text-[10px] font-medium">{it.label}</span>
          </Link>
        );
      })}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger asChild>
          <button className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-md min-w-[56px] text-muted-foreground">
            <Menu className="size-[18px]" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>Mais módulos</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {more.map((it) => {
              const Icon = it.icon;
              const active = path === it.to;
              return (
                <Link
                  key={it.label}
                  to={it.to}
                  onClick={() => setMoreOpen(false)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border ${
                    active ? "bg-[var(--brand-blue-deep)] text-foreground" : "bg-card/40 text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" />
                  <span className="text-[11px] font-medium">{it.label}</span>
                </Link>
              );
            })}
          </div>
          <button
            onClick={() => { setMoreOpen(false); supabase.auth.signOut(); }}
            className="mt-4 w-full h-10 rounded-lg border border-border text-[#E24B4A] inline-flex items-center justify-center gap-2 text-sm"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

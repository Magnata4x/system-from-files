import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { Bell, Shield, Palette, CreditCard, KeyRound, Lock } from "lucide-react";
import { SettingsNotifications } from "@/components/settings/tab-notifications";
import { SettingsSecurity } from "@/components/settings/tab-security";
import { SettingsAppearance } from "@/components/settings/tab-appearance";
import { SettingsBilling } from "@/components/settings/tab-billing";
import { SettingsApiKeys } from "@/components/settings/tab-api-keys";
import { SettingsPrivacy } from "@/components/settings/tab-privacy";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Account Settings — AISignalRadar" },
      { name: "description", content: "Security, billing, API keys, privacy and notifications for your AISignalRadar account." },
    ],
  }),
  component: SettingsPage,
});

const tabs = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "api", label: "API Keys", icon: KeyRound },
  { id: "privacy", label: "Privacy", icon: Lock },
] as const;

type TabId = (typeof tabs)[number]["id"];

function SettingsPage() {
  const [active, setActive] = useState<TabId>("notifications");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5">
          <header className="mb-5">
            <h1 className="text-xl font-semibold tracking-tight">Account Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your account, security and integrations.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
            <nav className="rounded-xl border border-border bg-card/40 p-2 h-fit sticky top-16">
              {tabs.map((t) => {
                const Icon = t.icon;
                const isActive = active === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActive(t.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-[var(--brand-blue-deep)] text-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="size-4" />
                    {t.label}
                  </button>
                );
              })}
            </nav>

            <section className="min-w-0 space-y-5">
              {active === "notifications" && <SettingsNotifications />}
              {active === "security" && <SettingsSecurity />}
              {active === "appearance" && <SettingsAppearance />}
              {active === "billing" && <SettingsBilling />}
              {active === "api" && <SettingsApiKeys />}
              {active === "privacy" && <SettingsPrivacy />}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

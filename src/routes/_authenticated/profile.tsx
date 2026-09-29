import { createFileRoute } from "@tanstack/react-router";
import { Heart, User } from "lucide-react";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";
import { HeaderCard } from "@/components/profile/header-card";
import { ProfileForm } from "@/components/profile/profile-form";
import { TradingPreferences } from "@/components/profile/trading-preferences";
import { ConnectedAccounts } from "@/components/profile/connected-accounts";
import { DangerZone } from "@/components/profile/danger-zone";
import { WishlistTab } from "@/components/profile/wishlist-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — AISignalRadar" },
      { name: "description", content: "Manage your AISignalRadar identity, trading preferences and connected accounts." },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as string) === "wishlist" ? "wishlist" : "profile",
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-5 space-y-5 max-w-5xl">
          <header>
            <h1 className="text-xl font-semibold tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Your identity, preferences, and integrations.</p>
          </header>

          <Tabs
            value={tab}
            onValueChange={(v) => navigate({ search: { tab: v as "profile" | "wishlist" } })}
            className="space-y-5"
          >
            <TabsList>
              <TabsTrigger value="profile" className="gap-2"><User className="size-3.5" /> Profile</TabsTrigger>
              <TabsTrigger value="wishlist" className="gap-2"><Heart className="size-3.5" /> Wishlist</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-5">
              <HeaderCard />
              <ProfileForm />
              <TradingPreferences />
              <ConnectedAccounts />
              <DangerZone />
            </TabsContent>

            <TabsContent value="wishlist">
              <WishlistTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}

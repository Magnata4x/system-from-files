import { Camera, Crown, TrendingUp, Eye, CalendarDays, Globe, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useProfileStore } from "@/lib/profile-store";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AvatarCropper } from "@/components/profile/avatar-cropper";
import { toast } from "sonner";

const PLAN_COLORS: Record<string, string> = {
  Starter: "#6b7280",
  Pro: "#3B82F6",
  Institutional: "#A78BFA",
};

export function HeaderCard() {
  const { info, plan, memberSince, archetype, daysActive, signalsViewed, setInfo, publicProfile, setPublicProfile } =
    useProfileStore();
  const [cropOpen, setCropOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const initials = info.fullName
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/u/${info.username}`
    : `/u/${info.username}`;

  const copyShare = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Profile link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <section className="rounded-xl border border-border bg-card/40 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-5">
          {/* Avatar */}
          <div className="flex items-center gap-4 lg:gap-5">
            <button
              type="button"
              onClick={() => setCropOpen(true)}
              className="group relative size-20 rounded-full overflow-hidden shrink-0 ring-2 ring-border bg-[var(--brand-blue-deep)] flex items-center justify-center"
            >
              {info.avatarDataUrl ? (
                <img src={info.avatarDataUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-2xl font-semibold text-foreground">{initials}</span>
              )}
              <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="size-5 text-white" />
              </span>
            </button>

            {/* Identity */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[20px] font-medium leading-tight">{info.fullName}</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--brand-blue-deep)] text-[var(--brand-cyan)] text-[10px] font-semibold tracking-wider">
                  <TrendingUp className="size-3" />
                  {archetype}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-0.5 truncate">{info.email}</div>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <CalendarDays className="size-3" /> Member since {memberSince}
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="lg:ml-auto flex flex-col items-start lg:items-end gap-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider"
                style={{
                  background: `${PLAN_COLORS[plan]}1f`,
                  color: PLAN_COLORS[plan],
                  border: `1px solid ${PLAN_COLORS[plan]}40`,
                }}
              >
                <Crown className="size-3" /> {plan}
              </span>
              {plan === "Starter" && (
                <Button size="sm" variant="link" className="h-auto p-0 text-[var(--brand-cyan)] text-xs">
                  Upgrade to Pro →
                </Button>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" />
                <b className="text-foreground tabular-nums">{daysActive}</b> days active
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="size-3.5" />
                <b className="text-foreground tabular-nums">{signalsViewed}</b> signals viewed
              </span>
            </div>
          </div>
        </div>

        {/* Public profile row */}
        <div className="mt-5 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="size-9 rounded-md bg-secondary flex items-center justify-center shrink-0">
              <Globe className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-medium">Public profile</div>
              <p className="text-xs text-muted-foreground">
                {publicProfile ? "Anyone with the link can view your stats." : "Off — your profile is private."}
              </p>
            </div>
          </div>

          {publicProfile && (
            <div className="flex items-center gap-1.5 min-w-0 sm:max-w-xs flex-1">
              <code className="flex-1 px-2.5 py-1.5 rounded-md bg-secondary text-foreground font-mono text-xs truncate">
                {shareUrl}
              </code>
              <button
                onClick={copyShare}
                className="size-8 rounded-md bg-secondary hover:bg-secondary/70 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
                title="Copy link"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              </button>
            </div>
          )}

          <Switch checked={publicProfile} onCheckedChange={setPublicProfile} />
        </div>
      </section>

      <AvatarCropper
        open={cropOpen}
        onOpenChange={setCropOpen}
        onSave={(dataUrl) => {
          setInfo({ avatarDataUrl: dataUrl });
          toast.success("Avatar updated");
        }}
      />
    </>
  );
}

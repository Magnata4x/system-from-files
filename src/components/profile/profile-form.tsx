import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Check, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProfileStore, type ProfileInfo } from "@/lib/profile-store";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  fullName: z.string().trim().min(1, "Required").max(80),
  username: z
    .string()
    .trim()
    .min(3, "Min 3 chars")
    .max(20, "Max 20 chars")
    .regex(/^[a-z0-9_]+$/, "Lowercase, numbers, underscore"),
  email: z.string().trim().email().max(255),
  phoneCountry: z
    .string()
    .trim()
    .regex(/^\+\d{1,4}$/, "e.g. +1"),
  phone: z.string().trim().max(20),
  country: z.string().min(1),
  timezone: z.string().min(1),
  bio: z.string().max(160),
  website: z.union([z.literal(""), z.string().url("Invalid URL").max(200)]),
});

type FormValues = z.infer<typeof schema>;

const COUNTRIES = [
  "United States",
  "United Kingdom",
  "Brazil",
  "Portugal",
  "Germany",
  "France",
  "Spain",
  "Japan",
  "Singapore",
  "Canada",
  "Australia",
];
const TAKEN = new Set(["admin", "root", "lovable", "trader", "satoshi"]);

export function ProfileForm() {
  const { info, setInfo } = useProfileStore();
  const { user } = useAuth();
  const [unameStatus, setUnameStatus] = useState<"idle" | "checking" | "available" | "taken">(
    "idle",
  );
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: info,
  });

  // Hidrata o formulário a partir do banco (uma vez por sessão de usuário)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "full_name, email, username, phone_country, phone, country, timezone, bio, website, avatar_url",
        )
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error("[profile-form] load error:", error);
        toast.error("Não foi possível carregar o perfil", { description: error.message });
        setLoaded(true);
        return;
      }
      if (data) {
        const merged: ProfileInfo = {
          ...info,
          fullName: data.full_name ?? info.fullName,
          email: data.email ?? user.email ?? info.email,
          username: data.username ?? info.username,
          phoneCountry: data.phone_country ?? info.phoneCountry,
          phone: data.phone ?? info.phone,
          country: data.country ?? info.country,
          timezone: data.timezone ?? info.timezone,
          bio: data.bio ?? info.bio,
          website: data.website ?? info.website,
          avatarDataUrl: data.avatar_url ?? info.avatarDataUrl,
        };
        setInfo(merged);
        form.reset(merged);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const username = form.watch("username");

  // Username availability simulation
  useEffect(() => {
    if (!username || username === info.username) {
      setUnameStatus("idle");
      return;
    }
    setUnameStatus("checking");
    const t = setTimeout(() => {
      setUnameStatus(TAKEN.has(username.toLowerCase()) ? "taken" : "available");
    }, 500);
    return () => clearTimeout(t);
  }, [username, info.username]);

  const bioLen = form.watch("bio")?.length ?? 0;

  const onSubmit = async (values: FormValues) => {
    if (unameStatus === "taken") {
      toast.error("That username is taken.");
      return;
    }
    if (!user?.id) {
      toast.error("Você precisa estar autenticado para salvar.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: values.fullName,
        email: values.email,
        username: values.username,
        phone_country: values.phoneCountry,
        phone: values.phone,
        country: values.country,
        timezone: values.timezone,
        bio: values.bio,
        website: values.website,
      },
      { onConflict: "id" },
    );
    setSaving(false);
    if (error) {
      console.error("[profile-form] save error:", error);
      const isUniqueViolation =
        error.code === "23505" || /duplicate key|unique/i.test(error.message);
      toast.error(isUniqueViolation ? "Nome de usuário já está em uso" : "Falha ao salvar perfil", {
        description: error.message,
      });
      return;
    }
    setInfo(values);
    form.reset(values);
    toast.success("Profile updated");
  };

  const isDirty = form.formState.isDirty;

  const tzLabel = useMemo(() => info.timezone, [info.timezone]);

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="rounded-xl border border-border bg-card/40 p-5"
    >
      <header className="mb-4">
        <h2 className="text-sm font-medium">Profile information</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Your public-facing identity and contact details.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Full name" error={form.formState.errors.fullName?.message}>
          <Input {...form.register("fullName")} />
        </Field>

        <Field
          label="Username"
          hint="@handle"
          error={form.formState.errors.username?.message}
          adornment={<UsernameStatus status={unameStatus} />}
        >
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              @
            </span>
            <Input className="pl-7" {...form.register("username")} />
          </div>
        </Field>

        <Field
          label="Email"
          error={form.formState.errors.email?.message}
          adornment={
            info.emailVerified ? (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="size-3" /> Verified
              </span>
            ) : (
              <button
                type="button"
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400"
              >
                <ShieldAlert className="size-3" /> Verify
              </button>
            )
          }
        >
          <Input type="email" {...form.register("email")} />
        </Field>

        <Field label="Phone" error={form.formState.errors.phone?.message}>
          <div className="flex gap-2">
            <Input className="w-20" placeholder="+1" {...form.register("phoneCountry")} />
            <Input className="flex-1" {...form.register("phone")} />
          </div>
        </Field>

        <Field label="Country">
          <Select
            value={form.watch("country")}
            onValueChange={(v) => form.setValue("country", v, { shouldDirty: true })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Timezone" hint="auto-detected">
          <div className="flex gap-2 items-center">
            <Input value={tzLabel} {...form.register("timezone")} />
          </div>
        </Field>

        <Field
          label="Website"
          error={form.formState.errors.website?.message}
          className="md:col-span-2"
        >
          <Input type="url" placeholder="https://" {...form.register("website")} />
        </Field>

        <Field
          label="Bio"
          className="md:col-span-2"
          error={form.formState.errors.bio?.message}
          adornment={
            <span
              className={`text-[10px] tabular-nums ${bioLen > 160 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {bioLen}/160
            </span>
          }
        >
          <Textarea rows={3} maxLength={160} {...form.register("bio")} />
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => form.reset(info)}
          disabled={!isDirty || saving}
        >
          Discard
        </Button>
        <Button
          type="submit"
          disabled={!isDirty || saving || !loaded || !user?.id}
          className="gap-1.5"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  adornment,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  adornment?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1.5">
        <Label className="text-xs text-muted-foreground">
          {label} {hint && <span className="text-muted-foreground/60">· {hint}</span>}
        </Label>
        {adornment}
      </div>
      {children}
      {error && <p className="text-[11px] text-destructive mt-1">{error}</p>}
    </div>
  );
}

function UsernameStatus({ status }: { status: "idle" | "checking" | "available" | "taken" }) {
  if (status === "idle") return null;
  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> checking…
      </span>
    );
  }
  if (status === "available") {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400">
        <Check className="size-3" /> Available
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/15 text-destructive">
      Taken
    </span>
  );
}

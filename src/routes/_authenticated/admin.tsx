import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { adminListUsers, adminGetUser, adminUpdateUser } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { TopBar } from "@/components/dashboard/top-bar";
import { LeftSidebar } from "@/components/dashboard/left-sidebar";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — AISignalRadar" },
      {
        name: "description",
        content: "Gerenciamento seguro de usuários, planos e auditoria do AISignalRadar.",
      },
      { property: "og:title", content: "Admin — AISignalRadar" },
      {
        property: "og:description",
        content: "Gerenciamento seguro de usuários, planos e auditoria.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    userId: typeof s.userId === "string" ? s.userId : undefined,
  }),
  errorComponent: ({ error }) => (
    <div className="p-8 max-w-xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <ShieldAlert className="size-5 text-destructive" />
          <CardTitle>Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{error.message}</CardContent>
      </Card>
    </div>
  ),
  notFoundComponent: () => <div className="p-8">Não encontrado</div>,
  component: AdminPage,
});

function AdminPage() {
  const { userId } = Route.useSearch();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const listFn = useServerFn(adminListUsers);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => listFn({ data: { search: search || undefined } }),
  });

  if (error) throw error;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <div className="flex">
        <LeftSidebar />
        <main className="flex-1 min-w-0 p-6 max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Painel Administrativo</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie perfis e plano dos usuários. Todas as alterações são auditadas.
            </p>
          </div>

          <div className="grid md:grid-cols-[360px_1fr] gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Usuários</CardTitle>
                <Input
                  placeholder="Buscar por email, nome ou usuário"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="mt-2"
                />
              </CardHeader>
              <CardContent className="space-y-1 max-h-[70vh] overflow-auto">
                {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
                {data?.users.map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => navigate({ to: "/admin", search: { userId: u.id } })}
                    className={`w-full text-left p-2 rounded hover:bg-muted text-sm ${
                      userId === u.id ? "bg-muted" : ""
                    }`}
                  >
                    <div className="font-medium truncate">
                      {u.full_name || u.username || u.email}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                    <Badge variant="outline" className="mt-1 text-[10px]">
                      {u.plan_tier ?? "free"}
                    </Badge>
                  </button>
                ))}
                {data && data.users.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum usuário.</p>
                )}
              </CardContent>
            </Card>

            <div>{userId ? <UserDetail userId={userId} /> : <EmptyDetail />}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

function EmptyDetail() {
  return (
    <Card>
      <CardContent className="p-10 text-center text-sm text-muted-foreground">
        Selecione um usuário para editar.
      </CardContent>
    </Card>
  );
}

function UserDetail({ userId }: { userId: string }) {
  const getFn = useServerFn(adminGetUser);
  const updateFn = useServerFn(adminUpdateUser);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => getFn({ data: { userId } }),
  });

  const [form, setForm] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, string>) => updateFn({ data: { userId, updates } }),
    onSuccess: (r) => {
      toast.success(`Salvo (${r.changed} campo(s) alterado(s))`);
      setForm({});
      qc.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading)
    return (
      <Card>
        <CardContent className="p-8">Carregando…</CardContent>
      </Card>
    );
  if (error)
    return (
      <Card>
        <CardContent className="p-8 text-destructive">{(error as Error).message}</CardContent>
      </Card>
    );
  if (!data) return null;

  const p = data.profile as Record<string, unknown>;
  const get = (k: string) => (k in form ? form[k] : ((p[k] as string | null) ?? ""));
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (Object.keys(form).length === 0) return toast.info("Nenhuma alteração");
    mutation.mutate(form);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {p.email as string}
            {data.roles.map((r) => (
              <Badge key={r} variant="secondary">
                {r}
              </Badge>
            ))}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <Field label="Nome completo">
            <Input value={get("full_name")} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label="Usuário">
            <Input value={get("username")} onChange={(e) => set("username", e.target.value)} />
          </Field>
          <Field label="País">
            <Input value={get("country")} onChange={(e) => set("country", e.target.value)} />
          </Field>
          <Field label="Plano (service_role)">
            <Select value={get("plan_tier") || "free"} onValueChange={(v) => set("plan_tier", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">free</SelectItem>
                <SelectItem value="pro">pro</SelectItem>
                <SelectItem value="elite">elite</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Bio">
              <Input value={get("bio")} onChange={(e) => set("bio", e.target.value)} />
            </Field>
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm({})} disabled={mutation.isPending}>
              Reverter
            </Button>
            <Button onClick={submit} disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Auditoria (últimas 50)</CardTitle>
        </CardHeader>
        <CardContent>
          {data.audit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
          ) : (
            <div className="space-y-2 text-xs font-mono">
              {data.audit.map((a: any) => (
                <div key={a.id} className="border-l-2 border-muted pl-2">
                  <div className="text-muted-foreground">
                    {new Date(a.created_at).toLocaleString()} · actor {a.actor_id.slice(0, 8)}
                  </div>
                  <div>
                    <span className="font-semibold">{a.field_name}</span>: {String(a.old_value)} →{" "}
                    {String(a.new_value)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

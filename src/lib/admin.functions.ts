// Server functions da área Admin.
// Autorização: requireSupabaseAuth + checagem de papel 'admin' via has_role.
// Escritas em plan_tier passam por supabaseAdmin (service_role) porque o
// trigger prevent_plan_tier_self_escalation bloqueia qualquer outro role.
// Toda mudança é registrada em admin_audit_log.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
// FIX ARCH-01: tipo único em vez de literal duplicado ("free","elite" eram inválidos).
// Os valores devem bater com a constraint do banco: ('starter','pro','institutional').
import { PLAN_TIERS } from "./plan-tier";

const EDITABLE_FIELDS = ["full_name", "username", "bio", "country", "plan_tier"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

async function assertAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error("Falha ao verificar permissões");
  if (!data) throw new Error("Acesso negado: requer papel admin");
}

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { search?: string; limit?: number; cursor?: string }) =>
    z.object({
      search: z.string().trim().max(120).optional(),
      // FIX SEG-01: reduzir limite máximo de 200 para 50 e adicionar paginação cursorial.
      // Sem isso, um admin comprometido podia extrair toda a base de usuários em
      // uma única request com limit=200, repetindo em loop.
      limit: z.number().int().min(1).max(50).optional(),
      cursor: z.string().optional(), // ISO timestamp para paginação por created_at
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // FIX SEG-01: rate limiting via RPC do banco para cobrir o caso de
    // admin comprometido tentando exfiltrar dados em loop automatizado.
    // Assinatura: check_rate_limit(p_user_id uuid, p_action text, p_max integer)
    const { data: allowed, error: rlErr } = await context.supabase.rpc("check_rate_limit", {
      p_user_id: context.userId,
      p_action:  "admin_list_users",
      p_max:     30,
    });
    if (rlErr || !allowed) {
      throw new Error("Rate limit excedido: máximo de 30 listagens de usuários por minuto.");
    }

    const limit = data.limit ?? 50;
    let q = context.supabase
      .from("profiles")
      .select("id,email,username,full_name,plan_tier,country,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    // Paginação cursorial: evita OFFSET (O(N) scan) — usa created_at como cursor.
    if (data.cursor) {
      q = q.lt("created_at", data.cursor);
    }

    if (data.search) {
      const s = `%${data.search}%`;
      q = q.or(`email.ilike.${s},username.ilike.${s},full_name.ilike.${s}`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const users = rows ?? [];
    const nextCursor = users.length === limit ? users[users.length - 1]?.created_at : null;
    return { users, nextCursor };
  });

export const adminGetUser = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ data: profile, error: pErr }, { data: roles }, { data: audit }] = await Promise.all([
      context.supabase.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      context.supabase.from("user_roles").select("role").eq("user_id", data.userId),
      context.supabase
        .from("admin_audit_log")
        .select("*")
        .eq("target_user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    if (pErr) throw new Error(pErr.message);
    if (!profile) throw new Error("Usuário não encontrado");
    return { profile, roles: (roles ?? []).map((r: { role: string }) => r.role), audit: audit ?? [] };
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; updates: Partial<Record<EditableField, string | null>> }) =>
    z
      .object({
        userId: z.string().uuid(),
        updates: z
          .object({
            full_name: z.string().trim().max(120).nullable().optional(),
            username: z.string().trim().min(2).max(40).nullable().optional(),
            bio: z.string().trim().max(500).nullable().optional(),
            country: z.string().trim().max(60).nullable().optional(),
            plan_tier: z.enum(PLAN_TIERS).nullable().optional(),
          })
          .refine((u) => Object.keys(u).length > 0, "Nenhum campo informado"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    // Carrega valores antigos para auditoria
    const { data: before, error: bErr } = await context.supabase
      .from("profiles")
      .select("full_name,username,bio,country,plan_tier")
      .eq("id", data.userId)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!before) throw new Error("Usuário não encontrado");

    // plan_tier exige service_role (trigger bloqueia outros papéis).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: uErr } = await supabaseAdmin
      .from("profiles")
      .update(data.updates)
      .eq("id", data.userId);
    if (uErr) throw new Error(uErr.message);

    const auditRows = (Object.keys(data.updates) as EditableField[])
      .filter((k) => (before as Record<string, unknown>)[k] !== data.updates[k])
      .map((field) => ({
        actor_id: context.userId,
        target_user_id: data.userId,
        table_name: "profiles",
        field_name: field,
        old_value: JSON.stringify((before as Record<string, unknown>)[field] ?? null),
        new_value: JSON.stringify(data.updates[field] ?? null),
      }));

    if (auditRows.length > 0) {
      await supabaseAdmin.from("admin_audit_log").insert(auditRows);
    }

    return { ok: true, changed: auditRows.length };
  });

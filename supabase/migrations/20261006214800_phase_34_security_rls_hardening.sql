-- Fase 34: segurança e consistência de RLS.
create schema if not exists private;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer
set search_path = pg_catalog, public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role); $$;

revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.has_role(uuid, public.app_role) from authenticated;
grant execute on function private.has_role(uuid, public.app_role) to authenticated;

drop policy if exists "Admins read audit log" on public.admin_audit_log;
create policy "Admins read audit log" on public.admin_audit_log for select to authenticated
using ((select private.has_role((select auth.uid()), 'admin'::public.app_role)));

drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select to authenticated
using ((select private.has_role((select auth.uid()), 'admin'::public.app_role)));
drop policy if exists "Admins read all roles" on public.user_roles;
create policy "Admins read all roles" on public.user_roles for select to authenticated
using ((select private.has_role((select auth.uid()), 'admin'::public.app_role)));
drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users read own roles" on public.user_roles for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Users delete own runs" on public.calibrator_runs;
create policy "Users delete own runs" on public.calibrator_runs for delete to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own runs" on public.calibrator_runs;
create policy "Users insert own runs" on public.calibrator_runs for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users see own runs" on public.calibrator_runs;
create policy "Users see own runs" on public.calibrator_runs for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users update own runs" on public.calibrator_runs;
create policy "Users update own runs" on public.calibrator_runs for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "copilot_history_own" on public.copilot_history;
create policy "copilot_history_own" on public.copilot_history for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "copy_follows_own" on public.copy_follows;
create policy "copy_follows_own" on public.copy_follows for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own exchange credentials" on public.exchange_credentials;
create policy "Users manage own exchange credentials" on public.exchange_credentials for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "marketplace_views_own" on public.marketplace_views;
create policy "marketplace_views_own" on public.marketplace_views for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "signals_insert_service" on public.signals;
create policy "signals_insert_service" on public.signals for insert to public with check ((select auth.role()) = 'service_role');
drop policy if exists "signals_select_own" on public.signals;
create policy "signals_select_own" on public.signals for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "signals_update_service" on public.signals;
create policy "signals_update_service" on public.signals for update to public using ((select auth.role()) = 'service_role') with check ((select auth.role()) = 'service_role');

drop policy if exists "Users manage own notifications" on public.user_notifications;
create policy "Users manage own notifications" on public.user_notifications for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users manage own prefs" on public.user_preferences;
create policy "Users manage own prefs" on public.user_preferences for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Leaked password protection é configuração do Supabase Auth e fica como gate operacional.

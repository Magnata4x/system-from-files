-- Fase 34: consolidar políticas permissivas de SELECT.
drop policy if exists "Admins read all profiles" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users and admins read profiles" on public.profiles for select to authenticated
using ((id = (select auth.uid())) or (select private.has_role((select auth.uid()), 'admin'::public.app_role)));

drop policy if exists "Admins read all roles" on public.user_roles;
drop policy if exists "Users read own roles" on public.user_roles;
create policy "Users and admins read roles" on public.user_roles for select to authenticated
using ((user_id = (select auth.uid())) or (select private.has_role((select auth.uid()), 'admin'::public.app_role)));

drop policy if exists "signals_select_own" on public.signals;
drop policy if exists "signals_select_public" on public.signals;
create policy "signals_select_visible" on public.signals for select to authenticated
using ((user_id = (select auth.uid())) or user_id is null);

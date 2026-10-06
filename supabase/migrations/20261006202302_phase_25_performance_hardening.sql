-- Fase 25: performance hardening for execution-related tables.
-- This filename matches the migration version recorded in the live Supabase project.

create index if not exists trade_outbox_user_id_idx
  on public.trade_outbox (user_id);

drop policy if exists "bot4x_configs_own" on public.bot4x_configs;
create policy "bot4x_configs_own" on public.bot4x_configs
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can create pending own execution intents" on public.bot4x_execution_intents;
create policy "Users can create pending own execution intents" on public.bot4x_execution_intents
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending_confirmation'
    and mode = 'REAL'
    and confirmed_at is null
    and processed_at is null
  );

drop policy if exists "Users can view own execution intents" on public.bot4x_execution_intents;
create policy "Users can view own execution intents" on public.bot4x_execution_intents
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users delete own trades" on public.bot4x_trades;
create policy "Users delete own trades" on public.bot4x_trades
  for delete to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own trades" on public.bot4x_trades;
create policy "Users insert own trades" on public.bot4x_trades
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users see own trades" on public.bot4x_trades;
create policy "Users see own trades" on public.bot4x_trades
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users update own trades" on public.bot4x_trades;
create policy "Users update own trades" on public.bot4x_trades
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own outbox" on public.trade_outbox;
create policy "Users delete own outbox" on public.trade_outbox
  for delete to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own outbox" on public.trade_outbox;
create policy "Users insert own outbox" on public.trade_outbox
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own outbox" on public.trade_outbox;
create policy "Users read own outbox" on public.trade_outbox
  for select to authenticated
  using ((select auth.uid()) = user_id);
drop policy if exists "Users update own outbox" on public.trade_outbox;
create policy "Users update own outbox" on public.trade_outbox
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.calibrator_runs (
  id              text        primary key default gen_random_uuid()::text,
  user_id         uuid        not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  profile         text        not null,
  symbol          text        not null,
  period_days     integer     not null,
  initial_balance numeric     not null,
  leverage        integer     not null default 1,
  trades          integer     not null default 0,
  wins            integer     not null default 0,
  losses          integer     not null default 0,
  win_rate        numeric     not null default 0,
  pnl             numeric     not null default 0,
  pnl_pct         numeric     not null default 0,
  max_drawdown    numeric     not null default 0,
  sharpe          numeric     not null default 0,
  full_result     jsonb
);

grant select, insert, update, delete on public.calibrator_runs to authenticated;
grant all on public.calibrator_runs to service_role;

alter table public.calibrator_runs enable row level security;

create policy "Users see own runs"
  on public.calibrator_runs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own runs"
  on public.calibrator_runs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own runs"
  on public.calibrator_runs for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists calibrator_runs_user_created
  on public.calibrator_runs (user_id, created_at desc);
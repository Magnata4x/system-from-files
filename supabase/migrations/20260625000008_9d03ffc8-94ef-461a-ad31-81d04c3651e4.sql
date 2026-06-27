create table if not exists public.bot4x_trades (
  id           text        primary key,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  day          date        not null,
  pair         text        not null,
  side         text        not null check (side in ('LONG','SHORT')),
  entry        numeric     not null,
  stop         numeric,
  target       numeric,
  result       text        not null check (result in ('WIN','LOSS','BLOCKED','OPEN')),
  pnl          numeric     not null default 0,
  pnl_pct      numeric     not null default 0,
  accumulated  numeric     not null default 0,
  profile      text,
  leverage     integer,
  motivo       text,
  hour         integer,
  created_at   timestamptz not null default now()
);

grant select, insert, update, delete on public.bot4x_trades to authenticated;
grant all on public.bot4x_trades to service_role;

alter table public.bot4x_trades enable row level security;

create policy "Users see own trades"
  on public.bot4x_trades for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own trades"
  on public.bot4x_trades for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users delete own trades"
  on public.bot4x_trades for delete
  to authenticated
  using (auth.uid() = user_id);

create index if not exists bot4x_trades_user_day
  on public.bot4x_trades (user_id, day desc);

create index if not exists bot4x_trades_user_pair
  on public.bot4x_trades (user_id, pair);
-- Fase 03: histórico real de métricas globais de mercado.
-- A tabela recebe apenas amostras coletadas pelo Cron do Cloudflare.
create table if not exists public.market_snapshots (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null,
  source text not null default 'coingecko',
  total_market_cap numeric,
  total_volume numeric,
  btc_dominance numeric,
  market_cap_change_24h numeric,
  created_at timestamptz not null default now(),
  constraint market_snapshots_source_check check (source = 'coingecko'),
  constraint market_snapshots_btc_dominance_check
    check (btc_dominance is null or (btc_dominance >= 0 and btc_dominance <= 100))
);

create unique index if not exists market_snapshots_captured_at_uidx
  on public.market_snapshots (captured_at);

create index if not exists market_snapshots_captured_at_idx
  on public.market_snapshots (captured_at desc);

alter table public.market_snapshots enable row level security;

drop policy if exists "Authenticated users can read market snapshots" on public.market_snapshots;
create policy "Authenticated users can read market snapshots"
  on public.market_snapshots
  for select
  to authenticated
  using (true);

revoke insert, update, delete on public.market_snapshots from anon, authenticated;
grant select on public.market_snapshots to authenticated;

-- DB-02: policies de UPDATE faltantes em tabelas onde o código faz upsert.
create policy "Users update own trades"
  on public.bot4x_trades for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users update own calibrator runs"
  on public.calibrator_runs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ARCH-02: colunas com nomes semânticos corretos em bot4x_configs.
-- As colunas antigas reaproveitadas (rsi_threshold_low/high, ai_score_min,
-- fomo_limit, exchange) permanecem por compatibilidade e serão dropadas em
-- migração futura, depois que nenhum consumidor externo (BI, suporte) as ler.
alter table public.bot4x_configs
  add column if not exists sl_pct numeric,
  add column if not exists tp_pct numeric,
  add column if not exists allocation_pct integer,
  add column if not exists total_capital numeric,
  add column if not exists preferred_pairs jsonb not null default '[]'::jsonb,
  add column if not exists avoid_pairs jsonb not null default '[]'::jsonb;

-- Backfill numérico: copia dos legados quando o novo está nulo.
update public.bot4x_configs
set
  sl_pct          = coalesce(sl_pct, rsi_threshold_low, 0.5),
  tp_pct          = coalesce(tp_pct, rsi_threshold_high, 1.0),
  allocation_pct  = coalesce(allocation_pct, ai_score_min, 30),
  total_capital   = coalesce(total_capital, fomo_limit, 1000)
where sl_pct is null or tp_pct is null or allocation_pct is null or total_capital is null;

-- Backfill de pares: a coluna `exchange` (text) era usada para serializar
-- {preferred, avoid} no formato JSON. Tentamos parsear; se falhar, fica vazio.
do $$
declare
  r record;
  parsed jsonb;
begin
  for r in select user_id, exchange from public.bot4x_configs where exchange is not null and exchange <> '' loop
    begin
      parsed := r.exchange::jsonb;
    exception when others then
      parsed := null;
    end;

    if parsed is null then
      continue;
    end if;

    if jsonb_typeof(parsed) = 'array' then
      -- legado: array puro = preferred
      update public.bot4x_configs
      set preferred_pairs = parsed
      where user_id = r.user_id
        and preferred_pairs = '[]'::jsonb;
    elsif jsonb_typeof(parsed) = 'object' then
      update public.bot4x_configs
      set
        preferred_pairs = coalesce(parsed -> 'preferred', '[]'::jsonb),
        avoid_pairs     = coalesce(parsed -> 'avoid',     '[]'::jsonb)
      where user_id = r.user_id
        and (preferred_pairs = '[]'::jsonb or avoid_pairs = '[]'::jsonb);
    end if;
  end loop;
end$$;

-- Defaults razoáveis para novos rows: deixa os campos novos não nulos.
alter table public.bot4x_configs
  alter column sl_pct set default 0.5,
  alter column tp_pct set default 1.0,
  alter column allocation_pct set default 30,
  alter column total_capital set default 1000;

-- Documentação inline para o próximo dev que olhar o schema.
comment on column public.bot4x_configs.sl_pct is 'Stop loss em %. Substitui o reuso de rsi_threshold_low.';
comment on column public.bot4x_configs.tp_pct is 'Take profit em %. Substitui o reuso de rsi_threshold_high.';
comment on column public.bot4x_configs.allocation_pct is 'Alocação de capital em %. Substitui o reuso de ai_score_min.';
comment on column public.bot4x_configs.total_capital is 'Capital total em USD. Substitui o reuso de fomo_limit.';
comment on column public.bot4x_configs.preferred_pairs is 'Pares preferidos (jsonb array de strings). Substitui parte do reuso de exchange.';
comment on column public.bot4x_configs.avoid_pairs is 'Pares evitados (jsonb array de strings). Substitui parte do reuso de exchange.';
comment on column public.bot4x_configs.rsi_threshold_low is 'DEPRECATED: usar sl_pct. Será removida em migração futura.';
comment on column public.bot4x_configs.rsi_threshold_high is 'DEPRECATED: usar tp_pct. Será removida em migração futura.';
comment on column public.bot4x_configs.ai_score_min is 'DEPRECATED: usar allocation_pct. Será removida em migração futura.';
comment on column public.bot4x_configs.fomo_limit is 'DEPRECATED: usar total_capital. Será removida em migração futura.';
comment on column public.bot4x_configs.exchange is 'DEPRECATED: usar preferred_pairs / avoid_pairs. Será removida em migração futura.';
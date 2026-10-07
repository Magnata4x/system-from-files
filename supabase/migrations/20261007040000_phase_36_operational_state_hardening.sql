-- Fase 36: estado operacional e risco pertencem ao backend.
-- O cliente autenticado pode configurar parâmetros de estratégia, mas não
-- pode fabricar PnL, slots, circuit breaker, capital operacional ou resultados.

revoke insert (circuit_breaker, daily_pnl, open_slots, active_capital)
  on table public.bot4x_configs from authenticated;
revoke update (circuit_breaker, daily_pnl, open_slots, active_capital)
  on table public.bot4x_configs from authenticated;

-- bot4x_trades é legado/compatibilidade; o ledger oficial é
-- bot4x_execution_intents. O cliente permanece somente com leitura.
revoke insert, update, delete on table public.bot4x_trades from authenticated;
drop policy if exists "Users insert own trades" on public.bot4x_trades;
drop policy if exists "Users update own trades" on public.bot4x_trades;
drop policy if exists "Users delete own trades" on public.bot4x_trades;

-- O outbox é operacional e deve ser escrito/reconciliado somente pelo backend.
revoke insert, update, delete on table public.trade_outbox from authenticated;
drop policy if exists "Users insert own outbox" on public.trade_outbox;
drop policy if exists "Users update own outbox" on public.trade_outbox;
drop policy if exists "Users delete own outbox" on public.trade_outbox;

-- Métricas de DNA operacional não são preferências do usuário.
revoke insert (dna_updated_at, operations_today, drawdown_today, avg_win_rate)
  on table public.profiles from authenticated;
revoke update (dna_updated_at, operations_today, drawdown_today, avg_win_rate)
  on table public.profiles from authenticated;

grant select, insert, update, delete on table public.bot4x_configs to service_role;
grant select, insert, update, delete on table public.bot4x_trades to service_role;
grant select, insert, update, delete on table public.trade_outbox to service_role;
grant select, insert, update, delete on table public.profiles to service_role;
-- FIX DB-01: Índices compostos ausentes na tabela `signals`.
--
-- A query mais frequente do frontend é:
--   WHERE status = 'active' ORDER BY score DESC LIMIT N
-- Sem índice composto, o planner faz Bitmap Index Scan + sort O(N log N).
-- Com 100k+ sinais históricos isso degrada a latência em ~10x.
--
-- Usamos CONCURRENTLY para não bloquear reads/writes durante a criação.
-- NOTA: em Supabase local (`supabase db reset`) remova CONCURRENTLY pois
--       o modo de test não suporta; adicione de volta antes de aplicar em prod.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_status_score
  ON public.signals (status, score DESC)
  WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_signals_user_created
  ON public.signals (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- FIX DB-02: calibrator_runs.id é TEXT recebendo UUID — corrigir tipo.
-- Requer que a tabela não tenha foreign keys de outras tabelas apontando
-- para calibrator_runs.id. Verifique antes de aplicar em prod.
ALTER TABLE public.calibrator_runs
  ALTER COLUMN id TYPE UUID USING id::UUID,
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- FIX DB-04: Trigger reset_daily_dna_metrics só dispara em UPDATE ativo.
-- Criar um pg_cron job para reset diário às 00:01 UTC para cobrir
-- usuários que ficaram inativos (sem UPDATE em dna_updated_at).
-- Requer pg_cron habilitado no projeto Supabase (Extensões > pg_cron).
SELECT cron.schedule(
  'reset-daily-dna-metrics',
  '1 0 * * *',  -- 00:01 UTC todo dia
  $$
    UPDATE public.profiles
    SET
      operations_today  = 0,
      drawdown_today    = 0,
      best_trade_today  = NULL,
      worst_trade_today = NULL
    WHERE
      dna_updated_at < CURRENT_DATE
      AND (
        operations_today  > 0 OR
        drawdown_today    != 0
      );
  $$
);

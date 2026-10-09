-- FIX DB-01: Índices compostos ausentes na tabela `signals`.
--
-- O replay do histórico executa cada migration em uma transação; por isso,
-- estes índices não usam CONCURRENTLY. Para tabelas grandes em produção,
-- avalie uma janela de manutenção separada para criação concorrente.
CREATE INDEX IF NOT EXISTS idx_signals_status_score
  ON public.signals (status, score DESC)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_signals_user_created
  ON public.signals (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- FIX DB-02: calibrator_runs.id é TEXT recebendo UUID — corrigir tipo.
-- Pré-condição: os valores existentes devem ser UUID válidos e não pode haver
-- FKs incompatíveis apontando para calibrator_runs.id.
-- Remover o DEFAULT antigo antes de mudar o tipo evita erro 42804.
ALTER TABLE public.calibrator_runs
  ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.calibrator_runs
  ALTER COLUMN id TYPE UUID USING id::UUID;

ALTER TABLE public.calibrator_runs
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- FIX DB-04: Reset diário de métricas para usuários inativos.
-- Requer pg_cron habilitado (o Supabase local fornece a extensão).
SELECT cron.schedule(
  'reset-daily-dna-metrics',
  '1 0 * * *',
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

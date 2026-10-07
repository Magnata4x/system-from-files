-- Fase 38: correções de risco e consistência.
--
-- Objetivos:
-- 1. tornar o backfill de capital/alocação determinístico sem reutilizar
--    colunas legadas com semântica diferente;
-- 2. garantir open_slots em [0,10] e não nulo;
-- 3. tornar o reset diário do DNA acionável somente pelo backend e baseado
--    na transição de dia do timestamp do DNA;
-- 4. fechar explicitamente EXECUTE de reconcile_trade_outbox para clientes;
-- 5. não introduzir CREATE INDEX CONCURRENTLY em migration transacional.

-- ---------------------------------------------------------------------------
-- 1) allocation_pct / total_capital
-- ---------------------------------------------------------------------------
-- allocation_pct não pode ser derivado de ai_score_min: são conceitos
-- diferentes. Para rows legadas ainda nulas, usa-se somente o default de
-- configuração documentado (30%), sem reclassificar score de IA como risco.
UPDATE public.bot4x_configs
SET allocation_pct = 30
WHERE allocation_pct IS NULL;

-- total_capital pode ser recuperado de active_capital quando este representa
-- capital operacional positivo. Caso contrário, mantém o default histórico
-- de configuração (1000) apenas para rows sem valor persistido.
UPDATE public.bot4x_configs
SET total_capital = CASE
  WHEN active_capital > 0 THEN active_capital
  ELSE 1000
END
WHERE total_capital IS NULL;

ALTER TABLE public.bot4x_configs
  ALTER COLUMN allocation_pct SET DEFAULT 30,
  ALTER COLUMN allocation_pct SET NOT NULL,
  ALTER COLUMN total_capital SET DEFAULT 1000,
  ALTER COLUMN total_capital SET NOT NULL;

ALTER TABLE public.bot4x_configs
  DROP CONSTRAINT IF EXISTS bot4x_configs_allocation_pct_check,
  DROP CONSTRAINT IF EXISTS bot4x_configs_total_capital_check;

ALTER TABLE public.bot4x_configs
  ADD CONSTRAINT bot4x_configs_allocation_pct_check
    CHECK (allocation_pct BETWEEN 1 AND 100),
  ADD CONSTRAINT bot4x_configs_total_capital_check
    CHECK (total_capital >= 0);

COMMENT ON COLUMN public.bot4x_configs.allocation_pct IS
  'Percentual de capital alocado por operação. Não deriva de ai_score_min.';
COMMENT ON COLUMN public.bot4x_configs.total_capital IS
  'Capital total configurado para cálculo de risco.';

-- ---------------------------------------------------------------------------
-- 2) open_slots = máximo 10
-- ---------------------------------------------------------------------------
UPDATE public.bot4x_configs
SET open_slots = 0
WHERE open_slots IS NULL;

UPDATE public.bot4x_configs
SET open_slots = 10
WHERE open_slots > 10;

ALTER TABLE public.bot4x_configs
  DROP CONSTRAINT IF EXISTS bot4x_configs_open_slots_check;

ALTER TABLE public.bot4x_configs
  ALTER COLUMN open_slots SET DEFAULT 0,
  ALTER COLUMN open_slots SET NOT NULL;

ALTER TABLE public.bot4x_configs
  ADD CONSTRAINT bot4x_configs_open_slots_check
    CHECK (open_slots BETWEEN 0 AND 10);

-- ---------------------------------------------------------------------------
-- 3) reset_daily_dna_metrics
-- ---------------------------------------------------------------------------
-- O reset é disparado somente quando o timestamp do DNA é atualizado.
-- A comparação usa o valor anterior para detectar a mudança de dia.
CREATE OR REPLACE FUNCTION public.reset_daily_dna_metrics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.dna_updated_at IS NOT NULL
     AND date_trunc('day', OLD.dna_updated_at) < date_trunc('day', NOW())
  THEN
    NEW.operations_today := 0;
    NEW.drawdown_today   := 0;
    NEW.recent_losses    := 0;
    NEW.open_loss_pct    := 0;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reset_daily_dna_metrics() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_daily_dna_metrics() TO service_role;

DROP TRIGGER IF EXISTS trg_reset_daily_dna_metrics ON public.profiles;

CREATE TRIGGER trg_reset_daily_dna_metrics
  BEFORE UPDATE OF dna_updated_at ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_daily_dna_metrics();

-- ---------------------------------------------------------------------------
-- 4) reconcile_trade_outbox EXECUTE grants
-- ---------------------------------------------------------------------------
-- A função é SECURITY DEFINER e operacional. Clientes não devem poder
-- invocá-la diretamente. O worker/cron continua sendo o executor interno.
REVOKE EXECUTE ON FUNCTION public.reconcile_trade_outbox() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_trade_outbox() TO service_role;

-- ---------------------------------------------------------------------------
-- 5) CREATE INDEX CONCURRENTLY
-- ---------------------------------------------------------------------------
-- Nenhum índice concorrente é criado nesta migration. Migrations Supabase
-- devem permanecer compatíveis com execução transacional; índices que
-- realmente precisem de CONCURRENTLY devem ser tratados em operação separada.

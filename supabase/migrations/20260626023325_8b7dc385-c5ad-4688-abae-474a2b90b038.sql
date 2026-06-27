
-- CORREÇÃO 1: open_slots
ALTER TABLE public.bot4x_configs DROP CONSTRAINT IF EXISTS bot4x_configs_open_slots_check;
UPDATE public.bot4x_configs SET open_slots = LEAST(open_slots, 10) WHERE open_slots > 10;
ALTER TABLE public.bot4x_configs
  ADD CONSTRAINT bot4x_configs_open_slots_check CHECK (open_slots BETWEEN 0 AND 10);
COMMENT ON COLUMN public.bot4x_configs.open_slots
  IS 'Slots de ordens abertas simultâneas. Limite atualizado de 3 → 10 (v26).';

-- CORREÇÃO 2: colunas de métricas do DNA
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS operations_today INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS drawdown_today   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recent_losses    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_loss_pct    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dna_updated_at   TIMESTAMPTZ;

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

DROP TRIGGER IF EXISTS trg_reset_daily_dna_metrics ON public.profiles;
CREATE TRIGGER trg_reset_daily_dna_metrics
  BEFORE UPDATE OF dna_updated_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.reset_daily_dna_metrics();

COMMENT ON COLUMN public.profiles.operations_today
  IS 'Número de trades executados hoje. Zerado pelo trigger trg_reset_daily_dna_metrics.';
COMMENT ON COLUMN public.profiles.drawdown_today
  IS 'PnL diário acumulado (%). Negativo = loss. Zerado à meia-noite pelo trigger.';
COMMENT ON COLUMN public.profiles.dna_updated_at
  IS 'Timestamp da última gravação do DNA Auto-Corrector. Controla o reset diário.';

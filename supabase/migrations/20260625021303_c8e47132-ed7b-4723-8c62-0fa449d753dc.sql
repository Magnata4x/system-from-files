-- fix_sl_tp_backfill.sql
-- A migration anterior (20260625000008_...) fez backfill incorreto das colunas
-- sl_pct e tp_pct usando rsi_threshold_low / rsi_threshold_high (valores 30-70),
-- e allocation_pct herdou valores de ai_score_min (potencialmente > 100).
-- Resultado: usuários ficaram com sl_pct = 35% e tp_pct = 70%, o que é
-- devastador para trades reais. Esta migration corrige os registros afetados
-- e adiciona CHECK constraints para impedir reincidência.

UPDATE public.bot4x_configs
  SET sl_pct = 0.5
  WHERE sl_pct > 10 OR sl_pct IS NULL OR sl_pct <= 0;

UPDATE public.bot4x_configs
  SET tp_pct = 1.0
  WHERE tp_pct > 20 OR tp_pct IS NULL OR tp_pct <= 0;

UPDATE public.bot4x_configs
  SET allocation_pct = 30
  WHERE allocation_pct > 100 OR allocation_pct IS NULL OR allocation_pct <= 0;

ALTER TABLE public.bot4x_configs
  ADD CONSTRAINT chk_sl_pct CHECK (sl_pct BETWEEN 0.1 AND 10);

ALTER TABLE public.bot4x_configs
  ADD CONSTRAINT chk_tp_pct CHECK (tp_pct BETWEEN 0.1 AND 20);

ALTER TABLE public.bot4x_configs
  ADD CONSTRAINT chk_allocation_pct CHECK (allocation_pct BETWEEN 1 AND 100);
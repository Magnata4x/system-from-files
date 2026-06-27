-- FIX ARCH-02: Outbox Pattern — worker de reconciliação que estava ausente.
--
-- O frontend usa saveTradeWithOutbox() que insere na trade_outbox com
-- status='pending' antes de tentar o write direto. Quando o write direto
-- falha (rede, timeout), a row fica em status='pending' indefinidamente —
-- o comentário no código prometia um "worker server-side" que nunca existiu.
--
-- Esta migration cria:
--   1. A função reconcile_trade_outbox() — SECURITY DEFINER para acessar
--      bot4x_trades mesmo quando chamada pelo role do pg_cron.
--   2. Um pg_cron job que roda a cada 5 minutos processando rows pendentes
--      com mais de 60 segundos (evita reprocessar writes em andamento).

CREATE OR REPLACE FUNCTION public.reconcile_trade_outbox()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  trade_data JSONB;
BEGIN
  FOR rec IN
    SELECT id, user_id, trade_data AS td, created_at
    FROM public.trade_outbox
    WHERE
      status = 'pending'
      AND created_at < NOW() - INTERVAL '60 seconds'
    ORDER BY created_at ASC
    LIMIT 100
  LOOP
    trade_data := rec.td;
    BEGIN
      INSERT INTO public.bot4x_trades (
        id, user_id, day, pair, side, entry, stop, target,
        result, pnl, pnl_pct, accumulated, profile,
        leverage, motivo, hour
      )
      VALUES (
        (trade_data->>'id')::text,
        rec.user_id,
        (trade_data->>'day')::text,
        (trade_data->>'pair')::text,
        (trade_data->>'side')::text,
        (trade_data->>'entry')::numeric,
        (trade_data->>'stop')::numeric,
        (trade_data->>'target')::numeric,
        (trade_data->>'result')::text,
        (trade_data->>'pnl')::numeric,
        (trade_data->>'pnlPct')::numeric,
        (trade_data->>'accumulated')::numeric,
        (trade_data->>'profile')::text,
        (trade_data->>'leverage')::numeric,
        (trade_data->>'motivo')::text,
        (trade_data->>'hour')::integer
      )
      ON CONFLICT (id) DO NOTHING;

      UPDATE public.trade_outbox
      SET
        status       = 'processed',
        processed_at = NOW()
      WHERE id = rec.id;

    EXCEPTION WHEN OTHERS THEN
      -- Marcar como falha permanente após tentativas repetidas
      UPDATE public.trade_outbox
      SET
        status       = 'failed',
        processed_at = NOW()
      WHERE
        id = rec.id
        AND created_at < NOW() - INTERVAL '24 hours';
      -- Se menos de 24h, deixa pendente para próxima rodada
    END;
  END LOOP;
END;
$$;

-- Revogar acesso direto ao público — só chamado pelo pg_cron
REVOKE EXECUTE ON FUNCTION public.reconcile_trade_outbox() FROM PUBLIC;

-- Agendar: a cada 5 minutos
SELECT cron.schedule(
  'reconcile-trade-outbox',
  '*/5 * * * *',
  'SELECT public.reconcile_trade_outbox()'
);

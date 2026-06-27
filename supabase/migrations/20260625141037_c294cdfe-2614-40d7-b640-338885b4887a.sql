-- COPILOT-RETENTION (LGPD/GDPR): purge automático de copilot_history > 90 dias.
-- Mensagens do AI Copilot podem conter contexto sensível de trading; sem TTL
-- a tabela cresce indefinidamente acumulando dados pessoais.

-- 1) Coluna expires_at mantida por trigger.
--    Não usamos GENERATED ALWAYS porque `timestamptz + interval '90 days'`
--    não é IMMUTABLE (arithmetic de dias depende de timezone/DST), e o
--    Postgres rejeita a expressão de geração com 42P17. Um trigger BEFORE
--    INSERT/UPDATE OF created_at resolve com a mesma garantia prática.
ALTER TABLE public.copilot_history
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_copilot_history_expires_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.expires_at := NEW.created_at + INTERVAL '90 days';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_copilot_history_set_expires_at ON public.copilot_history;
CREATE TRIGGER trg_copilot_history_set_expires_at
  BEFORE INSERT OR UPDATE OF created_at ON public.copilot_history
  FOR EACH ROW EXECUTE FUNCTION public.set_copilot_history_expires_at();

-- Backfill para linhas existentes.
UPDATE public.copilot_history
   SET expires_at = created_at + INTERVAL '90 days'
 WHERE expires_at IS NULL;

-- 2) Índice para o job de purge.
--    Não usamos partial index `WHERE expires_at < NOW()` porque NOW() não
--    é IMMUTABLE — Postgres rejeita o predicado. Um btree pleno é
--    suficiente para o DELETE diário.
CREATE INDEX IF NOT EXISTS idx_copilot_history_expires
  ON public.copilot_history (expires_at);

-- 3) Função de purge (SECURITY DEFINER + search_path fixo).
CREATE OR REPLACE FUNCTION public.purge_expired_copilot_history()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.copilot_history
  WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Função é interna ao cron job: revogar EXECUTE público.
REVOKE EXECUTE ON FUNCTION public.purge_expired_copilot_history() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.purge_expired_copilot_history() TO service_role;

-- 4) Agendamento diário às 03:00 UTC via pg_cron (idempotente).
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-copilot-history') THEN
    PERFORM cron.unschedule('purge-copilot-history');
  END IF;
  PERFORM cron.schedule(
    'purge-copilot-history',
    '0 3 * * *',
    $cron$ SELECT public.purge_expired_copilot_history(); $cron$
  );
END
$$;

-- 5) RLS: a tabela já tem "copilot_history_own" FOR ALL com
--    USING (auth.uid() = user_id), cobrindo DELETE do próprio usuário.
--    Não duplicamos a policy.

-- DB-3: the outbox reconciler is a SECURITY DEFINER worker invoked by pg_cron.
-- Client API roles must never be able to invoke it directly.
-- Fail loudly if the expected function is absent: that indicates migration-history drift.
DO $$
BEGIN
  IF to_regprocedure('public.reconcile_trade_outbox()') IS NULL THEN
    RAISE EXCEPTION
      'DB-3: public.reconcile_trade_outbox() is missing; replay prerequisite migrations before applying this migration';
  END IF;
END
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.reconcile_trade_outbox() FROM PUBLIC;
REVOKE ALL PRIVILEGES ON FUNCTION public.reconcile_trade_outbox() FROM anon, authenticated;

-- DB-3 ACL regression test. Run after migrations on a clean local database.
DO $$
BEGIN
  IF to_regprocedure('public.reconcile_trade_outbox()') IS NULL THEN
    RAISE EXCEPTION 'DB-3 failed: public.reconcile_trade_outbox() does not exist';
  END IF;

  IF has_function_privilege('anon', 'public.reconcile_trade_outbox()', 'EXECUTE') THEN
    RAISE EXCEPTION 'DB-3 failed: anon can execute reconcile_trade_outbox()';
  END IF;

  IF has_function_privilege('authenticated', 'public.reconcile_trade_outbox()', 'EXECUTE') THEN
    RAISE EXCEPTION 'DB-3 failed: authenticated can execute reconcile_trade_outbox()';
  END IF;
END
$$;

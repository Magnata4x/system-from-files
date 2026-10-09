-- DB-2.1 ACL regression tests: no client table-level mutation paths.
DO $$
DECLARE
  role_name text;
  table_name text;
  protected_column text;
BEGIN
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH table_name IN ARRAY ARRAY[
      'bot4x_configs', 'bot4x_trades', 'trade_outbox', 'profiles'
    ] LOOP
      IF has_table_privilege(role_name, format('public.%I', table_name), 'DELETE') THEN
        RAISE EXCEPTION 'DB-2.1 failed: % can DELETE from %', role_name, table_name;
      END IF;
    END LOOP;

    FOREACH table_name IN ARRAY ARRAY['bot4x_trades', 'trade_outbox'] LOOP
      IF has_table_privilege(role_name, format('public.%I', table_name), 'INSERT')
         OR has_table_privilege(role_name, format('public.%I', table_name), 'UPDATE')
         OR has_table_privilege(role_name, format('public.%I', table_name), 'DELETE') THEN
        RAISE EXCEPTION 'DB-2.1 failed: % can mutate %', role_name, table_name;
      END IF;
    END LOOP;
  END LOOP;

  -- anon must not mutate any protected table.
  FOREACH table_name IN ARRAY ARRAY['bot4x_configs','bot4x_trades','trade_outbox','profiles'] LOOP
    IF has_table_privilege('anon', format('public.%I', table_name), 'INSERT')
       OR has_table_privilege('anon', format('public.%I', table_name), 'UPDATE')
       OR has_table_privilege('anon', format('public.%I', table_name), 'DELETE') THEN
      RAISE EXCEPTION 'DB-2.1 failed: anon can mutate %', table_name;
    END IF;
  END LOOP;

  -- authenticated may update only explicitly allowed preferences/profile fields.
  IF NOT has_column_privilege('authenticated','public.bot4x_configs','active','UPDATE')
     OR NOT has_column_privilege('authenticated','public.bot4x_configs','rsi_threshold_low','UPDATE')
     OR NOT has_column_privilege('authenticated','public.profiles','full_name','UPDATE') THEN
    RAISE EXCEPTION 'DB-2.1 failed: user preference/profile grants missing';
  END IF;

  FOREACH protected_column IN ARRAY ARRAY[
    'circuit_breaker','daily_pnl','open_slots','active_capital','total_trades_today','api_key_set'
  ] LOOP
    IF has_column_privilege('authenticated','public.bot4x_configs',protected_column,'INSERT')
       OR has_column_privilege('authenticated','public.bot4x_configs',protected_column,'UPDATE') THEN
      RAISE EXCEPTION 'DB-2.1 failed: authenticated can write bot4x_configs.%', protected_column;
    END IF;
  END LOOP;

  FOREACH protected_column IN ARRAY ARRAY[
    'dna_updated_at','operations_today','drawdown_today','avg_win_rate','recent_losses','open_loss_pct'
  ] LOOP
    IF has_column_privilege('authenticated','public.profiles',protected_column,'INSERT')
       OR has_column_privilege('authenticated','public.profiles',protected_column,'UPDATE') THEN
      RAISE EXCEPTION 'DB-2.1 failed: authenticated can write profiles.%', protected_column;
    END IF;
  END LOOP;

  IF NOT has_table_privilege('service_role','public.bot4x_trades','INSERT')
     OR NOT has_table_privilege('service_role','public.bot4x_trades','UPDATE')
     OR NOT has_table_privilege('service_role','public.trade_outbox','INSERT')
     OR NOT has_table_privilege('service_role','public.trade_outbox','UPDATE') THEN
    RAISE EXCEPTION 'DB-2.1 failed: service_role operational writes missing';
  END IF;
END
$$;

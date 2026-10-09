-- DB-2 ACL regression tests. Run against Supabase/Postgres with role ACL visibility.
DO $$
DECLARE
  role_name text;
  protected_column text;
BEGIN
  -- Server-owned fields cannot be inserted or updated by anon/authenticated,
  -- including through any inherited table-level grants.
  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH protected_column IN ARRAY ARRAY[
      'circuit_breaker', 'daily_pnl', 'open_slots', 'active_capital',
      'total_trades_today', 'api_key_set'
    ] LOOP
      IF has_column_privilege(role_name, 'public.bot4x_configs', protected_column, 'INSERT')
         OR has_column_privilege(role_name, 'public.bot4x_configs', protected_column, 'UPDATE') THEN
        RAISE EXCEPTION 'DB-2 failed: % can write bot4x_configs.%', role_name, protected_column;
      END IF;
    END LOOP;

    FOREACH protected_column IN ARRAY ARRAY[
      'dna_updated_at', 'operations_today', 'drawdown_today', 'avg_win_rate',
      'recent_losses', 'open_loss_pct'
    ] LOOP
      IF has_column_privilege(role_name, 'public.profiles', protected_column, 'INSERT')
         OR has_column_privilege(role_name, 'public.profiles', protected_column, 'UPDATE') THEN
        RAISE EXCEPTION 'DB-2 failed: % can write profiles.%', role_name, protected_column;
      END IF;
    END LOOP;

    IF has_table_privilege(role_name, 'public.bot4x_trades', 'INSERT')
       OR has_table_privilege(role_name, 'public.bot4x_trades', 'UPDATE')
       OR has_table_privilege(role_name, 'public.bot4x_trades', 'DELETE') THEN
      RAISE EXCEPTION 'DB-2 failed: % can mutate bot4x_trades', role_name;
    END IF;

    IF has_table_privilege(role_name, 'public.trade_outbox', 'INSERT')
       OR has_table_privilege(role_name, 'public.trade_outbox', 'UPDATE')
       OR has_table_privilege(role_name, 'public.trade_outbox', 'DELETE') THEN
      RAISE EXCEPTION 'DB-2 failed: % can mutate trade_outbox', role_name;
    END IF;
  END LOOP;

  -- Authenticated users retain the intended user-facing configuration/profile writes.
  IF NOT has_column_privilege('authenticated', 'public.bot4x_configs', 'active', 'UPDATE')
     OR NOT has_column_privilege('authenticated', 'public.bot4x_configs', 'rsi_threshold_low', 'UPDATE')
     OR NOT has_column_privilege('authenticated', 'public.profiles', 'full_name', 'UPDATE') THEN
    RAISE EXCEPTION 'DB-2 failed: expected user preference/profile grants were removed';
  END IF;

  -- The backend service role retains the operational write path.
  IF NOT has_table_privilege('service_role', 'public.bot4x_trades', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.bot4x_trades', 'UPDATE')
     OR NOT has_table_privilege('service_role', 'public.bot4x_trades', 'DELETE')
     OR NOT has_table_privilege('service_role', 'public.trade_outbox', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.trade_outbox', 'UPDATE')
     OR NOT has_table_privilege('service_role', 'public.trade_outbox', 'DELETE')
     OR NOT has_column_privilege('service_role', 'public.bot4x_configs', 'circuit_breaker', 'UPDATE')
     OR NOT has_column_privilege('service_role', 'public.profiles', 'operations_today', 'UPDATE') THEN
    RAISE EXCEPTION 'DB-2 failed: service_role lost required operational writes';
  END IF;
END
$$;

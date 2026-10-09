-- DB-1 regression checks. Run with a database role allowed to inspect ACLs.
DO $$
BEGIN
  IF has_table_privilege('anon', 'public.exchange_credentials', 'SELECT')
     OR has_table_privilege('authenticated', 'public.exchange_credentials', 'SELECT') THEN
    RAISE EXCEPTION 'DB-1 failed: client role can SELECT exchange_credentials';
  END IF;

  IF has_table_privilege('anon', 'public.exchange_credentials', 'INSERT')
     OR has_table_privilege('authenticated', 'public.exchange_credentials', 'INSERT') THEN
    RAISE EXCEPTION 'DB-1 failed: client role can INSERT exchange_credentials';
  END IF;

  IF has_table_privilege('anon', 'public.exchange_credentials', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.exchange_credentials', 'UPDATE') THEN
    RAISE EXCEPTION 'DB-1 failed: client role can UPDATE exchange_credentials';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.exchange_credentials', 'SELECT')
     OR NOT has_table_privilege('service_role', 'public.exchange_credentials', 'INSERT')
     OR NOT has_table_privilege('service_role', 'public.exchange_credentials', 'UPDATE') THEN
    RAISE EXCEPTION 'DB-1 failed: service_role lost required credential access';
  END IF;
END
$$;

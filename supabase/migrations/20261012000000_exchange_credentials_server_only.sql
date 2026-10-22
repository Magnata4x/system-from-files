-- Exchange credentials are server-owned secrets. Browser roles must never read or mutate them.
-- All application access uses the server-side service-role client.
DROP POLICY IF EXISTS "Users manage own exchange credentials" ON public.exchange_credentials;
REVOKE ALL PRIVILEGES ON TABLE public.exchange_credentials FROM anon, authenticated;
ALTER TABLE public.exchange_credentials FORCE ROW LEVEL SECURITY;

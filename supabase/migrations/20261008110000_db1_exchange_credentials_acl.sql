-- DB-1: reassert the client boundary for exchange credentials.
-- Encrypted API material is server-only; clients must use server endpoints.
REVOKE ALL PRIVILEGES ON TABLE public.exchange_credentials FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.exchange_credentials TO service_role;

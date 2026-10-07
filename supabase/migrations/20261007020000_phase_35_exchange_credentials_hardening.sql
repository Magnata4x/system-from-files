-- Fase 35: credenciais de exchange somente no backend server-side.
-- A tabela contém segredos cifrados e nunca deve ser acessível pelo cliente.

revoke all on table public.exchange_credentials from anon, authenticated;

drop policy if exists "Users manage own exchange credentials" on public.exchange_credentials;

-- Mantém o acesso explícito para o papel usado por operações server-only.
grant select, insert, update, delete on table public.exchange_credentials to service_role;

-- Applied only after the server-only credential path is deployed.

-- Fase 35: no client role receives access to encrypted exchange material.

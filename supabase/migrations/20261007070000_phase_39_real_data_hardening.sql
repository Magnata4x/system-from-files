-- Fase 39: dados reais e endurecimento final.
--
-- 1) Remove o catálogo marketplace fictício que era usado como seed/demo.
-- 2) Impede enumeração de admins via private.has_role.
-- 3) Expõe check_rate_limit somente ao papel authenticated, para que a API
--    consiga aplicar o limite por usuário sem abrir a função a anon/public.
-- 4) Remove índices redundantes comprovados por definição/prefixo.

DELETE FROM public.marketplace_views
WHERE product_id IN ('p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12');

DELETE FROM public.marketplace_products
WHERE id IN ('p1','p2','p3','p4','p5','p6','p7','p8','p9','p10','p11','p12');

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT CASE
    WHEN _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
  END;
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.check_rate_limit(uuid, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(uuid, text, integer) TO authenticated;

DROP INDEX IF EXISTS public.idx_bot4x_configs_user_id;
DROP INDEX IF EXISTS public.bot4x_trades_user_day;
DROP INDEX IF EXISTS public.idx_copilot_history_user_id;
DROP INDEX IF EXISTS public.market_snapshots_captured_at_idx;

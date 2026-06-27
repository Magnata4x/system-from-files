
-- Substitui a policy permissiva `signals_select_all` por uma separação
-- explícita público/privado:
--   - Sinais públicos: user_id IS NULL -> visíveis a qualquer autenticado.
--   - Sinais privados: user_id = auth.uid() -> visíveis só ao dono.
-- INSERT/UPDATE permanecem restritos a service_role (intactos).
DROP POLICY IF EXISTS "signals_select_all" ON public.signals;
DROP POLICY IF EXISTS "signals_select_public" ON public.signals;
DROP POLICY IF EXISTS "signals_select_own" ON public.signals;

CREATE POLICY "signals_select_public"
  ON public.signals
  FOR SELECT
  TO authenticated
  USING (user_id IS NULL);

CREATE POLICY "signals_select_own"
  ON public.signals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

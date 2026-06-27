-- FIX QA-02: Colunas legacy em bot4x_configs documentadas para remoção.
-- Esta migration NÃO executa o DROP imediatamente — ela apenas documenta
-- as colunas legadas e o critério de segurança para dropá-las.
--
-- Colunas marcadas para remoção (após verificar zero readers externos):
--   - rsi_threshold_low
--   - rsi_threshold_high
--   - ai_score_min
--   - fomo_limit
--
-- Para remover quando nenhum consumidor externo (integrações, scripts,
-- exports de BI) referenciar esses campos:
--
--   ALTER TABLE public.bot4x_configs
--     DROP COLUMN IF EXISTS rsi_threshold_low,
--     DROP COLUMN IF EXISTS rsi_threshold_high,
--     DROP COLUMN IF EXISTS ai_score_min,
--     DROP COLUMN IF EXISTS fomo_limit;
--
-- Checklist de segurança antes de executar:
--   [ ] grep nos logs de produção por "rsi_threshold_low" nos últimos 30 dias
--   [ ] Verificar exports de BI / dashboards externos
--   [ ] Verificar integrações de terceiros (Zapier, Make, webhooks)
--   [ ] Criar backup da tabela: CREATE TABLE bot4x_configs_backup AS SELECT * FROM bot4x_configs
--   [ ] Executar em staging primeiro e monitorar por 72h

COMMENT ON COLUMN public.bot4x_configs.rsi_threshold_low
  IS 'LEGACY — pendente remoção. Substituído pelo calibrador v2. Ver migration 20260627000003.';
COMMENT ON COLUMN public.bot4x_configs.rsi_threshold_high
  IS 'LEGACY — pendente remoção. Substituído pelo calibrador v2. Ver migration 20260627000003.';
COMMENT ON COLUMN public.bot4x_configs.ai_score_min
  IS 'LEGACY — pendente remoção. Substituído pelo engine-scoring. Ver migration 20260627000003.';
COMMENT ON COLUMN public.bot4x_configs.fomo_limit
  IS 'LEGACY — pendente remoção. Substituído pelo dna-auto-corrector. Ver migration 20260627000003.';

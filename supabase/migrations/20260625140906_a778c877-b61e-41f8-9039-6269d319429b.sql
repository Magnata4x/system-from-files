-- DEPRECAÇÃO PLANEJADA: bot4x_configs colunas legadas
--
-- Esta migration é DOCUMENTAL — não executa nenhuma alteração de schema.
-- Serve como marco formal do plano de remoção das colunas legadas que
-- foram reaproveitadas em ARCH-02 (migração 2026-06) e hoje permanecem
-- apenas por compatibilidade com linhas antigas / leitores externos.
--
-- Colunas marcadas para remoção na versão 2.0:
--   rsi_threshold_low  → substituída por sl_pct
--   rsi_threshold_high → substituída por tp_pct
--   ai_score_min       → substituída por allocation_pct
--   fomo_limit         → substituída por total_capital
--   exchange           → mantida mas será renomeada para exchange_id
--                        (hoje serializa preferred/avoid pairs como JSON)
--
-- Antes de remover:
--   1. Confirmar que nenhum dashboard de BI lê estas colunas.
--   2. Confirmar que o backend NestJS não lê estas colunas.
--   3. Confirmar que nenhum suporte usa queries diretas nestas colunas.
--   4. Confirmar via logs (warning [bot4x-config-db][deprecated]) que
--      nenhum cliente em produção ainda dispara o fallback legado.
--   5. Criar migration de remoção (DROP COLUMN ...) e testar em
--      staging por 2 semanas.
--
-- Data planejada de remoção: [preencher após confirmações acima]
-- Issue de rastreamento: [link da issue]

-- Anotações de deprecação no catálogo do Postgres para que ferramentas de
-- BI / introspecção (pg_dump, psql \d+, DBeaver, etc.) exibam o aviso.
COMMENT ON COLUMN public.bot4x_configs.rsi_threshold_low  IS 'DEPRECATED (v2.0): use sl_pct.';
COMMENT ON COLUMN public.bot4x_configs.rsi_threshold_high IS 'DEPRECATED (v2.0): use tp_pct.';
COMMENT ON COLUMN public.bot4x_configs.ai_score_min       IS 'DEPRECATED (v2.0): use allocation_pct.';
COMMENT ON COLUMN public.bot4x_configs.fomo_limit         IS 'DEPRECATED (v2.0): use total_capital.';
COMMENT ON COLUMN public.bot4x_configs.exchange           IS 'DEPRECATED (v2.0): substituída por preferred_pairs/avoid_pairs; será renomeada para exchange_id.';
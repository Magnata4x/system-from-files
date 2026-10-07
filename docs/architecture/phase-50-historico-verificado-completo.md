# Fase 50 — histórico verificado completo

## Objetivo

Garantir que o histórico operacional padrão represente todo o ciclo de vida registrado no ledger verificado, sem esconder intenções pendentes ou falhas.

## Contrato

- `GET /api/bot4x/executions` sem parâmetros usa exclusivamente `bot4x_execution_intents`.
- `pending`, `submitted`, `completed` e `failed` podem aparecer no histórico verificado.
- `failed` é apresentado como resultado `FAILED`, sem inventar PnL.
- Campos financeiros ausentes permanecem nulos/indisponíveis.
- Histórico simples e histórico paginado usam o mesmo mapeamento verificado.
- `source=legacy` continua sendo o único caminho explícito para `bot4x_trades`.
- Nenhum mock, fallback ou PnL sintético é criado.
- REAL permanece protegido pelos gates existentes.

## Fluxo

Binance → reconciliação → ledger verificado → histórico completo → telemetria.

A Fase 50 não altera submissão, cancelamento, credenciais ou ambiente de execução.

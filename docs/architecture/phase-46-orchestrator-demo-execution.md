# Fase 46 — Orchestrator → executor DEMO

## Objetivo

Conectar candidatos reais do Orchestrator ao executor DEMO sem abrir o caminho REAL.

## Contrato

- O Orchestrator continua usando Market Data → Engine → Signal reais.
- Somente `EXECUTION_CANDIDATE` em modo DEMO pode chegar ao executor.
- O executor automático só é habilitado com `BOT4X_DEMO_AUTO_EXECUTION=true`.
- O executor da fase suporta somente `BTCUSDT` e valor fixo de US$6.
- O executor valida Binance Testnet, credenciais verificadas, permissão de trade, risco, confirmação e idempotência.
- A chave de idempotência é determinística para o mesmo sinal operacional.
- REAL nunca é submetido pelo Orchestrator.

## Segurança

Por padrão, `BOT4X_DEMO_AUTO_EXECUTION` está desligado. Assim, uma publicação sem essa configuração permanece em modo candidato/observação e não envia ordens.

Nenhum teste chama a Binance. Os testes cobrem somente o gate e a geração determinística da chave.

## Fluxo

Mercado real → Engine → Signal → Bot4x → Orchestrator → gate DEMO → executor → Binance Spot Testnet

O fluxo REAL continua bloqueado por `isRealExecutionAuthorized() === false` e não recebe caminho de submissão no Orchestrator.

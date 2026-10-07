# Fase 47 — Reconciliação de execuções DEMO

## Objetivo

Fechar o elo Binance → ledger após a submissão DEMO, consultando o estado real da ordem por `clientOrderId`.

## Contrato

- A reconciliação é somente leitura na Binance.
- Nunca reenvia uma ordem.
- `FILLED` → `completed`.
- `NEW`, `PARTIALLY_FILLED`, `PENDING_CANCEL` → `submitted`.
- `CANCELED`, `REJECTED`, `EXPIRED`, `EXPIRED_IN_MATCH` → `failed`.
- Ordem não encontrada (`-2013`) permanece `pending` para evitar duplicidade.
- O endpoint reconcilia somente as intenções do usuário autenticado.
- A implementação desta fase cobre o executor DEMO/BTCUSDT; REAL continua sem caminho automático de reconciliação/submissão pelo Orchestrator.

## Fluxo

Mercado → Engine → Signal → Bot4x → Orchestrator → Binance Testnet → **Reconciliação → Ledger**

Nenhum PnL sintético, trade artificial ou nova ordem é criado pela reconciliação.

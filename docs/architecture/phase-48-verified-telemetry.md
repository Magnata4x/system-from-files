# Fase 48 — Telemetria operacional verificada

## Objetivo

Após a reconciliação da Fase 47, a telemetria financeira deve usar exclusivamente o ledger de execuções verificadas na Binance para contagens e PnL operacional.

## Contrato

- `today.trades` representa execuções `completed` do ledger verificado.
- `today.wins`, `today.losses` e `today.pnl` usam somente `realizedPnl` confirmado e não nulo.
- `dailyPnl` passa a ser o mesmo PnL realizado verificado; a origem é explicitamente `verified_binance_execution_ledger`.
- Ordens `submitted` e `pending` são operações abertas para a telemetria; `failed` permanece separado.
- Linhas de `bot4x_trades` são mantidas apenas como `legacyTradeRows` para compatibilidade/diagnóstico e não alimentam os números financeiros oficiais.
- Nenhum valor sintético ou fallback financeiro é criado.

## Fluxo

Binance Testnet → Reconciliação → Ledger de execução → Telemetria verificada → Monitor/Histórico.

REAL continua bloqueado e nenhuma ordem é enviada pela telemetria.

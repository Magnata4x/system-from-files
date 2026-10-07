# Fase 49 — histórico verificado como padrão

## Objetivo

Fechar o histórico operacional para que a rota padrão de execuções use o ledger de intenções reconciliadas com a Binance, sem depender de `bot4x_trades`.

## Contrato

- `GET /api/bot4x/executions` sem parâmetros retorna somente histórico verificado.
- `GET /api/bot4x/executions?source=verified` continua explicitamente verificado.
- `GET /api/bot4x/executions?source=legacy` é o único caminho explícito para compatibilidade com `bot4x_trades`.
- A telemetria operacional não consulta mais `bot4x_trades` para números ou logs.
- PnL continua vindo somente de fills/contrapartes verificadas na Binance.
- Nenhum dado legado é convertido em execução real.
- Nenhum fallback, mock ou PnL sintético é criado.
- REAL permanece bloqueado.

## Fluxo

Binance Testnet → Reconciliação → Ledger verificado → Histórico/Telemetria.

O legado permanece disponível apenas por solicitação explícita e não participa da operação oficial.

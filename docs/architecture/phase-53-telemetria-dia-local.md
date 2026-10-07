# Fase 53 — telemetria pelo dia local

## Objetivo

Corrigir o contrato temporal da telemetria financeira: os agregados apresentados como "do dia" devem considerar o dia-calendário no timezone configurado pelo usuário, e não uma janela fixa de 48 horas.

## Contrato

- O ledger `bot4x_execution_intents` continua sendo a única fonte financeira oficial.
- PnL realizado continua restrito a execuções `completed` de `SELL` com `realizedPnl` verificado.
- `today.trades`, `wins`, `losses`, `pnl`, `submitted`, `pending` e `failed` consideram somente execuções do dia local configurado.
- O timezone vem de `profiles.timezone`, com `UTC` como valor padrão.
- A janela de até 48 horas continua disponível internamente para reconciliação e casamento FIFO; ela não é apresentada como "hoje".
- Nenhum PnL sintético é criado.
- Nenhuma ordem Binance é enviada, cancelada ou modificada.
- Credenciais, saldo e autorização REAL não são alterados.

## Validação

Testes unitários cobrem:
1. PnL somente de SELL concluído com valor realizado verificável.
2. Exclusão de execuções de outro dia conforme o timezone configurado.

A Fase 53 deve ser integrada em `main` somente após `validate`, `audit` e os checks `gitleaks` obrigatórios estarem verdes.

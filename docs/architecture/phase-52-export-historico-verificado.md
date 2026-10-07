# Fase 52 — exportação do histórico verificado

## Objetivo

Alinhar a exportação CSV ao contrato estabelecido nas Fases 49–51: o histórico operacional padrão deve usar exclusivamente o ledger de execuções verificadas.

## Contrato

- `/api/bot4x/executions/export` usa o ledger `bot4x_execution_intents` por padrão.
- `source=legacy` é a única forma explícita de exportar `bot4x_trades`.
- O export verificado pagina internamente em blocos de até 100 registros e limita a 5.000 linhas.
- Campos sem evidência no ledger verificado, como stop, alvo e alavancagem histórica, permanecem vazios.
- PnL permanece vazio quando não existe `realizedPnl` verificado; nenhum zero sintético é criado.
- Estados `pending`, `submitted`, `completed` e `failed` permanecem representados pelo ledger.
- A alteração não envia, cancela ou modifica ordens Binance.
- Credenciais, saldo e autorização REAL não são alterados.

## Validação

Teste unitário garante que:
1. o caminho padrão consulta `bot4x_execution_intents`;
2. o CSV não inventa PnL para campos indisponíveis;
3. `bot4x_trades` só é consultado com `source=legacy` explícito.

A Fase 52 deve ser integrada em `main` somente após `validate`, `audit` e os checks `gitleaks` obrigatórios estarem verdes.
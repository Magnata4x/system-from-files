# Fase 51 — paginação completa do histórico verificado

## Objetivo

Garantir que o histórico operacional padrão respeite seu limite público sem truncamento silencioso.

## Contrato

- O histórico verificado padrão pode retornar até 500 registros.
- A consulta interna continua limitada a 100 registros por página.
- O histórico simples percorre todas as páginas necessárias até o limite solicitado.
- Registros são provenientes exclusivamente de `bot4x_execution_intents`.
- Nenhum PnL, status ou execução é sintetizado.
- DEMO/REAL e os gates de execução não são alterados.
- `source=legacy` permanece explicitamente separado do histórico verificado.

## Escopo

A Fase 51 corrige somente a paginação do histórico verificado e adiciona testes do cálculo dos offsets. Não altera submissão de ordens, reconciliação, credenciais Binance ou habilitação REAL.

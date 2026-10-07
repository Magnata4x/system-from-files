# Fase 43 — Engine com dados de mercado reais

## Objetivo

Garantir que o Engine operacional derive sinais somente de dados reais e completos fornecidos pela camada única de Market Data da Binance.

## Contrato

- O Engine continua usando `market.server.ts` como única fonte de candles/regime.
- A geração de sinais exige pelo menos 100 candles válidos.
- Preço final, timestamp e volatilidade precisam ser válidos.
- Dados insuficientes ou inválidos são rejeitados; não são substituídos por RSI neutro, ATR zero ou outro valor sintético.
- DEMO e REAL continuam compartilhando o mesmo Engine e o mesmo fluxo de Market Data.
- A Fase 43 não envia ordens, não altera credenciais e não autoriza execução REAL.

## Testes

Cobertura adicionada para série completa, dados insuficientes, preço inválido e ausência de volatilidade observável.

Fluxo protegido:

Binance real → Market Data → Engine → Signal

A execução permanece fora do escopo e continua bloqueada pelos gates existentes.

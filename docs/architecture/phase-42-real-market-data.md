# Fase 42 — Dados de Mercado Reais

## Objetivo

Conectar o contrato DEMO/REAL da Fase 41 ao fluxo efetivo de dados de mercado sem criar uma segunda pipeline por modo.

## Implementação

- O Engine continua consumindo `src/lib/server/market.server.ts` como fonte única de dados públicos da Binance.
- Tickers e candles são obtidos exclusivamente da API pública da Binance.
- Payloads incompletos, ausentes ou numericamente inválidos são rejeitados.
- Valores `0`, `NaN` ou campos ausentes não são usados como fallback para representar mercado.
- Falhas HTTP da Binance propagam erro para que a camada superior possa marcar o dado como indisponível/stale.
- O cache existente apenas reutiliza uma resposta que já foi validada; não cria dados.
- O fluxo é o mesmo para DEMO e REAL porque dados de mercado são leitura pública e independem do ambiente de execução.

## Limites de segurança

- Nenhuma ordem Binance é enviada nesta fase.
- Nenhuma credencial é alterada.
- Nenhum saldo é alterado.
- O gate de execução REAL da Fase 41 continua fechado.
- Não existe geração de ordem sintética para DEMO.

## Fluxo validado

`Binance pública → Market Server → Engine → sinais/regime`

Em falha ou payload inválido, o fluxo não substitui o dado por exemplo/mock/fallback.
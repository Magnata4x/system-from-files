# Fase 44 — Signal com contrato operacional real

## Objetivo

Garantir que o Signal publicado pelo Engine represente somente uma decisão operacional derivada de dados reais e válidos do mercado.

## Contrato

- `/api/signals` continua consumindo exclusivamente `generateSignals()` do Engine.
- Todo sinal precisa ter scores e indicadores finitos e dentro dos intervalos permitidos.
- Entrada, stop e alvos precisam ser preços positivos e coerentes com BUY/SELL.
- O timestamp precisa ser válido.
- A origem operacional precisa ser Binance.
- Sinais inválidos são rejeitados antes de serem retornados pelo Engine.
- Nenhum valor sintético é criado para tornar um sinal válido.

## Segurança

- Nenhuma ordem Binance é enviada.
- Nenhuma credencial ou saldo é alterado.
- Nenhum desbloqueio de REAL ocorre.
- DEMO e REAL continuam compartilhando Market Data → Engine → Signal.

## Testes

Cobertura para sinal válido, preço inválido, score fora do intervalo, timestamp inválido, níveis incompatíveis e exchange inválida.

Fluxo protegido:

Binance real → Market Data → Engine → Signal → API de sinais
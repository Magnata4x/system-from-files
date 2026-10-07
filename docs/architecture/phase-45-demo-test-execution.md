# Fase 45 — DEMO no Binance Spot Testnet

## Objetivo

Fechar a primeira ligação do contrato global DEMO/REAL ao ambiente de execução da Binance sem liberar REAL.

## Contrato

- DEMO -> TEST no contrato interno.
- DEMO -> Binance Spot Testnet.
- REAL -> PRODUCTION no contrato interno, mas continua sem autorização de execução.
- O executor DEMO rejeita qualquer configuração diferente de testnet.
- A chave usada para DEMO deve ser válida/verificada no ambiente Testnet configurado.

## Segurança

Esta fase não:
- executa nenhuma ordem durante testes;
- altera credenciais;
- altera saldo;
- habilita REAL;
- conecta o Orchestrator a submissão automática;
- cria ordens sintéticas.

A confirmação explícita e a idempotência do executor DEMO permanecem obrigatórias.

## Testes

O contrato testa:
1. DEMO mapeia para Testnet;
2. REAL mapeia para Production;
3. REAL continua sem autorização;
4. contexto DEMO incompatível com Production é rejeitado.

## Estado

Fluxo preparado:

Mercado real -> Engine -> Signal -> Bot4x -> execução DEMO autorizada -> Binance Spot Testnet

O caminho REAL permanece bloqueado para fases posteriores.

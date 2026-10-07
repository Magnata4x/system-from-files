# Fase 41 — Contrato global DEMO/REAL

## Objetivo

Estabelecer um único contrato de ambiente para toda a plataforma antes de conectar o modo DEMO ao executor de teste da Binance.

A regra arquitetural é:

- **DEMO = pipeline operacional real + ambiente TEST**
- **REAL = pipeline operacional real + ambiente PRODUCTION**
- dados de mercado permanecem reais nos dois modos;
- a diferença de modo não cria um segundo Engine, Signal, DNA, Bot4x ou Risk;
- a autorização para submissão REAL continua fechada nesta fase.

## Contrato

| Modo | Dados de mercado | Pipeline | Ambiente de execução |
| --- | --- | --- | --- |
| DEMO | REAL | comum | TEST |
| REAL | REAL | comum | PRODUCTION |

O código deve tratar `mode` e `environment` como dimensões relacionadas, mas não intercambiáveis.

A função `environmentForMode()` é a única regra central de mapeamento:

- `DEMO -> TEST`
- `REAL -> PRODUCTION`

`assertExecutionContext()` rejeita combinações incompatíveis.

## Limite desta fase

A Fase 41 **não**:

- envia ordem para Binance;
- escolhe ou altera endpoint da Binance;
- altera credenciais;
- ativa executor REAL;
- cria ordens sintéticas;
- converte o DEMO atual em execução TEST.

A ligação do executor ao ambiente TEST será feita em fase posterior, depois que o contrato global estiver aprovado.

## Testes de execução

A suíte `execution-environment.test.ts` comprova:

1. DEMO sempre resolve para TEST.
2. REAL sempre resolve para PRODUCTION.
3. combinações cruzadas são rejeitadas.
4. `PRODUCTION` é reconhecido como ambiente REAL sem conceder autorização.
5. a autorização de submissão REAL permanece `false`.

## Critério de aprovação

A Fase 41 só pode ser considerada concluída quando:

- testes unitários verdes;
- TypeScript sem erros;
- build verde;
- CI `validate`, `audit`, `gitleaks` e `migrations-check` verdes;
- nenhuma ordem Binance enviada durante a fase;
- alteração incorporada à `main` via squash merge;
- SHA final confirmado no Lovable.

`DEMO -> TEST` é um contrato arquitetural desta fase, não uma autorização para executar ordens.
`REAL -> PRODUCTION` identifica o destino futuro, mas continua bloqueado por autorização.

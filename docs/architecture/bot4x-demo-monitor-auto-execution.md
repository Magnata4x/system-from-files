# Bot4x DEMO — Monitor e autoexecução

## Contrato

- DEMO usa mercado real e executor exclusivamente Binance Spot Testnet.
- O Monitor chama `GET /api/bot4x/cycle` em DEMO e REAL.
- A autoexecução DEMO só é habilitada quando a variável de ambiente do servidor `BOT4X_DEMO_AUTO_EXECUTION=true` estiver explicitamente configurada.
- Ausência da variável, valor diferente de `true`, ou outro par que não seja `BTCUSDT` mantém o ciclo em observação/candidato sem submissão.
- REAL permanece bloqueado: o Orchestrator nunca encaminha REAL ao executor DEMO e o gate Production continua fechado.

## Deploy

A configuração `BOT4X_DEMO_AUTO_EXECUTION=true` deve ser definida explicitamente no ambiente de servidor destinado à operação DEMO. Não deve ser inferida do modo da interface nem de valores persistidos no navegador.

## Fluxo

Mercado real → Engine → Signal → Bot4x → Monitor/ciclo → Risk → Execution Intent → Binance Spot Testnet → Reconciliation.

O caminho REAL permanece:

Mercado real → Engine → Signal → Bot4x → Risk → Execution Intent → gate REAL fechado.

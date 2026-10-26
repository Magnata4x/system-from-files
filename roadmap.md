
## Etapa 7 (em curso)
- [x] Copiloto com backend interno (IA Lovable) + estados de carregamento
- [x] Marketplace com catálogo, filtros e histórico no banco interno
- [x] Tela de operações detalhada no DNA (entrada/SL/TP/resultado/data)
- [ ] Binance: chaves reais conectadas pelo usuário + modo REAL
- [x] Manipulation ao vivo via websocket público da Binance
- [x] Sentiment com dados reais de mercado e detalhe por ativo

## Refinamento geral
- [x] Capital abaixo de US$ 100 usa 100% em uma única operação; Allocation % fica indisponível
- [x] Alertas com preferências e feed persistidos
- [x] Copy Trading com follows persistidos
- [x] Perfil com dados e foto persistidos
- [x] Configurações com aba preservada na URL
- [x] Admin com dados internos, auditoria e navegação padrão
- [ ] Validar operação REAL e CSV com as chaves Binance do usuário

- [ ] Usuário envia manualmente ordem REAL de compra BTC/USDT de US$ 6; depois validar histórico e CSV

## Modo REAL global
- [ ] Unificar o modo REAL entre todos os módulos de leitura e o Bot4x
- [ ] Exibir saldo USDT real da Binance no Bot4x

## Refinamento de todos os módulos
- [ ] Auditar telas, dados, navegação e estados de erro/vazio
- [ ] Corrigir primeiro os fluxos críticos de modo REAL, saldo e execução segura
- [ ] Refinar os módulos por prioridade e validar em desktop e celular

## Integração Marketaux
- [ ] Cadastrar `MARKETAUX_API_TOKEN` exclusivamente nos Secrets do projeto
- [ ] Consumir notícias reais do Marketaux no Dashboard com cache server-side de 5 minutos
- [ ] Validar disponibilidade da credencial no runtime, tipos e build sem expor o token

## DEMO no Binance Spot Testnet
- [x] Migration de ambiente das credenciais aplicada (coluna `environment` em exchange_credentials)
- [x] Secrets do servidor configurados: BINANCE_TRADING_ENV=testnet e BOT4X_DEMO_AUTO_EXECUTION=true
- [x] Simulador local DEMO removido do store; DEMO e REAL leem somente o backend operacional e o ledger verificado
- [x] Monitor validado no navegador: ciclo DEMO·TESTNET com mercado real, sem operações fictícias
- [ ] Usuário cadastra as chaves Testnet em Configurações → API Keys (a linha antiga ficou no ambiente "demo") para liberar os envios DEMO

## Auditoria 88608717 — correções aplicadas
- [x] testExchangeCredentials filtra por ambiente (revalidação não mistura demo/testnet/production)
- [x] Modo REAL só destrava com credencial de produção verificada (?environment=production); testnet não libera mais o rótulo REAL
- [x] Timeout de 10s nas chamadas assinadas à Binance e deduplicação binanceSigned/binanceSignedRequest
- [x] Ledger distingue ordem automática do orquestrador (auto-demo-order) da manual (manual-demo-order)
- [x] package-lock.json sincronizado com @lovable.dev/vite-tanstack-config 2.26.5 (npm ci no CI)
- [ ] Executor genérico com saídas SL/TP, PnL e filtros LOT_SIZE/MIN_NOTIONAL (fase posterior)
- [ ] Gatilho do ciclo via POST com agendamento no servidor (hoje roda via GET com o Monitor aberto)

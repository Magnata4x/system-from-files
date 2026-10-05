
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

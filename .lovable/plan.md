# Integração real do Marketaux

## Objetivo
Conectar o Dashboard ao Marketaux usando exclusivamente o segredo server-side `MARKETAUX_API_TOKEN`, mantendo a arquitetura e o fluxo GitHub/main atuais.

## Implementação
- Estender o serviço de sentimento existente para consultar `https://api.marketaux.com/v1/news/all` no servidor e reutilizar o cache compartilhado por 5 minutos.
- Retornar uma área de notícias separada da leitura de preço/momentum, com origem Marketaux, status, quantidade, score apenas quando calculável a partir da resposta real e artigos reais.
- Manter `unavailable` quando o segredo não existir, a resposta falhar ou não for válida; não criar mocks, números sintéticos ou fallback fictício.
- Estender o contrato e o hook já usados por `/api/sentiment/overview`, sem criar outro backend ou alterar banco, autenticação, migrations ou RLS.
- Mostrar o resumo e os artigos do Marketaux no card de sentimento do Dashboard, com estados de carregamento, indisponível e vazio.

## Secret e validação
- Verificar os secrets existentes antes de cadastrar `MARKETAUX_API_TOKEN`.
- O token não aparece no histórico acessível desta conversa; portanto, se ele não estiver já cadastrado, a configuração final será feita pelo usuário em **Project Settings → Secrets**, com o nome exato `MARKETAUX_API_TOKEN`.
- Validar tipos/testes relevantes, build e disponibilidade server-side sem revelar o valor do token.

## Limites
- Nenhuma alteração no fluxo GitHub/main ou no histórico existente.
- Nenhuma mudança não relacionada e nenhuma ordem financeira.

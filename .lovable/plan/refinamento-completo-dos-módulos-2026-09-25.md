# Refinamento completo dos módulos

## Objetivo
Uniformizar toda a plataforma, corrigir fluxos incompletos e garantir que cada módulo use dados reais com estados claros, mantendo o modo REAL seguro e consistente.

## Etapa 1 — Núcleo operacional
- Finalizar o modo `DEMO`/`REAL` compartilhado entre Bot4x, Signals, Manipulation, Sentiment, DNA, Dashboard e Copiloto.
- Exibir no Bot4x o saldo Spot disponível em USDT, consultado no servidor, com horário da última atualização e tratamento de indisponibilidade.
- Corrigir as permissões pendentes da fila de intenções e manter confirmação explícita antes de qualquer ordem financeira.
- Unificar o estado das leituras: recebida, bloqueada, aguardando confirmação ou processada.

## Etapa 2 — Dados e fluxos de cada módulo
- Dashboard: remover métricas simuladas onde já existirem fontes reais e alinhar atalhos, alertas e indicadores.
- Signals: revisar filtros, detalhes, atualização ao vivo e encaminhamento seguro de candidatos ao Bot4x.
- Bot4x e Calibrador: revisar configuração, capital, risco, monitor, histórico, execuções e exportação CSV.
- Manipulation e Sentiment: consolidar leituras ao vivo, estados de conexão e contexto entregue ao motor central.
- DNA e Copiloto: garantir que análises usem histórico real e reflitam o modo efetivo sem gerar ordens isoladas.
- Alerts, Copy Trading, Marketplace, Perfil, Configurações, Pricing, API e Admin: revisar persistência, ações, permissões e estados vazios/erro.

## Etapa 3 — Experiência consistente
- Padronizar navegação, cabeçalhos, idioma, carregamento, erro, vazio e atualização em todas as telas.
- Corrigir uso em celular e desktop, evitando cortes, sobreposições e controles inacessíveis.
- Completar os metadados próprios de cada página e substituir textos provisórios visíveis.
- Manter o sistema visual existente, reduzindo cores e estilos avulsos fora dos padrões globais.

## Validação
- Testar autenticação, navegação, recarga e persistência do modo em todas as áreas relevantes.
- Validar dados reais, falhas de rede, sessão expirada, ausência de histórico e exchange desconectada.
- Verificar telas principais em desktop e celular.
- Executar testes direcionados e confirmar que a versão final inicia sem erros.
- Não enviar ordens reais durante testes automatizados; o envio financeiro permanece uma ação explícita do usuário.

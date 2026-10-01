# Continuação do refinamento completo

## Objetivo
Concluir primeiro o núcleo operacional compartilhado e, em seguida, refinar cada módulo com dados reais, estados claros e experiência consistente, sem disparar ordens financeiras automaticamente.

## Etapa 1 — Núcleo REAL e saldo Binance
- Exibir no Bot4x o saldo Spot disponível em USDT, consultado somente no servidor, com horário da última atualização, atualização periódica e estado de indisponibilidade.
- Manter `DEMO`/`REAL` sincronizado pela configuração da conta em Bot4x, Signals, Manipulation, Sentiment, Dashboard, DNA e Copiloto.
- Corrigir as permissões da fila de intenções para permitir somente a criação, pelo próprio usuário, de itens `pending_confirmation`; confirmação, processamento, alteração e exclusão continuam bloqueados.
- Criar o fluxo de candidatos aprovados até a fila, aplicando score, risco de manipulação, par permitido, capital, duplicidade, limite de operações e circuit breakers.
- Exibir os estados `recebida`, `bloqueada`, `aguardando confirmação` e `processada` sem adicionar envio automático de ordens à Binance.

## Etapa 2 — Dados e fluxos dos módulos
- Dashboard: substituir dados simulados onde já houver fonte real e revisar indicadores, alertas e atalhos.
- Signals: revisar filtros, detalhes, atualização ao vivo e encaminhamento seguro ao motor central.
- Bot4x e Calibrador: revisar capital, risco, monitor, histórico, intenções, execuções e exportação CSV.
- Manipulation e Sentiment: consolidar leituras ao vivo, conexão e contribuição ao contexto central.
- DNA e Copiloto: usar histórico real, refletir o modo efetivo e permanecer somente como análise.
- Alerts, Copy Trading, Marketplace, Perfil, Configurações, Pricing, API e Admin: revisar persistência, ações e estados de carregamento, vazio e erro.

## Etapa 3 — Consistência da experiência
- Padronizar navegação, cabeçalhos, idioma, mensagens e indicadores de atualização.
- Corrigir cortes, sobreposições e controles inacessíveis em celular e desktop.
- Completar os metadados próprios de cada página e remover textos provisórios.
- Preservar o sistema visual atual e consolidar estilos avulsos nos padrões existentes.

## Segurança
- Nenhuma leitura envia ordem diretamente; somente cria uma intenção pendente após validação no servidor.
- Chaves, segredo e saldo da Binance nunca chegam ao navegador.
- Falha de leitura crítica bloqueia a intenção.
- A ação financeira continua exigindo confirmação explícita do usuário em uma etapa separada.
- Testes automatizados nunca enviam ordens reais.

## Validação
- Testar persistência do modo ao navegar, recarregar e reabrir a aplicação.
- Confirmar o mesmo modo e saldo em todos os pontos relevantes.
- Testar bloqueios por credencial, saldo, mínimo, duplicidade, score, manipulação e circuit breaker.
- Verificar histórico e CSV sem executar ordem real.
- Validar páginas prioritárias em desktop e celular, testes direcionados e inicialização sem erros.

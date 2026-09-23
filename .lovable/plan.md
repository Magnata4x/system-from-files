# Modo REAL global e leituras integradas

## Objetivo
Fazer o modo de execução ser único para toda a conta. Ao ativar REAL no Bot4x, Signals, Manipulation, Sentiment, DNA, Dashboard e Copiloto passam a identificar esse mesmo estado e encaminhar suas leituras ao motor de decisão do Bot4x.

## Implementação
- Persistir `DEMO`/`REAL` na configuração interna do usuário, além da cópia local, para manter o estado entre páginas, sessões e dispositivos.
- Montar um sincronizador global autenticado que valida as credenciais da Binance e mantém o modo efetivo disponível em toda a aplicação, sem depender da página Bot4x estar aberta.
- Criar um contexto de leitura unificado com sinal, tendência, sentimento, risco de manipulação, preço e horário da atualização.
- Ligar Signals, Manipulation e Sentiment a esse contexto; Dashboard, DNA e Copiloto continuam consumidores de análise e não enviam ordens isoladamente.
- Fazer o Bot4x receber somente candidatos aprovados pelos filtros de score, risco, par permitido, capital, limite de operações e circuit breakers.
- Em REAL, encaminhar candidatos aprovados para uma fila de execução real; em DEMO, manter a simulação atual.
- Exibir um indicador global `REAL`/`DEMO` e o estado da leitura: recebida, bloqueada, aguardando confirmação ou processada.

## Segurança operacional
- Uma leitura nunca envia ordem diretamente: somente o motor central pode criar uma intenção de execução.
- Credenciais verificadas, saldo, mínimo da Binance, precisão do ativo, duplicidade, stop, take profit e circuit breaker serão validados no servidor.
- A etapa de envio financeiro continuará exigindo confirmação explícita do usuário antes da ordem; nenhuma ordem será disparada apenas ao abrir uma tela ou receber um alerta.
- Falha ou ausência de qualquer leitura crítica bloqueia a operação em vez de assumir um valor.

## Validação
- Testar persistência do REAL ao navegar, recarregar e reabrir a aplicação.
- Confirmar que todas as telas mostram o mesmo modo e alimentam o mesmo contexto.
- Testar bloqueios por manipulação, score, saldo mínimo, operação duplicada e circuit breaker.
- Validar o fluxo até a intenção pendente, o registro no histórico e a exportação CSV, sem enviar ordem durante testes automatizados.

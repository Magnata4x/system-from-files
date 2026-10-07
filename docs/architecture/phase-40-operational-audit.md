# Fase 40 — Auditoria operacional final

**Projeto:** AISignalRadar / system-from-files  
**Branch:** feat/fase-40-operational-audit-final  
**Data:** 2026-10-07

## Regra operacional

REAL permanece deliberadamente fechado para envio automático. A cadeia pode observar, validar, registrar e reconciliar dados reais, mas o orquestrador não submete ordens. Qualquer caminho de escrita REAL deve exigir credenciais Binance verificadas, permissão de trade, modo REAL, circuit breaker liberado, limite de capital/saldo, confirmação explícita e idempotência.

## Auditoria ponta a ponta

| Etapa | Fonte real | Autorização/isolamento | Falha | Escrita REAL indevida | Resultado |
|---|---|---|---|---|---|
| Mercado | Binance pública REST (`ticker/24hr`, `klines`) | Backend server-only | erro de fetch propaga para consumidor; sinais descartam par sem candle | não escreve | OK |
| Engine | Mercado Binance + indicadores calculados | server-only | erros por par isolados; não inventa candle | não escreve | OK |
| Signal | `/api/signals` via engine real | `handleApi` + JWT + rate limit | resposta vazia quando nenhum sinal real; sem fallback fictício em produção | não escreve | OK |
| Bot4x | `bot4x_configs` + sinais reais | RLS por `auth.uid()`; servidor aplica config | erro de config/intent bloqueia decisão | não escreve | OK |
| Risk | config + volatilidade Binance | backend autenticado; circuit breaker/profit lock | erro de mercado/config impede avaliação | não escreve | OK |
| Orchestrator | config ativa + sinais + intents ativos | server-only `supabaseAdmin`; rota autenticada | falha de scan de intent não gera candidato executável | explicitamente `executionSubmitted:false` | OK |
| Intent | `bot4x_execution_intents` | RLS: usuário só insere `pending_confirmation` REAL; sem confirmação/processamento | falha de insert retorna erro | não submete | OK |
| Binance | credenciais cifradas; ambiente de produção separado | credencial verificada + `canTrade` + modo REAL + confirmação + risco | erros de submissão são tratados como ambíguos e reconciliados por `clientOrderId` | nenhuma rota HTTP atual expõe o executor REAL | BLOQUEADO POR DESIGN |
| Reconciliation | consultas privadas Binance por `orderId`/`clientOrderId` | credenciais verificadas server-only | somente `-2013` é interpretado como ausência; outros erros preservam o ledger | somente atualiza ledger | OK |
| Ledger | `bot4x_execution_intents` | RLS por usuário; service role para operação interna | falha de persistência gera 503 e impede retry inseguro | não cria ordem | OK |
| Telemetry | ledger verificado + Binance + perfil/timezone | usuário autenticado | erro de reconciliação não é convertido em sucesso | somente reconcilia/atualiza ledger | OK |
| Panel | adapters/API autenticados | dados operacionais no modo REAL | erro é apresentado como indisponível | monitor é observation-only | OK |
| Executions | histórico verificado do ledger | filtrado por usuário | erros propagados à UI | somente leitura | OK |
| History | `bot4x_execution_intents` com fills verificados | filtrado por usuário | dados essenciais ausentes são omitidos | somente leitura | OK |
| Monitor | ciclo do orquestrador | REAL consulta apenas backend autenticado | falha mostrada ao usuário | mostra explicitamente envio=false | OK |

## Endurecimentos aplicados nesta fase

1. O rate limiter deixou de ser uma RPC SECURITY DEFINER executável por usuários autenticados. Agora a chamada é feita exclusivamente pelo cliente Supabase server-only e a função é executável apenas por `service_role`.
2. O cliente administrativo do Supabase não depende mais de `api-auth.server.ts`, eliminando dependência circular para o rate limiter.
3. O advisor de segurança do Supabase foi executado após a alteração. O alerta `authenticated_security_definer_function_executable` desapareceu.
4. O único alerta restante do advisor é **Leaked Password Protection** desabilitado no Auth; trata-se de configuração externa do Supabase Auth, sem relação com o fluxo operacional de ordens.
5. O orquestrador continua explicitamente observation-only. Não foi criada nenhuma rota para disparar a função de envio REAL nesta fase.
6. A reconciliação continua tratando erros de transporte/autorização como estados inconclusivos, evitando transformar falha de comunicação em ordem inexistente.

## Conclusão

A cadeia operacional está segura para **observação e reconciliação de operação REAL**, mas a transição **Intent → envio Binance REAL** continua fechada por design. Isso é intencional e evita que a auditoria final libere uma escrita financeira sem uma etapa explícita de autorização operacional.

Nenhum teste da Fase 40 deve criar, enviar, cancelar ou modificar ordem REAL na Binance.
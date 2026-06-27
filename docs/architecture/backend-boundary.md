# Backend boundary — Supabase × NestJS

> Status: descrição do estado atual (auditoria 2026-06).
> Próximo passo: discutir consolidação após Fases 1 e 2 estarem em prod.

O sistema mantém dois backends paralelos que validam o mesmo JWT emitido
pelo Supabase Auth. Esta nota define qual é a **fonte de verdade** para
cada entidade — referência para futuras decisões de "onde escrevo isso".

## Fontes de verdade

| Entidade                                    | Fonte de verdade                | Observação                                                                                  |
| ------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| Identidade do usuário (auth.users, profile) | Supabase Auth + `profiles`      | RLS por `auth.uid()`. Backend NestJS apenas valida o JWT, nunca grava em `auth.*`.          |
| Preferências de UI (`user_preferences`)     | Supabase                        | Lido/escrito pelos stores Zustand via `user-prefs-db.ts`.                                   |
| Notificações persistentes                   | Supabase (`user_notifications`) | Limpeza por `pg_cron` (30/90 dias).                                                         |
| Configuração do Bot4x (`bot4x_configs`)     | Supabase                        | RLS por user_id. Backend NestJS lê via `bot4x-adapter` quando precisa executar ordens.     |
| Histórico de trades (`bot4x_trades`)        | Supabase                        | Após DB-02, policy de UPDATE existe; upsert em retries é seguro.                            |
| Execução real do Bot4x (modo REAL)          | Backend NestJS                  | Quando `VITE_BOT4X_REAL_ENABLED=true`. O NestJS deve gravar o trade no Supabase ao fechar. |
| Sinais (tabela `signals`)                   | Supabase                        | AI score/reasoning vêm de pipeline externo (ver SEG-03 da auditoria).                       |
| Histórico do Copilot                        | Supabase (`copilot_history`)    | Backend NestJS pode produzir streaming via WS, mas a persistência final é Supabase.         |
| Sessão em tempo real / streams              | Backend NestJS (WebSocket)      | `ws-client.ts` exige `wss://` em produção (já corrigido).                                   |
| Fila de e-mail                              | Supabase (`pgmq` + `pg_cron`)   | Worker em `src/routes/lovable/email/queue/process.ts`.                                      |

## Autenticação entre camadas

1. Cliente browser obtém JWT do Supabase Auth (`@supabase/supabase-js`).
2. Para Supabase: o JWT vai no header `Authorization: Bearer ...` em cada
   request da Data API; RLS aplica como o usuário autenticado.
3. Para o backend NestJS: o mesmo JWT vai no `Authorization` header (anexado
   pelo interceptor em `src/lib/apiClient.ts`). O NestJS é responsável por
   validar a assinatura usando a JWKS pública do Supabase.

## Limitações conhecidas (não resolvidas)

- **Sem transação distribuída.** Se o NestJS fecha uma ordem real mas
  falha ao replicar o trade no Supabase (ou vice-versa), os dois bancos
  divergem. Não há saga/outbox implementada. Compensar manualmente.
- **Observabilidade fragmentada.** Logs do worker Supabase, do edge route
  TanStack e do NestJS vivem em três lugares diferentes. Não há `trace_id`
  propagado por header. Adicionar OpenTelemetry com um cabeçalho
  `x-trace-id` em ambos os lados é o próximo passo natural.
- **Sobrecarga semântica em `bot4x_configs`** (legado): migração ARCH-02
  adicionou colunas com nomes corretos (`sl_pct`, `tp_pct`,
  `allocation_pct`, `total_capital`, `preferred_pairs`, `avoid_pairs`),
  mas as colunas antigas reaproveitadas (`rsi_threshold_low/high`,
  `ai_score_min`, `fomo_limit`, `exchange`) ainda existem para
  compatibilidade. Plano: depreciar em migração futura após confirmar
  que nenhum consumidor externo (BI, suporte) ainda lê delas.

## Recomendação de médio prazo

Avaliar se o backend NestJS pode ser absorvido por:

- `createServerFn` do TanStack Start (lógica RPC server-side, mesmo bundle).
- Edge Functions Supabase (para webhooks externos e jobs de longa duração).

Vantagens: um único deploy, observabilidade unificada, fim das duas
camadas de validação de JWT. Custo: reescrever o motor real do bot e os
streams WS num modelo serverless — não trivial e fora do escopo das
Fases 1/2 desta auditoria.

---

## Outbox Pattern para trades em modo REAL

Em modo REAL, o NestJS fecha a ordem na exchange e em seguida tenta
replicar o trade no Supabase. Se a replicação falhar (rede, RLS, schema
drift), os dados divergem permanentemente e o usuário perde o registro
financeiro.

Para mitigar isso no lado que controlamos (Supabase + cliente), foi
implementado um Outbox Pattern leve:

- Tabela `public.trade_outbox` com colunas `user_id`, `trade_data` (JSONB),
  `status` (`pending` / `processed` / `failed`), `attempts`, `last_error`,
  `processed_at`. Índice parcial em `(status, created_at) WHERE status =
  'pending'` para o worker de reconciliação.
- RLS: o usuário só lê/escreve o próprio outbox (diagnóstico); o
  `service_role` tem acesso total para o worker server-side.
- `saveTradeWithOutbox(userId, trade)` em `src/lib/bot4x-trades-db.ts`:
  1. INSERT no `trade_outbox` como `pending` — fonte de verdade.
  2. Tenta `saveTrade()` direto em `bot4x_trades` como otimização.
  3. Em sucesso, marca a linha do outbox como `processed`.
  4. Em falha, deixa `pending` — um worker server-side reconcilia depois.
- O `useBot4xStore` chama `saveTradeWithOutbox()` no handler do evento
  WebSocket `bot4x:update` tipo `EXECUTION` (apenas modo REAL).

Garantias:

- Nenhum trade real é perdido por falha transitória de write em
  `bot4x_trades` — o registro existe no outbox até ser conciliado.
- Idempotência: `saveTrade` faz UPSERT por `id`; o worker pode
  re-aplicar `pending` sem duplicar.
- Observabilidade: o usuário pode listar o próprio outbox para
  diagnóstico (linhas `pending`/`failed` indicam problemas de replicação).

---

## Transporte do JWT no WebSocket

O cliente WebSocket (`src/adapters/backend/ws-client.ts`) envia o JWT do
Supabase no **subprotocolo** do handshake, não no corpo das mensagens:

```ts
ws = new WebSocket(url, [`bearer.${token}`]);
```

Motivação: a abordagem anterior (`ws.send({ type: 'auth', token })` no
`onopen`) colocava o token no payload do primeiro frame WS, que costuma
ser capturado por proxies reversos, APMs e ferramentas de tracing que
fazem dump de frames. O subprotocolo trafega no header
`Sec-WebSocket-Protocol` do handshake HTTP/S — coberto por TLS e
geralmente excluído dos dumps de payload.

### Contrato com o backend NestJS

O gateway deve extrair o token do header `sec-websocket-protocol` no
`handleConnection`:

```ts
handleConnection(client: WebSocket, request: IncomingMessage) {
  const protocols = request.headers['sec-websocket-protocol'] || '';
  const bearer = protocols.split(',').map(p => p.trim()).find(p => p.startsWith('bearer.'));
  const token = bearer?.slice('bearer.'.length);
  // validar token...
  // IMPORTANTE: o servidor deve ecoar o subprotocolo aceito no handshake
  // (Sec-WebSocket-Protocol response header), senão o cliente fecha a conexão.
}
```

### Fallback

Caso o backend ainda não suporte o subprotocolo, a alternativa segura é
passar o token como query parameter (`?token=...`). Não é o caminho
escolhido porque URLs podem aparecer em access logs.

### Logging

`ws.onmessage` **nunca** loga `e.data` cru — apenas decodifica e dispatcha
para handlers tipados. Qualquer log futuro nesse handler deve omitir
campos sensíveis (`token`, `apiKey`, `secret`).

---

## Credenciais para endpoints chamados por pg_cron

**Regra absoluta:** `SUPABASE_SERVICE_ROLE_KEY` nunca trafega em headers de
requests HTTP — `Authorization: Bearer <service-role-key>`,
`apikey: <service-role-key>`, query string, etc. estão proibidos.

Motivação: o service role key concede acesso irrestrito ao banco, ignora
RLS, e expô-lo em qualquer hop HTTP (proxy reverso, WAF, APM, access log
do edge) cria janela permanente para credential leak. Use-o apenas
server-side para instanciar o cliente Supabase (`createClient(url, serviceKey)`).

### Padrão aplicado

Para cada endpoint server-side que precisa ser chamado por `pg_cron` ou
por outro caller server-to-server, criar um segredo dedicado:

- Nome `*_CRON_SECRET` (ex: `EMAIL_QUEUE_CRON_SECRET`).
- Valor: 256+ bits aleatórios (`openssl rand -hex 32`).
- Armazenado como secret runtime do projeto (não vai pro repo).
- Comparação no handler com `timingSafeEqual` (tempo constante).
- Rotação isolada: girar essa credencial não afeta o resto da plataforma.

### Email queue (referência)

`src/routes/lovable/email/queue/process.ts` autentica chamadas do pg_cron
contra `EMAIL_QUEUE_CRON_SECRET`. O `SUPABASE_SERVICE_ROLE_KEY` é lido no
mesmo handler apenas para construir o cliente Supabase server-side — ele
não é comparado contra o token recebido.

Ao agendar a chamada via `pg_cron`:

```sql
SELECT cron.schedule(
  'process-email-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://<project>--<id>.lovable.app/lovable/email/queue/process',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.email_queue_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

O valor `app.email_queue_cron_secret` deve ser provisionado via
`ALTER DATABASE ... SET` ou um GUC equivalente — **nunca** colado como
literal na definição do job (o `cron.job.command` é texto plano legível
para qualquer admin do banco).

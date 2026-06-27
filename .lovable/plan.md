## Escopo aprovado

Fase 1 (P0) + Fase 2 (P1), SEG-01 com correção definitiva (SSR cookies), e remoção de `main.py`/`monitor_volume.py`.

## Ordem de execução

### Bloco A — Correções rápidas e isoladas (baixo risco)

1. **SEG-02 / PERF-02 / PERF-03** — `src/lib/apiClient.ts`: bloquear fallback `localhost` em produção, adicionar `timeout: 15_000`, remover `withCredentials: true`.
2. **ARCH-01** — `src/lib/bot4x-store.ts` + `src/components/bot4x/page-header.tsx` + seletor de modo: exportar `REAL_MODE_ENABLED` e `getEffectiveMode()`; UI usa modo efetivo; opção "REAL" desabilitada quando flag off.
3. **ARCH-04** — `.env.example`: trocar `VITE_BOT=false` por `VITE_BOT4X_REAL_ENABLED=false` com comentário claro.
4. **SEG-04** — remover `.env` do pacote/repo, adicionar workflow `gitleaks` em `.github/workflows/secret-scan.yml`. (Rotação de chave é ação manual do usuário fora do repo — vou listar no fim.)
5. **DEVOPS-01** — `rm main.py monitor_volume.py`.
6. **DB-01** — remover migração duplicada `20260524135926_email_infra.sql`, adicionar `scripts/check-duplicate-migrations.sh` + workflow.

### Bloco B — Banco e dados financeiros

7. **DB-02** — migração nova: adicionar policies `FOR UPDATE` em `bot4x_trades` e `calibrator_runs`. Atualizar `src/lib/bot4x-trades-db.ts` para re-throw em `saveTrade` e callers (`bot4x-store.ts`) capturarem e empurrarem notificação visível via `notifications-store`.
8. **ARCH-02** — migração de schema Bot4x: adicionar colunas `sl_pct`, `tp_pct`, `allocation_pct`, `total_capital`, `preferred_pairs`, `avoid_pairs` em `bot4x_configs`; backfill a partir das colunas reaproveitadas. Atualizar `src/lib/bot4x-config-db.ts` para ler/escrever das novas colunas (mantendo fallback de leitura das antigas por 1 ciclo). Colunas antigas ficam para depreciação futura — não dropadas agora.

### Bloco C — SEG-01 (SSR cookies) — maior risco

9. `bun add @supabase/ssr`.
10. Criar `src/integrations/supabase/server-session.ts` com `getServerSupabase()` (cookies via `getRequest()` + `setCookie`).
11. Modificar `src/integrations/supabase/client.ts` para usar cookies em vez de `localStorage` (browser usa `createBrowserClient` de `@supabase/ssr`). Esse arquivo é marcado "auto-generated" — vou tocar apenas o mínimo necessário e documentar a exceção no commit.
12. Estender `createRootRouteWithContext` em `src/routes/__root.tsx` com `auth`, adicionar `beforeLoad` que resolve sessão server-side via `getServerSupabase()` e popula contexto. Aplicar `setCookies` na resposta.
13. `src/routes/_authenticated.tsx`: o `beforeLoad` existente passa a funcionar; remover spinner gigante (sessão já chega resolvida no primeiro render via SSR), manter fallback client-side para refresh.
14. Validar fluxo: login → navegação interna → refresh hard → logout → tentativa de acesso direto a rota protegida sem sessão. Build + typecheck.

### Bloco D — Produto e qualidade

15. **SEG-06** — `src/components/api/keys-management.tsx` + `src/routes/_authenticated/api.tsx`: substituir UI funcional fake por estado "Em breve" com badge, CTA desabilitado e texto explicando que o recurso está em desenvolvimento. Não implementar backend agora (escopo separado).
16. **SEG-03** — já será removido junto com `main.py` no passo 5; nada adicional.
17. **SEG-05** — `src/routes/lovable/email/queue/process.ts`: substituir `!==` por `timingSafeEqual` (helper inline).
18. **QA-01** — `bun add -D vitest @vitest/ui`, adicionar `scripts.test`/`test:watch` em `package.json`, criar `vitest.config.ts`, criar `src/lib/__tests__/engine-scoring.test.ts` e `src/lib/__tests__/bot4x-circuit-breaker.test.ts` com casos básicos do engine de score e do circuit breaker.
19. **ARCH-03** — criar `docs/architecture/backend-boundary.md` documentando: qual sistema é fonte de verdade para cada entidade (perfis/sinais/trades históricos → Supabase; execução real do bot/copiloto → NestJS), padrão de propagação de JWT, ausência de transação distribuída e próximos passos.

### Fora do escopo desta entrega (ações manuais ou fases futuras)

- **QA-02** (endurecer ESLint para `strictTypeChecked`, banir `console.*`): explosão de erros a corrigir; melhor em PR dedicado.
- **PERF-01** (code-splitting widgets globais): escopo separado, mexe em muita coisa de hooks.
- **UX-01**: resolvido como efeito colateral de SEG-01.
- **Rotação manual da anon key Supabase** após SEG-04: instrução no fim, ação do usuário.

## Verificação

- Typecheck (`tsgo`) limpo após cada bloco.
- `bun run build` ao final.
- Testes Vitest passando.
- Smoke manual mental no fluxo de auth após Bloco C.

## Notas técnicas

- O arquivo `src/integrations/supabase/client.ts` é marcado auto-generated, mas a migração para cookies SSR exige tocá-lo. Vou manter o cabeçalho de aviso e documentar a divergência.
- Migrações Supabase: vou usar `supabase--migration` (uma chamada por migração, sequencialmente, aguardando aprovação entre elas).
- `attachSupabaseAuth` continua válido — bearer no header continua sendo a interface server fn ↔ Supabase; o cookie só serve para hidratar a sessão server-side no carregamento da página.

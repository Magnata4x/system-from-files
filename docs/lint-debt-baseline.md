# Lint Debt Baseline (QA-02)

Snapshot inicial após endurecer `eslint.config.js` com:

- `@typescript-eslint/no-unused-vars: warn` (ignora `_`-prefix)
- `@typescript-eslint/no-explicit-any: warn`
- `no-console: warn` (permite `console.error`)

> Optamos por `warn` em vez de `error` para não bloquear CI. A meta é
> reduzir cada categoria incrementalmente — qualquer PR que **aumente**
> a contagem deve ser revisado.

## Como medir

```bash
npm run lint -- --format=json > /tmp/lint.json
node -e "const r=require('/tmp/lint.json');const c={};r.forEach(f=>f.messages.forEach(m=>{c[m.ruleId]=(c[m.ruleId]||0)+1}));console.table(c)"
```

## Baseline esperado (ordem de magnitude)

| Regra | Contagem aproximada |
|---|---|
| `@typescript-eslint/no-explicit-any` | ~37 ocorrências (`: any` / `as any`) |
| `no-console` | ~46 chamadas (`console.log/warn/debug`) |
| `@typescript-eslint/no-unused-vars` | a apurar |

## Substituição de `console.*`

Use `src/lib/logger.ts`:

```ts
import { logger } from "@/lib/logger";
logger.warn("[bot4x] mensagem"); // silenciado em produção
logger.error("[bot4x] falha crítica", err); // sempre emitido
```

Mantenha `console.error` direto apenas em paths já marcados como erro
explícito (a regra `no-console` permite).

## Sobre `strictTypeChecked`

A migração para `tseslint.configs.strictTypeChecked` exige configurar
`parserOptions.project` e tipa todos os imports — gera centenas de
warnings adicionais. Adiar até a dívida de `any` cair abaixo de 10
ocorrências.

import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { reconcileUserExecutionIntents } from '@/lib/server/execution-reconciliation.server'
import { listExecutions, listExecutionsPaged, listVerifiedHistory, listVerifiedExecutionsPaged } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/bot4x/executions')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, (user) => reconcileUserExecutionIntents(user.supabase, user.userId)),
      GET: async ({ request }) =>
        handleApi(request, (user) => {
          const url = new URL(request.url)
          const p = url.searchParams
          if (p.get('source') === 'verified') return listVerifiedHistory(user.supabase, user.userId, p.get('limit') ? Number(p.get('limit')) : undefined)
          // Histórico operacional padrão: somente ledger verificado.
          if (!p.has('limit') && !p.has('offset') && !p.has('result') && !p.has('pair') && !p.has('side') && !p.has('profile') && !p.has('from') && !p.has('to')) {
            return listVerifiedHistory(user.supabase, user.userId)
          }
          if (p.get('source') === 'legacy') return listExecutions(user.supabase, user.userId, p.get('limit') ? Number(p.get('limit')) : undefined)
          return listVerifiedExecutionsPaged(user.supabase, user.userId, {
            limit: p.get('limit') ? Number(p.get('limit')) : undefined,
            offset: p.get('offset') ? Number(p.get('offset')) : undefined,
            result: p.get('result') ?? undefined,
            pair: p.get('pair') ?? undefined,
            side: p.get('side') ?? undefined,
            profile: p.get('profile') ?? undefined,
            from: p.get('from') ?? undefined,
            to: p.get('to') ?? undefined,
          })
        }),
    },
  },
})
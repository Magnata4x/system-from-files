import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { listExecutions, listExecutionsPaged } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/bot4x/executions')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => {
          const url = new URL(request.url)
          const p = url.searchParams
          // Sem parâmetros de paginação mantemos o formato legado (array).
          if (!p.has('limit') && !p.has('offset') && !p.has('result') && !p.has('pair') && !p.has('side')) {
            return listExecutions(user.supabase, user.userId)
          }
          return listExecutionsPaged(user.supabase, user.userId, {
            limit: p.get('limit') ? Number(p.get('limit')) : undefined,
            offset: p.get('offset') ? Number(p.get('offset')) : undefined,
            result: p.get('result') ?? undefined,
            pair: p.get('pair') ?? undefined,
            side: p.get('side') ?? undefined,
          })
        }),
    },
  },
})
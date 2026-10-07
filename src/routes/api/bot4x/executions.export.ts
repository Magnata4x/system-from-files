import { createFileRoute } from '@tanstack/react-router'
import { ApiError, jsonResponse, requireApiUser } from '@/lib/server/api-auth.server'
import { exportExecutionsCsv } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/bot4x/executions/export')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireApiUser(request)
          const p = new URL(request.url).searchParams
          const csv = await exportExecutionsCsv(user.supabase, user.userId, {
            source: p.get('source') === 'legacy' ? 'legacy' : 'verified',
            result: p.get('result') ?? undefined,
            pair: p.get('pair') ?? undefined,
            side: p.get('side') ?? undefined,
            profile: p.get('profile') ?? undefined,
            from: p.get('from') ?? undefined,
            to: p.get('to') ?? undefined,
          })
          const stamp = new Date().toISOString().slice(0, 10)
          return new Response(csv, {
            status: 200,
            headers: {
              'content-type': 'text/csv; charset=utf-8',
              'content-disposition': `attachment; filename="bot4x-execucoes-${stamp}.csv"`,
              'cache-control': 'no-store',
            },
          })
        } catch (err) {
          const status = err instanceof ApiError ? err.status : 500
          const message = err instanceof Error ? err.message : 'Erro interno'
          return jsonResponse({ statusCode: status, message }, status)
        }
      },
    },
  },
})

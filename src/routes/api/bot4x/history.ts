import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { listVerifiedHistory } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/bot4x/history')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => {
          const limit = new URL(request.url).searchParams.get('limit') ?? undefined
          return listVerifiedHistory(user.supabase, user.userId, limit ? Number(limit) : undefined)
        }),
    },
  },
})

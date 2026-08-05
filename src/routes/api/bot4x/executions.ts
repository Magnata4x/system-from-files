import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { listExecutions } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/bot4x/executions')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => listExecutions(user.supabase, user.userId)),
    },
  },
})
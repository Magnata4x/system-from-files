import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { reconcileUserExecutionIntents } from '@/lib/server/execution-reconciliation.server'

export const Route = createFileRoute('/api/bot4x/executions/reconcile')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, (user) => reconcileUserExecutionIntents(user.supabase, user.userId)),
    },
  },
})

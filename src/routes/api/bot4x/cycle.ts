import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { runBot4xOrchestratorCycle } from '@/lib/server/bot4x-orchestrator.server'

export const Route = createFileRoute('/api/bot4x/cycle')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => runBot4xOrchestratorCycle(user.userId)),
    },
  },
})

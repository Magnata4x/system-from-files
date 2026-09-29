import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { getTelemetry } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/bot4x/telemetry')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => getTelemetry(user.supabase, user.userId)),
    },
  },
})

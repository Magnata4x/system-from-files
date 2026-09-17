import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { getAlertSettings, saveAlertSettings } from '@/lib/server/alerts.server'

export const Route = createFileRoute('/api/alerts/settings')({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, (user) => getAlertSettings(user)),
      PUT: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = await request.json().catch(() => ({}))
          return saveAlertSettings(user, body)
        }),
    },
  },
})

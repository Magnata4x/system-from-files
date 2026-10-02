import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { getUsdtBalance } from '@/lib/server/exchange.server'

export const Route = createFileRoute('/api/bot4x/balance')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => getUsdtBalance(user.supabase, user.userId)),
    },
  },
})
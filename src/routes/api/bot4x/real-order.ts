import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { executeAuthorizedSixDollarBtcOrder } from '@/lib/server/order.server'

export const Route = createFileRoute('/api/bot4x/real-order')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as {
            side?: 'BUY' | 'SELL'
            confirmed?: boolean
          }
          if (body.side !== 'BUY' && body.side !== 'SELL') {
            throw new Error('Lado da ordem deve ser BUY ou SELL.')
          }
          return executeAuthorizedSixDollarBtcOrder(user.supabase, user.userId, {
            side: body.side,
            confirmed: body.confirmed === true,
          })
        }),
    },
  },
})

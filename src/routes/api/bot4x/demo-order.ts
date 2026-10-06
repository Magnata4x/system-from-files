import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'
import { executeAuthorizedSixDollarBtcDemoOrder } from '@/lib/server/order.server'

export const Route = createFileRoute('/api/bot4x/demo-order')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as {
            side?: 'BUY' | 'SELL'
            confirmed?: boolean
          }
          if (body.side !== 'BUY' && body.side !== 'SELL') {
            throw new ApiError('Lado da ordem deve ser BUY ou SELL.', 400)
          }
          return executeAuthorizedSixDollarBtcDemoOrder(user.supabase, user.userId, {
            side: body.side,
            confirmed: body.confirmed === true,
          })
        }),
    },
  },
})

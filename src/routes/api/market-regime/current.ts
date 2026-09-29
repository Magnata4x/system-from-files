import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { getMarketRegime } from '@/lib/server/market.server'

export const Route = createFileRoute('/api/market-regime/current')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async () => {
          const pair = new URL(request.url).searchParams.get('pair') ?? 'BTC/USDT'
          return getMarketRegime(pair)
        }),
    },
  },
})
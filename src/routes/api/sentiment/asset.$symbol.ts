import { createFileRoute } from '@tanstack/react-router'
import { handleApi, ApiError } from '@/lib/server/api-auth.server'
import { getKlines, getTicker } from '@/lib/server/market.server'

export const Route = createFileRoute('/api/sentiment/asset/$symbol')({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, async () => {
          const base = decodeURIComponent(params.symbol).toUpperCase().replace('/USDT', '')
          const pair = `${base}/USDT`
          const ticker = await getTicker(pair)
          if (!ticker) throw new ApiError(`Sem dados para ${pair}`, 404)
          const klines = await getKlines(pair, '1h', 48).catch(() => [])
          return {
            asset: base,
            pair,
            price: ticker.price,
            changePct: ticker.changePct,
            high: ticker.high,
            low: ticker.low,
            quoteVolume: ticker.quoteVolume,
            series: klines.map((k) => ({ t: k.openTime, close: k.close })),
            updatedAt: new Date().toISOString(),
          }
        }),
    },
  },
})

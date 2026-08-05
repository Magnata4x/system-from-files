import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { buildRiskStatus, marketVolatility } from '@/lib/server/engine.server'
import { getOrCreateConfig } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/risk/status')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const [config, volatility] = await Promise.all([
            getOrCreateConfig(user.supabase, user.userId),
            marketVolatility('BTC/USDT'),
          ])
          const exposurePct =
            config.totalCapital > 0 ? (config.activeCapital / config.totalCapital) * 100 : 0
          return buildRiskStatus({
            dailyPnlPct: config.dailyPnl,
            openPositions: config.openSlots,
            exposurePct,
            volatility,
            circuitBreaker: config.circuitBreaker,
          })
        }),
    },
  },
})
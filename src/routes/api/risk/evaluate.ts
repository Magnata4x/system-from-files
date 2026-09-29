import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { buildRiskStatus, marketVolatility } from '@/lib/server/engine.server'
import { getOrCreateConfig } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/risk/evaluate')({
  server: {
    handlers: {
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as {
            pair?: string
            size?: number
          }
          const [config, volatility] = await Promise.all([
            getOrCreateConfig(user.supabase, user.userId),
            marketVolatility(body.pair ?? 'BTC/USDT'),
          ])
          const size = body.size ?? config.totalCapital * (config.allocationPct / 100)
          const exposurePct =
            config.totalCapital > 0
              ? ((config.activeCapital + size) / config.totalCapital) * 100
              : 0
          const status = buildRiskStatus({
            dailyPnlPct: config.dailyPnl,
            openPositions: config.openSlots + 1,
            exposurePct,
            volatility,
            circuitBreaker: config.circuitBreaker,
          })
          const approved = status.level !== 'CRITICAL' && config.circuitBreaker === 'none'
          return {
            ...status,
            approved,
            maxSize: Number((config.totalCapital * (config.allocationPct / 100)).toFixed(2)),
            decision: approved ? 'EXECUTE' : 'BLOCKED',
          }
        }),
    },
  },
})
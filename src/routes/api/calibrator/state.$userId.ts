import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'
import { calibratorState } from '@/lib/server/engine.server'
import { getOrCreateConfig } from '@/lib/server/bot4x.server'

export const Route = createFileRoute('/api/calibrator/state/$userId')({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, async (user) => {
          if (params.userId !== 'me' && params.userId !== user.userId) {
            throw new ApiError('Forbidden', 403)
          }
          const config = await getOrCreateConfig(user.supabase, user.userId)
          const { data: profile } = await user.supabase
            .from('profiles')
            .select('avg_win_rate')
            .eq('id', user.userId)
            .maybeSingle()
          return calibratorState({
            dailyPnlPct: config.dailyPnl,
            winRate: Number(profile?.avg_win_rate ?? 0),
            circuitBreaker: config.circuitBreaker,
            tradesToday: config.totalTradesToday,
          })
        }),
    },
  },
})
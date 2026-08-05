import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'
import { runBacktest } from '@/lib/server/engine.server'

export const Route = createFileRoute('/api/calibrator/run/$userId')({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleApi(request, async (user) => {
          if (params.userId !== 'me' && params.userId !== user.userId) {
            throw new ApiError('Forbidden', 403)
          }
          const body = (await request.json().catch(() => ({}))) as {
            profile?: string
            symbol?: string
            period_days?: number
            initial_balance?: number
            leverage?: number
          }
          const req = {
            profile: body.profile ?? 'conservador',
            symbol: body.symbol ?? 'BTC/USDT',
            period_days: body.period_days ?? 30,
            initial_balance: body.initial_balance ?? 1000,
            leverage: body.leverage ?? 1,
          }
          const result = await runBacktest(req)
          await user.supabase.from('calibrator_runs').insert({
            user_id: user.userId,
            profile: req.profile,
            symbol: req.symbol,
            period_days: req.period_days,
            initial_balance: req.initial_balance,
            leverage: req.leverage,
            trades: result.trades,
            wins: result.wins,
            losses: result.losses,
            win_rate: result.win_rate,
            pnl: result.pnl,
            pnl_pct: result.pnl_pct,
            max_drawdown: result.max_drawdown,
            sharpe: result.sharpe,
          })
          return result
        }),
    },
  },
})
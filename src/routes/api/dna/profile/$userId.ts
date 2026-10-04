import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'

export const Route = createFileRoute('/api/dna/profile/$userId')({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, async (user) => {
          if (params.userId !== 'me' && params.userId !== user.userId) {
            throw new ApiError('Forbidden', 403)
          }
          const { data, error } = await user.supabase
            .from('profiles')
            .select(
              'dna_consistency, dna_discipline, dna_risk_control, dna_timing, dna_emotional_control, avg_win_rate, best_session, worst_session, overtrading_risk, trading_style',
            )
            .eq('id', user.userId)
            .maybeSingle()
          if (error) throw new ApiError(error.message, 500)
          if (!data) return null
          return {
            userId: user.userId,
            consistency: data.dna_consistency ?? undefined,
            discipline: data.dna_discipline ?? undefined,
            riskControl: data.dna_risk_control ?? undefined,
            timing: data.dna_timing ?? undefined,
            emotionalControl: data.dna_emotional_control ?? undefined,
            avgWinRate: data.avg_win_rate ?? undefined,
            bestSession: data.best_session ?? undefined,
            worstSession: data.worst_session ?? undefined,
            overtradingRisk: data.overtrading_risk ?? undefined,
            tradingStyle: (data.trading_style ?? undefined) as
              | 'conservative'
              | 'moderate'
              | 'aggressive' | undefined,
          }
        }),
    },
  },
})
import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'

type DnaProfileResponse = {
  userId: string
  hasProfile: boolean
  consistency: number | null
  discipline: number | null
  riskControl: number | null
  timing: number | null
  emotionalControl: number | null
  avgWinRate: number | null
  bestSession: string | null
  worstSession: string | null
  overtradingRisk: boolean | null
  tradingStyle: 'conservative' | 'moderate' | 'aggressive' | null
}

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

          const values = data
            ? [
                data.dna_consistency,
                data.dna_discipline,
                data.dna_risk_control,
                data.dna_timing,
                data.dna_emotional_control,
                data.avg_win_rate,
              ]
            : []
          const hasProfile = values.some((value) => value !== null && value !== undefined)

          const response: DnaProfileResponse = {
            userId: user.userId,
            hasProfile,
            consistency: data?.dna_consistency ?? null,
            discipline: data?.dna_discipline ?? null,
            riskControl: data?.dna_risk_control ?? null,
            timing: data?.dna_timing ?? null,
            emotionalControl: data?.dna_emotional_control ?? null,
            avgWinRate:
              data?.avg_win_rate === null || data?.avg_win_rate === undefined
                ? null
                : Number(data.avg_win_rate),
            bestSession: data?.best_session ?? null,
            worstSession: data?.worst_session ?? null,
            overtradingRisk: data?.overtrading_risk ?? null,
            tradingStyle: (data?.trading_style ?? null) as DnaProfileResponse['tradingStyle'],
          }

          return response
        }),
    },
  },
})

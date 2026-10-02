import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'
import { getOrCreateConfig } from '@/lib/server/bot4x.server'
import { getExchangeStatus, getUsdtBalance } from '@/lib/server/exchange.server'
import { validateIntentCandidate, type IntentCandidate } from '@/lib/execution-intent'
import type { Json } from '@/integrations/supabase/types'

export const Route = createFileRoute('/api/calibrator/intent/$userId')({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        handleApi(request, async (user) => {
          if (params.userId !== 'me' && params.userId !== user.userId) throw new ApiError('Forbidden', 403)
          const body = (await request.json().catch(() => ({}))) as Partial<IntentCandidate> & {
            signalId?: string
            readings?: Json
          }
          const pair = String(body.pair ?? '').trim().toUpperCase()
          const side = body.side
          if (!pair || (side !== 'BUY' && side !== 'SELL')) throw new ApiError('Candidato inválido.', 400)

          const [config, exchange, balance] = await Promise.all([
            getOrCreateConfig(user.supabase, user.userId),
            getExchangeStatus(user.supabase, user.userId),
            getUsdtBalance(user.supabase, user.userId),
          ])
          const candidate: IntentCandidate = {
            pair,
            side,
            quoteAmount: Number(body.quoteAmount ?? 0),
            score: Number(body.score ?? 0),
            manipulationRisk: body.manipulationRisk ?? 'high',
            signalStatus: body.signalStatus ?? 'invalidated',
          }
          const reason = validateIntentCandidate(candidate, {
            executionMode: config.executionMode,
            verified: exchange.verified,
            availableUsdt: balance.free,
            dailyPnlPct: config.dailyPnl,
            circuitBreaker: config.circuitBreaker,
            profile: config.profile,
            totalTradesToday: config.totalTradesToday,
            maxTradesToday: 10,
            preferredPairs: Array.isArray(config.preferredPairs) ? config.preferredPairs.filter((item): item is string => typeof item === 'string') : [],
            avoidPairs: Array.isArray(config.avoidPairs) ? config.avoidPairs.filter((item): item is string => typeof item === 'string') : [],
          })
          if (reason) throw new ApiError(reason, 409)

          const bucket = Math.floor(Date.now() / 60_000)
          const idempotencyKey = `${body.signalId ?? 'market'}:${pair}:${side}:${bucket}`
          const signalId = body.signalId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.signalId)
            ? body.signalId
            : null
          const { data, error } = await user.supabase
            .from('bot4x_execution_intents')
            .insert({
              user_id: user.userId,
              signal_id: signalId,
              pair,
              side,
              quote_amount: candidate.quoteAmount,
              mode: 'REAL',
              status: 'pending_confirmation',
              readings: body.readings ?? {},
              reason: 'Candidato aprovado; aguardando confirmação explícita.',
              idempotency_key: idempotencyKey,
            })
            .select('*')
            .single()
          if (error?.code === '23505') throw new ApiError('Esta intenção já está aguardando confirmação.', 409)
          if (error) throw new ApiError(error.message, 500)
          return data
        }),
    },
  },
})
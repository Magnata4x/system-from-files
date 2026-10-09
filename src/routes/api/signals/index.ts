import { createFileRoute } from '@tanstack/react-router'
import { handleApi, jsonResponse } from '@/lib/server/api-auth.server'
import { generateSignalsDetailed } from '@/lib/server/engine.server'

export const Route = createFileRoute('/api/signals/')({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, async () => {
        const result = await generateSignalsDetailed()
        const publicSignals = result.signals.map(({ aiScore: _aiScore, rsi: _rsi, regime: _regime, ...signal }) => {
          const entry = Number.isFinite(signal.entryPrice) && signal.entryPrice > 0 ? signal.entryPrice : null
          const stop = Number.isFinite(signal.stopLoss) && signal.stopLoss > 0 ? signal.stopLoss : null
          const target = Number.isFinite(signal.takeProfit1) && signal.takeProfit1 > 0 ? signal.takeProfit1 : null
          const risk = entry != null && stop != null ? Math.abs(entry - stop) : 0
          const reward = entry != null && target != null ? Math.abs(target - entry) : 0
          const rr = risk > 0 && reward > 0 ? Number((reward / risk).toFixed(4)) : null
          return {
          ...signal,
          aiScore: undefined,
          rr,
          riskPct: null,
          volDelta: null,
          dnaMatch: null,
          manipRisk: null,
          session: null,
          confirms: null,
        }})
        if (publicSignals.length === 0 && result.failedPairs.length === result.analyzedPairs.length) {

          return jsonResponse(
            { statusCode: 503, message: 'Fonte de mercado indisponível para todos os pares.' },
            503,
            {
              'x-signals-analyzed-pairs': result.analyzedPairs.join(','),
              'x-signals-failed-pairs': result.failedPairs.join(','),
            },
          )
        }
        return jsonResponse(publicSignals, 200, {
          'x-signals-analyzed-pairs': result.analyzedPairs.join(','),
          'x-signals-failed-pairs': result.failedPairs.join(','),
        })
      }),
    },
  },
})

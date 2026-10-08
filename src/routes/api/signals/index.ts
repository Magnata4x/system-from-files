import { createFileRoute } from '@tanstack/react-router'
import { handleApi, jsonResponse } from '@/lib/server/api-auth.server'
import { generateSignalsDetailed } from '@/lib/server/engine.server'

export const Route = createFileRoute('/api/signals/')({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, async () => {
        const result = await generateSignalsDetailed()
        const publicSignals = result.signals.map(({ aiScore: _aiScore, rsi: _rsi, regime: _regime, type: _type, ...signal }) => ({
          ...signal,
          aiScore: undefined,
          rr: null,
          riskPct: null,
          volDelta: null,
          dnaMatch: null,
          manipRisk: null,
          session: null,
          confirms: null,
        }))
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

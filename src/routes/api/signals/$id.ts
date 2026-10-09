import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'
import { generateSignals } from '@/lib/server/engine.server'
import { createSignalIntent } from '@/lib/server/signal-intent.server'

export const Route = createFileRoute('/api/signals/$id')({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        handleApi(request, async () => {
          const signals = await generateSignals()
          const found = signals.find((s) => s.id === params.id)
          if (!found) throw new ApiError('Sinal não encontrado', 404)
          return found
        }),
      POST: async ({ request, params }) =>
        handleApi(request, async (user) => {
          const body = await request.json().catch(() => ({})) as { idempotencyKey?: unknown }
          const headerKey = request.headers.get('idempotency-key')
          const bodyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : ''
          const key = headerKey ?? bodyKey
          if (!key) throw new ApiError('Idempotency-Key obrigatória.', 400)
          return createSignalIntent(user, params.id, key)
        }),
    },
  },
})
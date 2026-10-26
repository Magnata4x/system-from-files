import { createFileRoute } from '@tanstack/react-router'
import { ApiError, handleApi } from '@/lib/server/api-auth.server'
import {
  deleteExchangeCredentials,
  getExchangeStatus,
  saveExchangeCredentials,
} from '@/lib/server/exchange.server'

export const Route = createFileRoute('/api/exchange/credentials')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, (user) => {
          const environment = new URL(request.url).searchParams.get('environment')
          if (environment !== null && environment !== 'demo' && environment !== 'testnet' && environment !== 'production') {
            throw new ApiError('Ambiente inválido. Use demo, testnet ou production.', 400)
          }
          return getExchangeStatus(user.supabase, user.userId, environment ?? undefined)
        }),
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as Record<string, string>
          return saveExchangeCredentials(user.supabase, user.userId, body)
        }),
      DELETE: async ({ request }) =>
        handleApi(request, (user) => deleteExchangeCredentials(user.supabase, user.userId)),
    },
  },
})

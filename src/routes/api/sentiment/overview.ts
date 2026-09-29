import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'
import { computeSentiment } from '@/lib/server/sentiment.server'

export const Route = createFileRoute('/api/sentiment/overview')({
  server: {
    handlers: {
      GET: async ({ request }) => handleApi(request, () => computeSentiment()),
    },
  },
})

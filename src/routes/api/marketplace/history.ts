import { createFileRoute } from '@tanstack/react-router'
import { handleApi, ApiError } from '@/lib/server/api-auth.server'

export const Route = createFileRoute('/api/marketplace/history')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const { data, error } = await user.supabase
            .from('marketplace_views')
            .select('product_id, viewed_at')
            .eq('user_id', user.userId)
            .order('viewed_at', { ascending: false })
            .limit(20)
          if (error) throw new ApiError(error.message, 500)
          return (data ?? []).map((v) => ({ productId: v.product_id, viewedAt: v.viewed_at }))
        }),
      POST: async ({ request }) =>
        handleApi(request, async (user) => {
          const body = (await request.json().catch(() => ({}))) as { productId?: string }
          if (!body.productId) throw new ApiError('Produto inválido', 400)
          const { error } = await user.supabase.from('marketplace_views').upsert(
            {
              user_id: user.userId,
              product_id: body.productId,
              viewed_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,product_id' },
          )
          if (error) throw new ApiError(error.message, 500)
          return { ok: true }
        }),
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'
import { handleApi } from '@/lib/server/api-auth.server'

export const Route = createFileRoute('/api/auth/me')({
  server: {
    handlers: {
      GET: async ({ request }) =>
        handleApi(request, async (user) => {
          const { data: profile } = await user.supabase
            .from('profiles')
            .select('full_name, email, plan_tier')
            .eq('id', user.userId)
            .maybeSingle()
          const { data: roles } = await user.supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.userId)
          return {
            userId: user.userId,
            email: profile?.email ?? user.email,
            name: profile?.full_name ?? null,
            plan: profile?.plan_tier ?? 'starter',
            role: roles?.[0]?.role ?? 'user',
          }
        }),
    },
  },
})
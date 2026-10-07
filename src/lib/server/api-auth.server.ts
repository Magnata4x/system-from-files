// Autenticação das rotas internas /api/* — valida o Bearer JWT do Supabase.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/integrations/supabase/types'

export interface ApiUser {
  userId: string
  email: string
  role: string
  supabase: SupabaseClient<Database>
}

export function jsonResponse(body: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  })
}

export class ApiError extends Error {
  constructor(message: string, readonly status = 400, readonly code?: number) {
    super(message)
  }
}

export async function requireApiUser(request: Request): Promise<ApiUser> {
  const header = request.headers.get('authorization') ?? ''
  if (!header.startsWith('Bearer ')) throw new ApiError('Unauthorized', 401)
  const token = header.slice(7).trim()
  if (token.split('.').length !== 3) throw new ApiError('Unauthorized', 401)

  const url = process.env['SUPABASE_URL']
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']
  if (!url || !key) throw new ApiError('Backend não configurado', 500)

  const supabase = createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getClaims(token)
  const claims = data?.claims as Record<string, unknown> | undefined
  if (error || !claims?.['sub']) throw new ApiError('Unauthorized', 401)

  return {
    userId: String(claims['sub']),
    email: typeof claims['email'] === 'string' ? claims['email'] : '',
    role: typeof claims['role'] === 'string' ? claims['role'] : 'authenticated',
    supabase,
  }
}

/** Wrapper padrão: autentica, executa e serializa erros como JSON. */
const API_RATE_LIMIT_PER_MINUTE = 60

export async function handleApi(
  request: Request,
  fn: (user: ApiUser) => Promise<unknown>,
): Promise<Response> {
  try {
    const user = await requireApiUser(request)
    const action = new URL(request.url).pathname.replace(/^\\/api\\//, "") || "api"
    const { data: allowed, error: rateLimitError } = await user.supabase.rpc("check_rate_limit", {
      p_user_id: user.userId,
      p_action: action,
      p_max: API_RATE_LIMIT_PER_MINUTE,
    })
    if (rateLimitError) throw new ApiError("Rate limiter indisponível", 503)
    if (!allowed) {
      return jsonResponse(
        { statusCode: 429, message: "Rate limit excedido" },
        429,
        { "retry-after": "60" },
      )
    }
    return jsonResponse(await fn(user))
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500
    const message = err instanceof Error ? err.message : 'Erro interno'
    if (status >= 500) console.error('[api]', message)
    return jsonResponse({ statusCode: status, message }, status)
  }
}
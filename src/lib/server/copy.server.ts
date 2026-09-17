// Copy trading — traders seguidos pelo usuário, salvos no banco interno.
import type { ApiUser } from './api-auth.server'
import { ApiError } from './api-auth.server'

export interface CopyFollow {
  traderId: string
  traderHandle: string | null
  config: Record<string, unknown>
  pnl: number
  trades: number
  winRate: number
  since: string
}

function map(row: {
  trader_id: string
  trader_handle: string | null
  config: unknown
  pnl: number
  trades: number
  win_rate: number
  created_at: string
}): CopyFollow {
  return {
    traderId: row.trader_id,
    traderHandle: row.trader_handle,
    config: (row.config ?? {}) as Record<string, unknown>,
    pnl: Number(row.pnl ?? 0),
    trades: Number(row.trades ?? 0),
    winRate: Number(row.win_rate ?? 0),
    since: row.created_at.slice(0, 10),
  }
}

export async function listCopyFollows(user: ApiUser): Promise<CopyFollow[]> {
  const { data, error } = await user.supabase
    .from('copy_follows')
    .select('trader_id, trader_handle, config, pnl, trades, win_rate, created_at')
    .eq('user_id', user.userId)
    .eq('active', true)
    .order('created_at', { ascending: false })
  if (error) throw new ApiError(error.message, 500)
  return (data ?? []).map(map)
}

export async function addCopyFollow(
  user: ApiUser,
  input: { traderId?: string; traderHandle?: string; config?: Record<string, unknown> },
): Promise<CopyFollow[]> {
  const traderId = (input.traderId ?? '').trim()
  if (!traderId) throw new ApiError('Trader inválido', 400)
  const { error } = await user.supabase.from('copy_follows').upsert(
    {
      user_id: user.userId,
      trader_id: traderId,
      trader_handle: input.traderHandle ?? null,
      config: (input.config ?? {}) as never,
      active: true,
    },
    { onConflict: 'user_id,trader_id' },
  )
  if (error) throw new ApiError(error.message, 500)
  return listCopyFollows(user)
}

export async function removeCopyFollow(user: ApiUser, traderId: string): Promise<CopyFollow[]> {
  const { error } = await user.supabase
    .from('copy_follows')
    .delete()
    .eq('user_id', user.userId)
    .eq('trader_id', traderId)
  if (error) throw new ApiError(error.message, 500)
  return listCopyFollows(user)
}

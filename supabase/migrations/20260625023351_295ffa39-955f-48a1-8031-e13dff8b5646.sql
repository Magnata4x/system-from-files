-- Índice composto para queries de histórico de chat por usuário
-- Padrão: WHERE user_id = $1 ORDER BY created_at DESC LIMIT N
CREATE INDEX IF NOT EXISTS idx_copilot_history_user_time
  ON public.copilot_history(user_id, created_at DESC);

-- Índice composto em bot4x_trades para o padrão mais comum
-- WHERE user_id = $1 AND day >= $2 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_bot4x_trades_user_day_created
  ON public.bot4x_trades(user_id, day DESC, created_at DESC);

-- Índice parcial em signals para queries de sinais ativos (caso mais comum)
CREATE INDEX IF NOT EXISTS idx_signals_active_score
  ON public.signals(score DESC, created_at DESC)
  WHERE status = 'active';
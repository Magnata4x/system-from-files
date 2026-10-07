-- Fase 36 follow-up: column-level grants must replace table-level DML grants.
-- PostgreSQL table grants otherwise continue to permit writes to protected columns.

revoke insert, update on table public.bot4x_configs from authenticated;
grant insert (
  user_id, active, profile, rsi_threshold_low, rsi_threshold_high, ai_score_min,
  fomo_limit, leverage, total_trades_today, exchange, api_key_set, sl_pct, tp_pct,
  allocation_pct, total_capital, preferred_pairs, avoid_pairs, execution_mode
) on table public.bot4x_configs to authenticated;
grant update (
  active, profile, rsi_threshold_low, rsi_threshold_high, ai_score_min, fomo_limit,
  leverage, total_trades_today, exchange, api_key_set, sl_pct, tp_pct,
  allocation_pct, total_capital, preferred_pairs, avoid_pairs, execution_mode
) on table public.bot4x_configs to authenticated;

revoke insert, update on table public.profiles from authenticated;
grant insert (
  id, full_name, email, experience, markets, goal, onboarding_completed, created_at,
  updated_at, trading_style, overtrading_risk, best_session, worst_session,
  recent_losses, open_loss_pct, username, phone_country, phone, country, timezone,
  bio, website, avatar_url
) on table public.profiles to authenticated;
grant update (
  full_name, email, experience, markets, goal, onboarding_completed, updated_at,
  trading_style, overtrading_risk, best_session, worst_session, recent_losses,
  open_loss_pct, username, phone_country, phone, country, timezone, bio, website,
  avatar_url
) on table public.profiles to authenticated;
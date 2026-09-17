ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS alert_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.marketplace_products
  ADD COLUMN IF NOT EXISTS assets text[] NOT NULL DEFAULT '{}'::text[];

UPDATE public.marketplace_products SET assets = ARRAY['BTC','ETH'] WHERE assets = '{}'::text[];

CREATE TABLE IF NOT EXISTS public.copy_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trader_id text NOT NULL,
  trader_handle text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  pnl numeric NOT NULL DEFAULT 0,
  trades integer NOT NULL DEFAULT 0,
  win_rate numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trader_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.copy_follows TO authenticated;
GRANT ALL ON public.copy_follows TO service_role;
ALTER TABLE public.copy_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "copy_follows_own" ON public.copy_follows FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_copy_follows_updated_at BEFORE UPDATE ON public.copy_follows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.marketplace_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_views TO authenticated;
GRANT ALL ON public.marketplace_views TO service_role;
ALTER TABLE public.marketplace_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "marketplace_views_own" ON public.marketplace_views FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
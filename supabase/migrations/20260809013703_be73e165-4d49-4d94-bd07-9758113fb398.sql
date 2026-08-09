CREATE TABLE public.exchange_credentials (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exchange TEXT NOT NULL DEFAULT 'binance',
  api_key_cipher TEXT NOT NULL,
  api_secret_cipher TEXT NOT NULL,
  key_preview TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exchange_credentials TO authenticated;
GRANT ALL ON public.exchange_credentials TO service_role;

ALTER TABLE public.exchange_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exchange credentials"
  ON public.exchange_credentials FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_exchange_credentials_updated_at
  BEFORE UPDATE ON public.exchange_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
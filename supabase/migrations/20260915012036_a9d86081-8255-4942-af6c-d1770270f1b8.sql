CREATE TABLE public.marketplace_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  creator_handle TEXT NOT NULL,
  creator_verified BOOLEAN NOT NULL DEFAULT false,
  description TEXT NOT NULL DEFAULT '',
  rating NUMERIC NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  price NUMERIC NOT NULL DEFAULT 0,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.marketplace_products TO authenticated;
GRANT ALL ON public.marketplace_products TO service_role;

ALTER TABLE public.marketplace_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marketplace_products_read" ON public.marketplace_products
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.marketplace_products (id, name, category, creator_handle, creator_verified, description, rating, reviews, price, featured) VALUES
('p1','Institutional Flow Strategy','Strategies','InstitutionalFlow',true,'Order flow + volume profile strategy used by prop desks. Includes setup guide and TradingView template.',4.9,234,49,true),
('p2','Smart Money Concepts Pack','Indicators','SmartMoneyX',true,'Liquidity sweeps, order blocks, BOS/CHoCH and fair value gaps in a single overlay.',4.8,189,29,true),
('p3','London Session Scalper','Strategies','LondonScalper',true,'Mean-reversion scalping for the London open, 5m timeframe. Backtested over 3 years.',4.7,156,39,true),
('p4','Whale Alert Bot','Bots','WhaleHunter',true,'Real-time alerts on >$1M on-chain transfers, with Telegram + webhook delivery.',4.9,312,59,true),
('p5','Risk Management Masterclass','Education','DrTrading',false,'6 hours of video on position sizing, max drawdown control and psychology under pressure.',4.6,445,0,false),
('p6','Multi-TF Confluence Alerts','Alerts','AlertsLab',true,'Alerts firing only when 4h + 1h + 15m align. Reduce noise by ~80%.',4.8,201,19,false),
('p7','BTC Dominance Strategy','Strategies','InstitutionalFlow',true,'Rotation framework based on BTC dominance shifts. Long alt season / defensive in BTC season.',4.7,178,44,false),
('p8','On-Chain Signals Pack','Indicators','OnChainPro',true,'MVRV, SOPR, exchange netflow and whale wallets — all in TradingView-ready format.',4.9,267,34,false),
('p9','News Impact Filter Bot','Bots','AlertsLab',true,'Pauses bot execution around high-impact news. Custom keyword + source whitelist.',4.5,134,49,false),
('p10','Psychology of Trading','Education','MindsetFX',false,'Mental models, cognitive biases and journaling templates from a former hedge-fund coach.',4.8,523,29,false),
('p11','SMC Order Block Detector','Indicators','SmartMoneyX',true,'Lightweight order-block detector with mitigation tracking and alerts.',4.7,198,24,false),
('p12','Scalping Volatility Bot','Bots','LondonScalper',true,'Scalps high-volatility regimes with adaptive position sizing. Binance + Bybit.',4.6,143,69,false);
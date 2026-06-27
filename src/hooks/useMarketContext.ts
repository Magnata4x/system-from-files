import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketContextData {
  asset?: string;
  price?: number;
  regime?: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
  aiScore?: number;
  priceActionScore?: number;
  indicatorsScore?: number;
  flowScore?: number;
  sentimentScore?: number;
  aiPredictiveScore?: number;
  macroScore?: number;
  manipulationScore?: number;
  bot4xActive?: boolean;
  bot4xProfile?: 'conservador' | 'calibradoRSI' | 'calibradoAiScore' | 'agressivo';
  bot4xDailyPnl?: number;
  bot4xOpenSlots?: number;
  bot4xCircuitBreaker?: 'none' | 'emergency' | 'profitLock';
  activeSignals?: number;
  topSignalScore?: number;
  topSignalAsset?: string;
  topSignalDirection?: 'BUY' | 'SELL';
}

export function useMarketContext(userId: string | undefined): {
  marketContext: MarketContextData;
  loading: boolean;
} {
  const [marketContext, setMarketContext] = useState<MarketContextData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function fetchCtx() {
      setLoading(true);
      try {
        const [signalsRes, bot4xRes, signalCountRes] = await Promise.all([
          supabase
            .from('signals')
            .select('pair, side, score, ai_score')
            .eq('status', 'active')
            .order('score', { ascending: false })
            .limit(1)
            .maybeSingle(),

          supabase
            .from('bot4x_configs')
            .select('active, profile, daily_pnl, open_slots, circuit_breaker')
            .eq('user_id', userId!)
            .maybeSingle(),

          supabase
            .from('signals')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active'),
        ]);

        if (!active) return;

        const signal = signalsRes.data;
        const bot4x = bot4xRes.data;
        const count = signalCountRes.count ?? 0;

        setMarketContext({
          topSignalAsset: signal?.pair ?? undefined,
          topSignalDirection: (signal?.side as MarketContextData['topSignalDirection']) ?? undefined,
          topSignalScore: signal?.score ?? undefined,
          aiScore: signal?.ai_score ?? undefined,
          activeSignals: count,

          bot4xActive: bot4x?.active ?? undefined,
          bot4xProfile: (bot4x?.profile as MarketContextData['bot4xProfile']) ?? undefined,
          bot4xDailyPnl: bot4x?.daily_pnl ?? undefined,
          bot4xOpenSlots: bot4x?.open_slots ?? undefined,
          bot4xCircuitBreaker:
            (bot4x?.circuit_breaker as MarketContextData['bot4xCircuitBreaker']) ?? 'none',
        });
      } catch (err) {
        console.warn('[useMarketContext]', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchCtx();

    const signalChannel = supabase
      .channel('signals:active')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'signals' },
        () => fetchCtx(),
      )
      .subscribe();

    const bot4xChannel = supabase
      .channel(`bot4x:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bot4x_configs',
          filter: `user_id=eq.${userId}`,
        },
        () => fetchCtx(),
      )
      .subscribe();

    const interval = setInterval(fetchCtx, 30_000);

    return () => {
      active = false;
      supabase.removeChannel(signalChannel);
      supabase.removeChannel(bot4xChannel);
      clearInterval(interval);
    };
  }, [userId]);

  return { marketContext, loading };
}

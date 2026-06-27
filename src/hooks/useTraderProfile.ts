import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TraderProfileData {
  name?: string;
  planTier?: 'starter' | 'pro' | 'institutional';
  style?: 'conservative' | 'moderate' | 'aggressive';
  operationsToday?: number;
  drawdownToday?: number;
  bestSession?: string;
  worstSession?: string;
  avgWinRate?: number;
  overtradingRisk?: boolean;
  dnaConsistency?: number;
  dnaDiscipline?: number;
  dnaRiskControl?: number;
  dnaTiming?: number;
  dnaEmotionalControl?: number;
}

export function useTraderProfile(userId: string | undefined): {
  profile: TraderProfileData;
  loading: boolean;
  refetch: () => void;
} {
  const [profile, setProfile] = useState<TraderProfileData>({});
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const refetch = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let active = true;

    async function fetchProfile() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(
            'full_name, plan_tier, trading_style, operations_today, drawdown_today, best_session, worst_session, avg_win_rate, overtrading_risk, dna_consistency, dna_discipline, dna_risk_control, dna_timing, dna_emotional_control',
          )
          .eq('id', userId!)
          .maybeSingle();

        if (error) {
          console.warn('[useTraderProfile]', error.message);
          return;
        }

        if (active && data) {
          setProfile({
            name: data.full_name ?? undefined,
            planTier: (data.plan_tier as TraderProfileData['planTier']) ?? undefined,
            style: (data.trading_style as TraderProfileData['style']) ?? undefined,
            operationsToday: data.operations_today ?? undefined,
            drawdownToday: data.drawdown_today ?? undefined,
            bestSession: data.best_session ?? undefined,
            worstSession: data.worst_session ?? undefined,
            avgWinRate: data.avg_win_rate ?? undefined,
            overtradingRisk: data.overtrading_risk ?? undefined,
            dnaConsistency: data.dna_consistency ?? undefined,
            dnaDiscipline: data.dna_discipline ?? undefined,
            dnaRiskControl: data.dna_risk_control ?? undefined,
            dnaTiming: data.dna_timing ?? undefined,
            dnaEmotionalControl: data.dna_emotional_control ?? undefined,
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProfile();

    const channel = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        () => fetchProfile(),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId, tick]);

  return { profile, loading, refetch };
}

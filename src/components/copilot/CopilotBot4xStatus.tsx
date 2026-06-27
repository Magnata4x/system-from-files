import React from 'react';
import type { MarketContext } from '@/hooks/useCopilot';

const PROFILE_LABELS: Record<string, string> = {
  conservador:       'Conservador',
  calibradoRSI:      'Calibrado RSI',
  calibradoAiScore:  'Calibrado aiScore',
  agressivo:         'Agressivo',
};

const BREAKER_CONFIG = {
  none:        { color: '#3B6D11', label: 'OPERACIONAL',     bg: '#EAF3DE' },
  emergency:   { color: '#791F1F', label: 'DISJUNTOR -1.5%', bg: '#FCEBEB' },
  profitLock:  { color: '#3C3489', label: 'PROFIT LOCK +3%', bg: '#EEEDFE' },
};

interface CopilotBot4xStatusProps {
  context: MarketContext;
}

export function CopilotBot4xStatus({ context }: CopilotBot4xStatusProps) {
  if (context.bot4xActive === undefined) return null;

  const breaker = BREAKER_CONFIG[context.bot4xCircuitBreaker ?? 'none'];
  const pnl     = context.bot4xDailyPnl ?? 0;
  const pnlColor = pnl >= 0 ? '#3B6D11' : '#791F1F';
  const slots   = context.bot4xOpenSlots ?? 0;

  return (
    <div style={{ padding: 10, background: '#0a0a0a', borderBottom: '1px solid #141414' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 1, color: '#a855f7' }}>BOT4X</span>
        <span style={{ fontSize: 9, fontFamily: 'monospace', color: context.bot4xActive ? '#3B6D11' : '#5F5E5A' }}>
          {context.bot4xActive ? '● ATIVO' : '○ INATIVO'}
        </span>
      </div>

      <div style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: breaker.color, background: breaker.bg, padding: '3px 6px', borderRadius: 1, display: 'inline-block', marginBottom: 8 }}>
        {breaker.label}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#5F5E5A', letterSpacing: 1 }}>PNL DIÁRIO</div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', color: pnlColor, fontWeight: 700 }}>
            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#5F5E5A', letterSpacing: 1 }}>SLOTS</div>
          <div style={{ fontSize: 13, fontFamily: 'monospace', color: '#e6e6e6', fontWeight: 700 }}>
            {slots}/3
          </div>
        </div>
        <div>
          <div style={{ fontSize: 8, fontFamily: 'monospace', color: '#5F5E5A', letterSpacing: 1 }}>PERFIL</div>
          <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#e6e6e6' }}>
            {PROFILE_LABELS[context.bot4xProfile ?? 'conservador']}
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import type { MarketContext } from '@/hooks/useCopilot';

function scoreConfig(score: number) {
  if (score >= 90) return { color: '#3C3489', label: 'INSTITUCIONAL',  bg: '#EEEDFE' };
  if (score >= 75) return { color: '#3B6D11', label: 'ALTA PROB.',     bg: '#EAF3DE' };
  if (score >= 60) return { color: '#633806', label: 'MODERADO',       bg: '#FAEEDA' };
  if (score >= 40) return { color: '#791F1F', label: 'ARRISCADO',      bg: '#FCEBEB' };
  return              { color: '#5F5E5A', label: 'EVITAR',         bg: '#F1EFE8' };
}

const LAYERS = [
  { key: 'priceActionScore',  label: 'Price Action', weight: '25%' },
  { key: 'indicatorsScore',   label: 'Indicadores',  weight: '20%' },
  { key: 'flowScore',         label: 'Fluxo',        weight: '20%' },
  { key: 'sentimentScore',    label: 'Sentimento',   weight: '15%' },
  { key: 'aiPredictiveScore', label: 'IA Preditiva', weight: '12%' },
  { key: 'macroScore',        label: 'Macro',        weight: '8%'  },
] as const;

interface CopilotScoreBarProps {
  context: MarketContext;
  compact?: boolean;
}

export function CopilotScoreBar({ context, compact = false }: CopilotScoreBarProps) {
  const score = context.aiScore ?? 0;
  const cfg   = scoreConfig(score);

  return (
    <div style={{ padding: 10, background: '#0a0a0a', borderBottom: '1px solid #141414' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: '#5F5E5A' }}>AI SCORE</span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: '#141414', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ width: `${score}%`, height: '100%', background: cfg.color, transition: 'width 0.3s' }} />
          </div>
          <span style={{ fontSize: 14, fontFamily: 'monospace', color: cfg.color, fontWeight: 700, minWidth: 30, textAlign: 'right' }}>
            {score}
          </span>
          <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: cfg.color, background: cfg.bg, padding: '2px 6px', borderRadius: 1 }}>
            {cfg.label}
          </span>
        </div>
      </div>

      {!compact && (
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
          {LAYERS.map(layer => {
            const val = (context[layer.key as keyof MarketContext] as number) ?? 0;
            const lCfg = scoreConfig(val);
            return (
              <div key={layer.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'monospace' }}>
                <span style={{ width: 80, color: '#888' }}>{layer.label}</span>
                <div style={{ flex: 1, height: 3, background: '#141414', borderRadius: 1, overflow: 'hidden' }}>
                  <div style={{ width: `${val}%`, height: '100%', background: lCfg.color }} />
                </div>
                <span style={{ width: 24, textAlign: 'right', color: lCfg.color }}>{val}</span>
                <span style={{ width: 28, textAlign: 'right', color: '#5F5E5A' }}>{layer.weight}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

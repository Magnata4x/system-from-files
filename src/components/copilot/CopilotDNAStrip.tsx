import React from 'react';
import type { TraderProfile } from '@/hooks/useCopilot';

const DNA_METRICS = [
  { key: 'dnaConsistency',      label: 'CONSIST.'  },
  { key: 'dnaDiscipline',       label: 'DISCIPL.'  },
  { key: 'dnaRiskControl',      label: 'RISCO'     },
  { key: 'dnaTiming',           label: 'TIMING'    },
  { key: 'dnaEmotionalControl', label: 'EMOCIONAL' },
] as const;

function metricColor(val: number) {
  if (val >= 75) return '#3B6D11';
  if (val >= 50) return '#633806';
  return '#791F1F';
}

interface CopilotDNAStripProps {
  profile: TraderProfile;
}

export function CopilotDNAStrip({ profile }: CopilotDNAStripProps) {
  const hasData = DNA_METRICS.some(m => profile[m.key as keyof TraderProfile] !== undefined);
  if (!hasData) return null;

  return (
    <div style={{ padding: '8px 10px', background: '#0a0a0a', borderTop: '1px solid #141414', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: '#f500c8' }}>DNA</span>
      {DNA_METRICS.map(m => {
        const val = (profile[m.key as keyof TraderProfile] as number) ?? 0;
        const col = metricColor(val);
        return (
          <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ height: 3, background: '#141414', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ width: `${val}%`, height: '100%', background: col }} />
            </div>
            <span style={{ fontSize: 8, fontFamily: 'monospace', color: '#5F5E5A', letterSpacing: 0.5 }}>{m.label}</span>
          </div>
        );
      })}
      {profile.overtradingRisk && (
        <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: '#791F1F', background: '#FCEBEB', padding: '2px 5px', borderRadius: 1 }}>
          ⚠ OVERTRADING
        </span>
      )}
    </div>
  );
}

import React from 'react';
import type { OrbState } from '@/hooks/useCopilot';

const ORB_CONFIG: Record<OrbState, { primary: string; label: string; speed: string }> = {
  idle:      { primary: '#00e5a0', label: 'PRONTO',     speed: '3s'    },
  listening: { primary: '#00c8f5', label: 'OUVINDO',    speed: '0.7s'  },
  thinking:  { primary: '#f5b800', label: 'ANALISANDO', speed: '0.35s' },
  speaking:  { primary: '#a855f7', label: 'FALANDO',    speed: '0.5s'  },
  alert:     { primary: '#f5003d', label: 'ALERTA',     speed: '0.25s' },
};

interface CopilotOrbProps {
  state: OrbState;
  size?: number;
}

export function CopilotOrb({ state, size = 72 }: CopilotOrbProps) {
  const c = ORB_CONFIG[state];
  const s = size;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ position: 'relative', width: s, height: s }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              border: `1px solid ${c.primary}66`,
              animation: `copilot-ring ${c.speed} ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            inset: '20%',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${c.primary}, ${c.primary}22)`,
            boxShadow: `0 0 24px ${c.primary}88`,
            animation: `copilot-pulse ${c.speed} ease-in-out infinite`,
          }}
        />
      </div>
      <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: c.primary }}>
        {c.label}
      </span>
    </div>
  );
}

import React from 'react';
import type { CopilotMessage } from '@/hooks/useCopilot';

const AGENT_COLORS: Record<string, string> = {
  'Liquidity AI':     '#00c8f5',
  'Market Structure': '#00e5a0',
  'Risk Manager':     '#f5003d',
  'Behavioral AI':    '#f500c8',
  'Execution AI':     '#a855f7',
  'Sentiment AI':     '#f5b800',
  'AI Copilot':       '#00e5a0',
  'Signal Radar':        '#378ADD',
  'DNA Trader':          '#f500c8',
  'Manipulation Radar':  '#f5003d',
  'Bot4x':               '#a855f7',
  'Confluence Engine':   '#00e5a0',
  'Macro Context':       '#f5b800',
};

export function CopilotMessageBubble({ msg, onReconnect }: { msg: CopilotMessage; onReconnect?: () => void }) {
  const isUser   = msg.role === 'user';
  const isAlert  = msg.role === 'alert';
  const isSystem = msg.role === 'system';
  const accent   = msg.agent ? (AGENT_COLORS[msg.agent] ?? '#00e5a0') : '#00e5a0';
  const timeStr  = msg.timestamp.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  if (isSystem) {
    const showReconnect = (msg.metadata as { action?: string } | undefined)?.action === 'reconnect' && !!onReconnect;
    return (
      <div style={{ textAlign: 'center', padding: '6px 0' }}>
        <span style={{ fontSize: 10, color: '#5F5E5A', fontFamily: 'monospace', letterSpacing: 0.5 }}>
          — {msg.content} —
        </span>
        {showReconnect && (
          <div style={{ marginTop: 6 }}>
            <button
              onClick={onReconnect}
              style={{
                fontSize: 10,
                fontFamily: 'monospace',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#00e5a0',
                background: 'transparent',
                border: '1px solid #00e5a044',
                padding: '4px 10px',
                borderRadius: 2,
                cursor: 'pointer',
              }}
            >
              ↻ Reconectar
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        margin: '8px 0',
        animation: 'copilot-fadein 0.2s ease-out',
      }}
    >
      {!isUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, paddingLeft: 4 }}>
          {isAlert && <span style={{ color: '#f5003d', fontSize: 10 }}>⚠</span>}
          <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: accent, textTransform: 'uppercase' }}>
            {msg.agent || 'AI Copilot'}
          </span>
          <span style={{ fontSize: 9, color: '#3a3a3a', fontFamily: 'monospace' }}>{timeStr}</span>
        </div>
      )}
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          background: isUser ? '#0a0a0a' : isAlert ? '#f5003d11' : '#0d0d0d',
          border: `1px solid ${isUser ? '#1a1a1a' : isAlert ? '#f5003d44' : `${accent}33`}`,
          borderRadius: 2,
        }}
      >
        <div style={{ fontSize: 12, color: isUser ? '#cfcfcf' : '#e6e6e6', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

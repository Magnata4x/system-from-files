import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useCopilot } from '@/hooks/useCopilot';
import type { MarketContext, TraderProfile, CopilotMessage } from '@/hooks/useCopilot';
import { CopilotOrb } from './CopilotOrb';
import { CopilotMessageBubble } from './CopilotMessage';
import { CopilotScoreBar } from './CopilotScoreBar';
import { CopilotBot4xStatus } from './CopilotBot4xStatus';
import { CopilotDNAStrip } from './CopilotDNAStrip';
import { useCopilotUI } from '@/lib/copilot-ui-store';

export interface CopilotPanelProps {
  userId: string;
  token: string;
  marketContext?: MarketContext;
  traderProfile?: TraderProfile;
  mode?: 'panel' | 'float';
  onAlert?: (msg: CopilotMessage) => void;
  className?: string;
}

export function CopilotPanel({
  userId, token, marketContext, traderProfile,
  mode = 'panel', onAlert, className,
}: CopilotPanelProps) {
  const [input, setInput] = useState('');
  const uiOpen = useCopilotUI((s) => s.open);
  const setUiOpen = useCopilotUI((s) => s.setOpen);
  const isExpanded = mode === 'panel' ? true : uiOpen;
  const setIsExpanded = (v: boolean) => setUiOpen(v);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, orbState, isConnected, isRecording, latency,
    sendMessage, startRecording, stopRecording, clearHistory, reconnect } =
    useCopilot({ userId, token, marketContext, traderProfile, onAlert });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    if (!input.trim()) return;
    sendMessage(input.trim());
    setInput('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  async function handlePTTStart() {
    await startRecording();
    setIsRecordingActive(true);
  }

  function handlePTTStop() {
    stopRecording();
    setIsRecordingActive(false);
  }

  if (mode === 'float' && !isExpanded) {
    return <CopilotStyles />;
  }

  const isFloat = mode === 'float';

  const containerStyle: React.CSSProperties = isFloat
    ? {
        position: 'fixed', top: 52, right: 12,
        width: 380, height: 'min(560px, calc(100vh - 72px))', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        background: '#050505', border: '1px solid #141414',
        borderRadius: 8,
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      }
    : {
        display: 'flex', flexDirection: 'column',
        height: '100%', width: '100%',
        background: '#050505', borderLeft: '1px solid #141414',
      };

  return (
    <>
      <CopilotStyles />
      <div className={className} style={containerStyle}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottom: '1px solid #141414' }}>
          <CopilotOrb state={orbState} size={36} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {latency > 0 && (
              <span style={{ fontSize: 9, color: '#5F5E5A', fontFamily: 'monospace' }}>{latency}ms</span>
            )}
            <span style={{ fontSize: 9, color: isConnected ? '#3B6D11' : '#791F1F', fontFamily: 'monospace' }}>
              {isConnected ? '● ON' : '○ OFF'}
            </span>
            <button
              onClick={clearHistory}
              title="Limpar histórico"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3a3a3a', fontSize: 14, padding: 2 }}
            >⊘</button>
            {isFloat && (
              <button
                onClick={() => setIsExpanded(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2a2a2a', fontSize: 18, lineHeight: 1, padding: 2 }}
              >×</button>
            )}
          </div>
        </div>

        {/* AISignalRadar score bar */}
        {marketContext?.aiScore !== undefined && (
          <CopilotScoreBar context={marketContext} />
        )}

        {/* Bot4x status */}
        {marketContext?.bot4xActive !== undefined && (
          <CopilotBot4xStatus context={marketContext} />
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
          {messages.length === 0 && (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', letterSpacing: 2, color: '#3a3a3a' }}>AI COPILOT</span>
              <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: 1, color: '#2a2a2a' }}>AGUARDANDO</span>
            </div>
          )}
          {messages.map(msg => <CopilotMessageBubble key={msg.id} msg={msg} onReconnect={reconnect} />)}
          <div ref={messagesEndRef} />
        </div>

        {/* DNA strip */}
        {traderProfile && <CopilotDNAStrip profile={traderProfile} />}

        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderTop: '1px solid #141414' }}>
          <button
            onMouseDown={handlePTTStart}
            onMouseUp={handlePTTStop}
            onMouseLeave={() => isRecordingActive && handlePTTStop()}
            onTouchStart={(e) => { e.preventDefault(); handlePTTStart(); }}
            onTouchEnd={(e) => { e.preventDefault(); handlePTTStop(); }}
            disabled={!isConnected}
            style={{
              width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
              border: `1px solid ${isRecording ? '#00c8f5' : '#1a1a1a'}`,
              background: isRecording ? '#00c8f511' : '#0a0a0a',
              boxShadow: isRecording ? '0 0 16px #00c8f544' : 'none',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            aria-label="Push to talk"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isRecording ? '#00c8f5' : '#5F5E5A'} strokeWidth="2">
              <rect x="9" y="2" width="6" height="12" rx="3" />
              <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte ao Copilot..."
            disabled={!isConnected}
            style={{
              flex: 1, background: '#0a0a0a',
              border: '1px solid #141414', color: '#cfcfcf',
              padding: '9px 13px', fontSize: 12,
              fontFamily: 'monospace', outline: 'none',
            }}
          />

          <button
            onClick={handleSend}
            disabled={!isConnected || !input.trim()}
            style={{
              width: 38, height: 38, flexShrink: 0,
              border: '1px solid #00e5a033',
              background: '#00e5a011',
              color: '#00e5a0',
              cursor: isConnected && input.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace', fontSize: 16,
            }}
            aria-label="Send"
          >↑</button>
        </div>
      </div>
    </>
  );
}

function CopilotStyles() {
  return (
    <style>{`
      @keyframes copilot-ring {
        0%, 100% { transform: scale(1); opacity: 0.5; }
        50% { transform: scale(1.1); opacity: 1; }
      }
      @keyframes copilot-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.06); }
      }
      @keyframes copilot-fadein {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}

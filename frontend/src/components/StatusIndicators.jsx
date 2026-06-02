// TypingIndicator — animated dots + "alice is typing" text.
// ConnectionBar   — yellow/red banner when WebSocket is degraded.

// ─── Typing indicator ─────────────────────────────────────────────

export function TypingIndicator({ names }) {
  if (!names.length) return null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 44px',
      animation: 'fadeIn 0.2s ease',
      minHeight: 24,
    }}>
      {/* Animated dots */}
      <div style={{ display: 'flex', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div
            key={i}
            style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--text-2)',
              animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{
        fontSize: 12, color: 'var(--text-2)',
        fontFamily: 'var(--font-mono)',
      }}>
        {names.join(', ')} {names.length === 1 ? 'is' : 'are'} typing
      </span>
    </div>
  );
}

// ─── Connection status bar ────────────────────────────────────────
// Only visible when the WebSocket is degraded.
// Hidden completely when connected.

import { Spinner } from './ui';

const STATUS_CONFIG = {
  connecting:   { color: 'var(--yellow)', text: 'Connecting…',             spinner: true  },
  reconnecting: { color: 'var(--yellow)', text: 'Reconnecting…',           spinner: true  },
  disconnected: { color: 'var(--red)',    text: 'Disconnected — messages may not send', spinner: false },
};

export function ConnectionBar({ status }) {
  const config = STATUS_CONFIG[status];
  if (!config) return null; // 'connected' — render nothing

  return (
    <div style={{
      padding: '6px 16px',
      background: config.color + '22',
      borderBottom: `1px solid ${config.color}44`,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {config.spinner && <Spinner size={12} color={config.color} />}
      <span style={{
        fontSize: 12, color: config.color,
        fontFamily: 'var(--font-mono)',
      }}>
        {config.text}
      </span>
    </div>
  );
}

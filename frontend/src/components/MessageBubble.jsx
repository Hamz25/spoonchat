// MessageBubble — renders a single chat message.
// DeliveryStatus — the ✓ ✓✓ indicators on outgoing messages.

import { Avatar } from './ui';

// ─── Delivery status ──────────────────────────────────────────────
// pending  → ○  (optimistic, not yet confirmed by server)
// failed   → ✗ failed
// sent     → ✓  (server received, recipient offline)
// delivered→ ✓✓ grey (reached recipient's device)
// read     → ✓✓ blue (recipient opened the conversation)

export function DeliveryStatus({ message }) {
  if (message.failed) {
    return (
      <span style={{ color: 'var(--red)', fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        ✗ failed
      </span>
    );
  }
  if (message.pending) {
    return <span style={{ color: 'var(--text-2)', fontSize: 12 }}>○</span>;
  }
  if (message.read) {
    return <span style={{ color: 'var(--blue)', fontSize: 11, letterSpacing: -2 }}>✓✓</span>;
  }
  if (message.delivered) {
    return <span style={{ color: 'var(--text-1)', fontSize: 11, letterSpacing: -2 }}>✓✓</span>;
  }
  // Sent but no confirmation yet
  return <span style={{ color: 'var(--text-2)', fontSize: 11 }}>✓</span>;
}

// ─── Message bubble ───────────────────────────────────────────────

export function MessageBubble({ message, isOwn, showAvatar, showName }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 8,
      padding: '2px 16px',
      animation: 'msgIn 0.2s ease',
    }}>
      {/* Avatar slot — keeps alignment consistent even when hidden */}
      <div style={{ width: 28, flexShrink: 0 }}>
        {showAvatar && !isOwn && (
          <Avatar name={message.sender_username || '?'} size={28} />
        )}
      </div>

      <div style={{
        maxWidth: '65%',
        display: 'flex', flexDirection: 'column', gap: 2,
        alignItems: isOwn ? 'flex-end' : 'flex-start',
      }}>
        {/* Sender name (group chats only) */}
        {showName && !isOwn && (
          <span style={{
            fontSize: 11, color: 'var(--text-1)',
            fontFamily: 'var(--font-mono)', paddingLeft: 4,
          }}>
            @{message.sender_username}
          </span>
        )}

        {/* Bubble */}
        <div style={{
          padding: '9px 13px',
          background: isOwn ? 'var(--accent)' : 'var(--bg-3)',
          borderRadius: isOwn
            ? '16px 16px 4px 16px'
            : '16px 16px 16px 4px',
          border: `1px solid ${isOwn ? 'transparent' : 'var(--border)'}`,
          boxShadow: isOwn ? '0 2px 8px rgba(232,73,15,0.2)' : 'none',
          opacity: message.pending ? 0.7 : 1,
          transition: 'opacity 0.2s',
        }}>
          {message.decrypted != null
            ? (
              <p style={{
                margin: 0, fontSize: 14, lineHeight: 1.5,
                color: 'var(--text-0)', wordBreak: 'break-word',
              }}>
                {message.decrypted}
              </p>
            )
            : (
              <p style={{
                margin: 0, fontSize: 12, fontStyle: 'italic',
                fontFamily: 'var(--font-mono)', color: 'var(--text-2)',
              }}>
                🔒 encrypted
              </p>
            )
          }
        </div>

        {/* Timestamp + delivery */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          paddingLeft: 4, paddingRight: 4,
        }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
            {time}
          </span>
          {isOwn && <DeliveryStatus message={message} />}
        </div>
      </div>
    </div>
  );
}

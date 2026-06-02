// ConversationHeader — top bar of the active chat.
// Shows the other person's name, online status, and the E2EE badge.

import { Avatar } from './ui';

export function ConversationHeader({ conversation, currentUserId, online }) {
  if (!conversation) {
    return (
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-1)',
        height: 65,
      }} />
    );
  }

  const other    = conversation.participants?.find(p => p.id !== currentUserId);
  const isOnline = other ? online.has(other.id) : false;
  const name     = conversation.is_group
    ? conversation.name
    : `@${other?.username ?? '?'}`;
  const sub      = conversation.is_group
    ? `${conversation.participants?.length ?? 0} members`
    : isOnline ? 'Online' : 'Offline';

  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg-1)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <Avatar
        name={conversation.is_group ? conversation.name : (other?.username ?? '?')}
        size={36}
        online={isOnline}
      />

      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{name}</div>
        <div style={{
          fontSize: 12,
          color: isOnline ? 'var(--green)' : 'var(--text-2)',
          fontFamily: 'var(--font-mono)',
        }}>
          {sub}
        </div>
      </div>

      {/* E2EE badge */}
      <div style={{
        padding: '4px 10px', borderRadius: 20,
        background: 'var(--green-dim)',
        border: '1px solid var(--green)',
        fontSize: 11, color: 'var(--green)',
        fontFamily: 'var(--font-mono)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        🔒 encrypted
      </div>
    </div>
  );
  
}

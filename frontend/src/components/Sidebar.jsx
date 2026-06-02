// Sidebar — left panel of the chat app.
// Shows all conversations, a search/filter bar,
// buttons to create DMs and groups, and the logged-in user footer.

import { useState } from 'react';
import { Avatar } from './ui';
import { useGlobal, setState } from '../store';

// ─── Single conversation row ──────────────────────────────────────

function ConvItem({ conv, active, currentUserId, online, onClick }) {
  const other    = conv.participants?.find(p => p.id !== currentUserId);
  const name     = conv.is_group ? conv.name : `@${other?.username ?? '?'}`;
  const isOnline = other ? online.has(other.id) : false;

  const lastMsg  = conv.last_message;
  const preview  = lastMsg
    ? (lastMsg.decrypted || '🔒 Encrypted message')
    : 'No messages yet';
  const time     = lastMsg
    ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      onClick={onClick}
      style={{
        padding: '11px 16px', cursor: 'pointer',
        background: active ? 'var(--bg-2)' : 'transparent',
        borderLeft: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        transition: 'all var(--transition)',
        display: 'flex', gap: 10, alignItems: 'center',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-2)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar
        name={conv.is_group ? conv.name : (other?.username ?? '?')}
        size={38}
        online={isOnline}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 3,
        }}>
          <span style={{ fontWeight: active ? 600 : 400, fontSize: 14 }}>{name}</span>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
            {time}
          </span>
        </div>
        <p style={{
          fontSize: 12, color: 'var(--text-1)', margin: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {preview}
        </p>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────

export function Sidebar({ onNewDM, onNewGroup, onLogout }) {
  const user          = useGlobal(s => s.currentUser);
  const conversations = useGlobal(s => s.conversations) || [];
  const activeConvId  = useGlobal(s => s.activeConversationId);
  const online        = useGlobal(s => s.onlineUsers);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? conversations.filter(c => {
        const other = c.participants?.find(p => p.id !== user?.id);
        const name  = c.is_group ? c.name : (other?.username ?? '');
        return name.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  return (
    <div style={{
      width: 280, flexShrink: 0,
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-1)',
    }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🥄</span>
            <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', fontSize: 15 }}>
              SpoonChat
            </span>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <IconButton title="New message" onClick={onNewDM}>✎</IconButton>
            <IconButton title="New group"   onClick={onNewGroup}>⊕</IconButton>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: 10, top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-2)', fontSize: 13, pointerEvents: 'none',
          }}>
            ⌕
          </span>
          <input
            placeholder="Search conversations…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '8px 10px 8px 28px',
              background: 'var(--bg-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', color: 'var(--text-0)',
              fontSize: 13, outline: 'none', fontFamily: 'var(--font-sans)',
            }}
          />
        </div>
      </div>

      {/* ── Conversation list ────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center',
            color: 'var(--text-2)', fontSize: 13,
            fontFamily: 'var(--font-mono)',
          }}>
            {search ? 'No matches' : 'No conversations yet'}
          </div>
        )}
        {filtered.map(conv => (
          <ConvItem
            key={conv.id}
            conv={conv}
            active={conv.id === activeConvId}
            currentUserId={user?.id}
            online={online}
            onClick={() => setState({ activeConversationId: conv.id })}
          />
        ))}
      </div>

      {/* ── User footer ─────────────────────────────────────────── */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <Avatar name={user?.username ?? '?'} size={32} online />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>@{user?.username}</div>
          <div style={{ fontSize: 11, color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>
            online
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign out"
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', color: 'var(--text-2)',
            cursor: 'pointer', padding: '4px 8px',
            fontSize: 12, fontFamily: 'var(--font-mono)',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => {
            e.target.style.borderColor = 'var(--red)';
            e.target.style.color = 'var(--red)';
          }}
          onMouseLeave={e => {
            e.target.style.borderColor = 'var(--border)';
            e.target.style.color = 'var(--text-2)';
          }}
        >
          sign out
        </button>
      </div>
    </div>
  );
}

// ─── Small icon button ────────────────────────────────────────────

function IconButton({ children, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 30, height: 30,
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-3)',
        border: '1px solid var(--border)',
        color: 'var(--text-1)',
        cursor: 'pointer', fontSize: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all var(--transition)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-1)'; }}
    >
      {children}
    </button>
  );
}

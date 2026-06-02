// NewDMModal   — search for a user and open a DM with them.
// NewGroupModal — pick a name, search for members, create a group.

import { useState, useEffect, useRef } from 'react';
import { Modal, Input, Button, Avatar, Spinner } from './ui';
import { authAPI, chatAPI } from '../api';
import { classifyError } from '../utils/errors';
import { useToast } from '../context/ToastContext';
import { getState, setState } from '../store';

// ─── User search shared logic ─────────────────────────────────────

function useUserSearch(exclude = []) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await authAPI.searchUsers(query);
        const me   = getState().currentUser;
        const excludeIds = new Set([me?.id, ...exclude.map(u => u.id)]);

        setResults((data.data).filter(u => !excludeIds.has(u.id)));
      } catch (err) {
        console.error('[UserSearch]', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query, exclude.length]);

  return { query, setQuery, results, loading };
}

// ─── New DM modal ─────────────────────────────────────────────────

export function NewDMModal({ onClose }) {
  const toast                     = useToast();
  const [creating, setCreating]   = useState(null); // userId being created
  const { query, setQuery, results, loading } = useUserSearch();

  async function startDM(user) {
    setCreating(user.id);
    try {
      const conv = await chatAPI.createConversation({
        participant_ids: [user.id],
        is_group: false,
      });
      setState(s => ({
        conversations: s.conversations.find(c => c.id === conv.id)
          ? s.conversations
          : [conv, ...s.conversations],
        activeConvId: conv.id,
      }));
      onClose();
    } catch (err) {
      toast(classifyError(err).message, 'error');
    } finally {
      setCreating(null);
    }
  }

  return (
    <Modal title="New message" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          placeholder="Search users by username…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />

        <div style={{ minHeight: 200, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 40 }}>
              <Spinner size={20} />
            </div>
          )}

          {!loading && query && results.length === 0 && (
            <EmptySearch query={query} />
          )}

          {!loading && !query && (
            <SearchPrompt />
          )}

          {results.map(user => (
            <UserRow
              key={user.id}
              user={user}
              actionLabel="message →"
              loading={creating === user.id}
              onClick={() => startDM(user)}
            />
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── New group modal ──────────────────────────────────────────────

export function NewGroupModal({ onClose }) {
  const toast                           = useToast();
  const [name,     setName]             = useState('');
  const [selected, setSelected]         = useState([]);
  const [creating, setCreating]         = useState(false);
  const { query, setQuery, results, loading } = useUserSearch(selected);

  async function create() {
    if (!name.trim())        { toast('Group name is required', 'error'); return; }
    if (selected.length < 1) { toast('Add at least one member', 'error'); return; }
    setCreating(true);
    try {
      const conv = await chatAPI.createConversation({
        participant_ids: selected.map(u => u.id),
        is_group: true,
        name: name.trim(),
      });
      setState(s => ({
        conversations: [conv, ...s.conversations],
        activeConvId:  conv.id,
      }));
      toast(`Group "${name.trim()}" created`, 'success');
      onClose();
    } catch (err) {
      toast(classifyError(err).message, 'error');
    } finally {
      setCreating(false);
    }
  }

  function addMember(user) {
    setSelected(s => [...s, user]);
    setQuery('');
  }

  function removeMember(userId) {
    setSelected(s => s.filter(u => u.id !== userId));
  }

  return (
    <Modal title="New group chat" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Input
          label="GROUP NAME"
          placeholder="e.g. SpoonChat Team"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />

        <Input
          placeholder="Search members…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        {/* Selected members chips */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {selected.map(u => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 20,
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                fontSize: 12,
              }}>
                @{u.username}
                <button
                  onClick={() => removeMember(u.id)}
                  style={{
                    background: 'none', border: 'none',
                    color: 'var(--text-1)', cursor: 'pointer',
                    fontSize: 14, lineHeight: 1, padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Search results */}
        <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading && <div style={{ padding: 16, textAlign: 'center' }}><Spinner size={16} /></div>}
          {results.map(user => (
            <UserRow
              key={user.id}
              user={user}
              actionLabel="add +"
              loading={false}
              onClick={() => addMember(user)}
            />
          ))}
        </div>

        <Button onClick={create} loading={creating} style={{ justifyContent: 'center' }}>
          Create group
        </Button>
      </div>
    </Modal>
  );
}

// ─── Shared sub-components ────────────────────────────────────────

function UserRow({ user, actionLabel, loading, onClick }) {
  return (
    <div
      onClick={!loading ? onClick : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 12px', borderRadius: 'var(--radius-sm)',
        cursor: loading ? 'default' : 'pointer',
        transition: 'background var(--transition)',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = 'var(--bg-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar name={user.username} size={36} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>@{user.username}</div>
        <div style={{ fontSize: 12, color: 'var(--text-1)' }}>{user.email}</div>
      </div>
      {loading
        ? <Spinner size={16} />
        : <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
            {actionLabel}
          </span>
      }
    </div>
  );
}

function EmptySearch({ query }) {
  return (
    <div style={{
      textAlign: 'center', color: 'var(--text-2)',
      fontSize: 13, paddingTop: 40,
      fontFamily: 'var(--font-mono)',
    }}>
      No users found for "{query}"
    </div>
  );
}

function SearchPrompt() {
  return (
    <div style={{
      textAlign: 'center', color: 'var(--text-2)',
      fontSize: 13, paddingTop: 40,
      fontFamily: 'var(--font-mono)',
    }}>
      Type a username to search
    </div>
  );
}

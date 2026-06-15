// MessageInput — the text box and send button at the bottom of the chat.
// Auto-resizes as the user types.
// Enter sends, Shift+Enter inserts a newline.
// Broadcasts typing indicator with a 2-second debounce.

import { useState, useRef } from 'react';

const TYPING_TIMEOUT_MS = 2000;

export function MessageInput({ onSend, onTyping, disabled }) {
  const [text, setText]       = useState('');
  const typingTimer            = useRef(null);
  const textareaRef            = useRef(null);

  function handleChange(e) {
    setText(e.target.value);

    // Typing indicator
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), TYPING_TIMEOUT_MS);

    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    onTyping(false);
    clearTimeout(typingTimer.current);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-1)',
      display: 'flex', gap: 10, alignItems: 'flex-end',
    }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={
          disabled
            ? 'Select a conversation...'
            : 'Message… (Enter to send, Shift+Enter for new line)'
        }
        rows={1}
        style={{
          flex: 1, padding: '10px 14px',
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-0)',
          fontSize: 14, resize: 'none', outline: 'none',
          lineHeight: 1.5, minHeight: 42, maxHeight: 120,
          fontFamily: 'var(--font-sans)',
          transition: 'border-color var(--transition)',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        style={{
          width: 42, height: 42,
          borderRadius: 'var(--radius-md)',
          background: canSend ? 'var(--accent)' : 'var(--bg-3)',
          border: 'none',
          cursor: canSend ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          transition: 'all var(--transition)',
          color: 'var(--text-0)',
        }}
      >
        ↑
      </button>
    </div>
  );
}

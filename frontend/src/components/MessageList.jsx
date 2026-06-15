// MessageList — renders all messages in the active conversation.
// Handles auto-scroll to bottom on new messages.
// Groups consecutive messages from the same sender to reduce avatar noise.

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';

export function MessageList({ messages, currentUserId, isGroup }) {
  const bottomRef = useRef(null);

  // Scroll to bottom whenever a new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        gap: 12, color: 'var(--text-2)',
      }}>
        <div style={{ fontSize: 36 }}>🔒</div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          Messages are end-to-end encrypted
        </p>
        <p style={{ fontSize: 12 }}>Say hello</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingTop: 12, paddingBottom: 4 }}>
      {messages.map((msg, i) => {
        const isOwn       = msg.sender_id === currentUserId;
        const prevSenderId = i > 0 ? messages[i - 1].sender_id : null;
        const showAvatar  = !isOwn && msg.sender_id !== prevSenderId;
        const showName    = isGroup && showAvatar;

        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={isOwn}
            showAvatar={showAvatar}
            showName={showName}
          />
        );
      })}
      {/* Invisible anchor for auto-scroll */}
      <div ref={bottomRef} style={{ height: 8 }} />
    </div>
  );
}

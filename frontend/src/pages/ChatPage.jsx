// ChatPage — the main chat interface.
// Composes Sidebar, ConversationHeader, MessageList,
// TypingIndicator, ConnectionBar, and MessageInput.

import { useEffect, useState } from 'react';
import { Sidebar }             from '../components/Sidebar';
import { ConversationHeader }  from '../components/ConversationHeader';
import { MessageList }         from '../components/MessageList';
import { MessageInput }        from '../components/MessageInput';
import { TypingIndicator, ConnectionBar } from '../components/StatusIndicators';
import { NewDMModal, NewGroupModal }       from '../components/ConversationModals';
import { Button }              from '../components/ui';
import { useWebSocket }        from '../hooks/useWebSocket';
import { useAuth }             from '../hooks/useAuth';
import { useToast }            from '../context/ToastContext';
import { useGlobal, setState } from '../store';
import { wsManager }           from '../ws/wsManager';
import { chatAPI }             from '../api';
import { classifyError }       from '../utils/errors';
import { decryptMessage, loadKeyPair }      from '../crypto';

export function ChatPage({ onLogout }) {
  const toast         = useToast();
  const { logout }    = useAuth();
  const user          = useGlobal(s => s.currentUser);
  const conversations = useGlobal(s => s.conversations) || [];
  const activeConvId  = useGlobal(s => s.activeConversationId);
  const online        = useGlobal(s => s.onlineUsers);

  const messagesMap   = useGlobal(s => s.messages);
  const typingMap     = useGlobal(s => s.typingUsers);
  const messages      = messagesMap[activeConvId] || [];
  const typing        = typingMap[activeConvId] || {};

  const [modal, setModal] = useState(null); // 'dm' | 'group' | null

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null;

  // Typing names — exclude the current user
  const typingNames = Object.values(typing).filter(n => n !== user?.username);

  // WebSocket for the active conversation
  const { status: wsStatus, sendMessage, sendTyping } =
    useWebSocket(activeConvId, activeConv?.participants ?? []);

  // ── Load conversations on mount ──────────────────────────────
  useEffect(() => {
    chatAPI.getConversations()
      .then(response => {
        const data = response.data;
        setState({ conversations: data });
        if (data.length && !activeConvId) {
          setState({ activeConversationId: data[0].id });
        }
      })
      .catch(err => toast(classifyError(err).message, 'error'));
  }, []);

  // ── Load message history when conversation changes ───────────
useEffect(() => {
    if (!activeConvId) return;

    chatAPI.getMessages(activeConvId)
      .then(async (response) => {
        const data = response.data;
        const myKeys = loadKeyPair();
        
        const decrypted = await Promise.all(
          data.map(async msg => {
            // 2. Find the sender's public key from the participants list
            const sender = activeConv?.participants.find(p => p.id !== user?.id);
            
            let plaintext = null;
            if (myKeys && sender?.public_key) {
              plaintext = await decryptMessage(
                msg.ciphertext, 
                msg.nonce, 
                sender.public_key, // sender's public key
                myKeys.privateKey  // private key
              );
            }

            return {
              ...msg,
              decrypted: plaintext || '[Decryption failed]',
            };
          })
        );

        setState(s => ({
          messages: { ...s.messages, [activeConvId]: decrypted },
        }));
      })
      .catch(err => toast(classifyError(err).message, 'error'));
  }, [activeConvId, activeConv]);

  // ── Cleanup WebSocket on unmount ─────────────────────────────
  useEffect(() => () => wsManager.disconnect(), []);

  // ── Handlers ─────────────────────────────────────────────────

  async function handleSend(text) {
    const recipient = activeConv?.participants.find(p => p.id !== user?.id);
    if (!recipient?.public_key) {
      toast("Cannot send: The other user hasn't set up their encryption keys.", "error");
      return;
    }
    const ok = await sendMessage(text, recipient?.public_key);
    if (!ok) toast('Message failed — check your connection', 'error');
  }

  function handleLogout() {
    wsManager.disconnect();
    logout();
    onLogout();
  }

  // ─────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-0)', overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <Sidebar
        onNewDM={()    => setModal('dm')}
        onNewGroup={()  => setModal('group')}
        onLogout={handleLogout}
      />

      {/* ── Main area ───────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ConversationHeader
          conversation={activeConv}
          currentUserId={user?.id}
          online={online}
        />
        <ConnectionBar status={wsStatus} />

        {activeConv ? (
          <>
            <MessageList
              messages={messages}
              currentUserId={user?.id}
              isGroup={activeConv.is_group}
            />
            <TypingIndicator names={typingNames} />
            <MessageInput
              onSend={handleSend}
              onTyping={sendTyping}
              disabled={wsStatus === 'disconnected'}
            />
          </>
        ) : (
          <EmptyState
            onNewDM={()    => setModal('dm')}
            onNewGroup={()  => setModal('group')}
          />
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────── */}
      {modal === 'dm'    && <NewDMModal    onClose={() => setModal(null)} />}
      {modal === 'group' && <NewGroupModal onClose={() => setModal(null)} />}
    </div>
  );
}

//  Empty state

function EmptyState({ onNewDM, onNewGroup }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, color: 'var(--text-2)',
      animation: 'fadeIn 0.3s ease',
    }}>
      <div style={{ fontSize: 48 }}>🥄</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        Welcome to SpoonChat
      </div>
      <div style={{ fontSize: 13 }}>
        Start a conversation or pick one from the sidebar
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <Button variant="subtle" onClick={onNewDM}>✎ New message</Button>
        <Button variant="subtle" onClick={onNewGroup}>⊕ New group</Button>
      </div>
    </div>
  );
}

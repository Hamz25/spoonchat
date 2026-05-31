import { useEffect, useRef } from 'react'
import { chatAPI } from '../api'
import { decryptMessage, loadKeyPair } from '../crypto'
import { useWebSocket } from '../hooks/useWebSocket'
import MessageBubble from '../components/MessageBubble'
import MessageInput from '../components/MessageInput'
import useStore from '../store'

function ConversationPanel({ conversation }) {
  const currentUser = useStore((s) => s.currentUser)
  const messages = useStore((s) => s.messages[conversation.id] || [])
  const typingUsers = useStore((s) => s.typingUsers[conversation.id] || {})
  const setMessages = useStore((s) => s.setMessages)
  const bottomRef = useRef(null)

  // Get the other participant's public key for encryption
  const otherParticipant = conversation.participants.find(
    (p) => p.id !== currentUser?.id
  )

  const { sendMessage, sendTyping } = useWebSocket(
    conversation.id,
    conversation.participants
  )

  useEffect(() => {
    // Load message history when conversation opens
    chatAPI.getMessages(conversation.id).then(async (res) => {
      const myKeys = loadKeyPair()
      if (!myKeys) return

      // Decrypt all historical messages
      const decrypted = await Promise.all(
        res.data.map(async (msg) => {
          const sender = conversation.participants.find(
            (p) => p.id === msg.sender_id
          )
          const plaintext = sender?.public_key
            ? await decryptMessage(
                msg.ciphertext,
                msg.nonce,
                sender.public_key,
                myKeys.privateKey
              )
            : null
          return { ...msg, decrypted: plaintext || '[Encrypted]' }
        })
      )
      setMessages(conversation.id, decrypted)
    })
  }, [conversation.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (text) => {
    if (!otherParticipant?.public_key) {
      alert("Recipient hasn't set up encryption yet")
      return
    }
    await sendMessage(text, otherParticipant.public_key)
  }

  const typingList = Object.values(typingUsers).filter(
    (u) => u !== currentUser?.username
  )

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <span style={styles.headerName}>
          {conversation.is_group
            ? conversation.name
            : otherParticipant?.username}
        </span>
        <span style={styles.headerSub}>🔒 End-to-end encrypted</span>
      </div>
      <div style={styles.messages}>
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUser?.id}
          />
        ))}
        {typingList.length > 0 && (
          <p style={styles.typing}>
            {typingList.join(', ')} {typingList.length === 1 ? 'is' : 'are'} typing...
          </p>
        )}
        <div ref={bottomRef} />
      </div>
      <MessageInput onSend={handleSend} onTyping={sendTyping} />
    </div>
  )
}

export default function ChatPage() {
  const currentUser = useStore((s) => s.currentUser)
  const conversations = useStore((s) => s.conversations)
  const activeConversationId = useStore((s) => s.activeConversationId)
  const setConversations = useStore((s) => s.setConversations)
  const setActiveConversation = useStore((s) => s.setActiveConversation)

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  useEffect(() => {
    chatAPI.getConversations().then((res) => {
      setConversations(res.data)
      // Auto-select first conversation if none active
      if (res.data.length > 0 && !activeConversationId) {
        setActiveConversation(res.data[0].id)
      }
    })
  }, [])

  return (
    <div style={styles.app}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <span style={styles.appName}>SpoonChat</span>
          <span style={styles.username}>@{currentUser?.username}</span>
        </div>
        {conversations.map((conv) => {
          const other = conv.participants.find((p) => p.id !== currentUser?.id)
          return (
            <div
              key={conv.id}
              style={{
                ...styles.convItem,
                background: conv.id === activeConversationId
                  ? '#2a2a2a' : 'transparent',
              }}
              onClick={() => setActiveConversation(conv.id)}
            >
              <div style={styles.convName}>
                {conv.is_group ? conv.name : other?.username}
              </div>
              <div style={styles.convPreview}>
                {conv.last_message ? '🔒 Encrypted message' : 'No messages yet'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Main chat area */}
      {activeConversation
        ? <ConversationPanel conversation={activeConversation} />
        : (
          <div style={styles.empty}>
            <p>Select a conversation to start chatting</p>
          </div>
        )
      }
    </div>
  )
}

const styles = {
  app: { display: 'flex', height: '100vh', background: '#0f0f0f', color: '#fff' },
  sidebar: { width: '280px', borderRight: '1px solid #2a2a2a', display: 'flex', flexDirection: 'column' },
  sidebarHeader: { padding: '1.25rem', borderBottom: '1px solid #2a2a2a' },
  appName: { display: 'block', fontWeight: '600', fontSize: '1.1rem' },
  username: { fontSize: '0.8rem', color: '#666' },
  convItem: { padding: '0.9rem 1.25rem', cursor: 'pointer', borderBottom: '1px solid #1a1a1a' },
  convName: { fontWeight: '500', marginBottom: '0.2rem' },
  convPreview: { fontSize: '0.8rem', color: '#666' },
  panel: { flex: 1, display: 'flex', flexDirection: 'column' },
  header: { padding: '1rem 1.25rem', borderBottom: '1px solid #2a2a2a', background: '#1a1a1a' },
  headerName: { fontWeight: '600', display: 'block' },
  headerSub: { fontSize: '0.75rem', color: '#4CAF50' },
  messages: { flex: 1, overflowY: 'auto', padding: '1rem 0' },
  typing: { padding: '0 1rem', color: '#666', fontSize: '0.8rem', fontStyle: 'italic' },
  empty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' },
}

export default function MessageBubble({ message, isOwn }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  })

  return (
    <div style={{
      ...styles.wrapper,
      justifyContent: isOwn ? 'flex-end' : 'flex-start'
    }}>
      {!isOwn && (
        <span style={styles.sender}>{message.sender_username}</span>
      )}
      <div style={{
        ...styles.bubble,
        background: isOwn ? '#E8490F' : '#2a2a2a',
        borderRadius: isOwn
          ? '18px 18px 4px 18px'
          : '18px 18px 18px 4px',
      }}>
        <p style={styles.text}>
          {message.decrypted || '🔒 Encrypted message'}
        </p>
        <span style={styles.time}>{time}</span>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    display: 'flex', flexDirection: 'column',
    marginBottom: '0.5rem', padding: '0 1rem',
  },
  sender: {
    fontSize: '0.75rem', color: '#888',
    marginBottom: '0.2rem', marginLeft: '0.5rem',
  },
  bubble: {
    maxWidth: '65%', padding: '0.6rem 0.9rem',
  },
  text: { margin: 0, color: '#fff', fontSize: '0.95rem', lineHeight: 1.4 },
  time: { fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', float: 'right', marginTop: '0.25rem' },
}

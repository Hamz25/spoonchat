import { useState, useRef } from 'react'

export default function MessageInput({ onSend, onTyping }) {
  const [text, setText] = useState('')
  const typingTimer = useRef(null)

  const handleChange = (e) => {
    setText(e.target.value)
    onTyping(true)
    // Clear existing timer — reset the "stopped typing" countdown
    clearTimeout(typingTimer.current)
    // After 2 seconds of no typing, broadcast "stopped typing"
    typingTimer.current = setTimeout(() => onTyping(false), 2000)
  }

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    onTyping(false)
    clearTimeout(typingTimer.current)
  }

  const handleKeyDown = (e) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={styles.container}>
      <textarea
        style={styles.input}
        placeholder="Message..."
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={1}
      />
      <button style={styles.button} onClick={handleSend}>
        Send
      </button>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex', gap: '0.5rem',
    padding: '1rem', borderTop: '1px solid #2a2a2a',
    background: '#1a1a1a',
  },
  input: {
    flex: 1, padding: '0.75rem',
    borderRadius: '8px', border: '1px solid #333',
    background: '#111', color: '#fff',
    fontSize: '0.95rem', resize: 'none', outline: 'none',
  },
  button: {
    padding: '0 1.25rem', borderRadius: '8px',
    background: '#E8490F', color: '#fff',
    border: 'none', cursor: 'pointer',
    fontWeight: '500',
  },
}

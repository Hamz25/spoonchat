import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(form.username, form.password)
      window.location.href = '/'
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>SpoonChat</h1>
        <p style={styles.subtitle}>End-to-end encrypted messaging</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    height: '100vh', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    background: '#0f0f0f',
  },
  card: {
    background: '#1a1a1a', padding: '2.5rem',
    borderRadius: '12px', width: '360px',
    border: '1px solid #2a2a2a',
  },
  title: { color: '#ffffff', margin: 0, fontSize: '1.8rem' },
  subtitle: { color: '#666', marginTop: '0.25rem', marginBottom: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  input: {
    padding: '0.75rem', borderRadius: '8px',
    border: '1px solid #333', background: '#111',
    color: '#fff', fontSize: '0.95rem',
  },
  button: {
    padding: '0.75rem', borderRadius: '8px',
    background: '#E8490F', color: '#fff',
    border: 'none', cursor: 'pointer',
    fontSize: '1rem', fontWeight: '500',
    marginTop: '0.5rem',
  },
  error: { color: '#ff4444', fontSize: '0.875rem', margin: 0 },
}

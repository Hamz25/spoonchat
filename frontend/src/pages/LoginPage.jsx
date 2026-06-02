// LoginPage — sign-in form with validation and error handling.

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Input, Button } from '../components/ui';
import { classifyError, mapFieldErrors, ErrorType } from '../utils/errors';

export function LoginPage({ onSuccess, onSwitchToRegister }) {
  const { login }  = useAuth();
  const toast      = useToast();
  const [form, setForm]     = useState({ username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = 'Required';
    if (!form.password)        e.password = 'Required';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);

    try {
      await login(form.username, form.password);
      onSuccess();
    } catch (err) {
      const classified = classifyError(err);
      if (classified.type === ErrorType.AUTH) {
        // Don't leak which field is wrong
        setErrors({ password: 'Invalid username or password' });
      } else if (classified.type === ErrorType.VALIDATION) {
        setErrors(mapFieldErrors(err.response?.data));
      } else {
        toast(classified.message, 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          <h2 style={{ fontWeight: 600, marginBottom: 4 }}>Welcome back</h2>
          <p style={{ color: 'var(--text-1)', fontSize: 13 }}>Sign in to your account</p>
        </div>

        <Input
          label="USERNAME"
          placeholder="spoon"
          value={form.username}
          onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          error={errors.username}
          autoFocus
        />
        <Input
          label="PASSWORD"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          error={errors.password}
        />

        <Button
          type="submit"
          loading={loading}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Sign in
        </Button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-1)' }}>
          No account?{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            style={{
              background: 'none', border: 'none',
              color: 'var(--accent)', cursor: 'pointer',
              fontSize: 13, fontFamily: 'var(--font-sans)',
            }}
          >
            Create one
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

// ─── Shared auth layout ───────────────────────────────────────────

export function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)',
      backgroundImage: [
        'radial-gradient(ellipse at 20% 50%, rgba(232,73,15,0.04) 0%, transparent 60%)',
        'radial-gradient(ellipse at 80% 20%, rgba(88,166,255,0.04) 0%, transparent 60%)',
      ].join(', '),
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 16, animation: 'fadeIn 0.3s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{
              width: 36, height: 36, background: 'var(--accent)',
              borderRadius: 8, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 18,
            }}>
              🥄
            </div>
            <span style={{
              fontSize: 24, fontWeight: 700,
              fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em',
            }}>
              SpoonChat
            </span>
          </div>
          <p style={{ color: 'var(--text-1)', fontSize: 13, fontFamily: 'var(--font-mono)' }}>
            end-to-end encrypted · private
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-1)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 32, boxShadow: 'var(--shadow)',
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

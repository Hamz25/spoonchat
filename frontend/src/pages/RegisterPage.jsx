// RegisterPage — account creation form with validation and error handling.

import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Input, Button } from '../components/ui';
import { AuthLayout } from './LoginPage';
import { classifyError, mapFieldErrors, ErrorType } from '../utils/errors';

export function RegisterPage({ onSuccess, onSwitchToLogin }) {
  const { register } = useAuth();
  const toast        = useToast();
  const [form, setForm]     = useState({ username: '', email: '', password: '', password2: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.username.trim())        e.username  = 'Required';
    else if (form.username.length < 3) e.username  = 'At least 3 characters';
    if (!form.email.includes('@'))     e.email     = 'Enter a valid email';
    if (form.password.length < 8)      e.password  = 'At least 8 characters';
    if (form.password !== form.password2) e.password2 = 'Passwords do not match';
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);

    try {
      await register(form.username, form.email, form.password, form.password2);
      toast('Account created — welcome to SpoonChat!', 'success');
      onSuccess();
    } catch (err) {
      const classified = classifyError(err);
      if (classified.type === ErrorType.VALIDATION) {
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
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontWeight: 600, marginBottom: 4 }}>Create account</h2>
          <p style={{ color: 'var(--text-1)', fontSize: 13 }}>Join SpoonChat</p>
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
          label="EMAIL"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          error={errors.email}
        />
        <Input
          label="PASSWORD"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          error={errors.password}
        />
        <Input
          label="CONFIRM PASSWORD"
          type="password"
          placeholder="••••••••"
          value={form.password2}
          onChange={e => setForm(f => ({ ...f, password2: e.target.value }))}
          error={errors.password2}
        />

        <Button
          type="submit"
          loading={loading}
          style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
        >
          Create account
        </Button>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-1)' }}>
          Already have one?{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{
              background: 'none', border: 'none',
              color: 'var(--accent)', cursor: 'pointer',
              fontSize: 13, fontFamily: 'var(--font-sans)',
            }}
          >
            Sign in
          </button>
        </p>
      </form>
    </AuthLayout>
  );
}

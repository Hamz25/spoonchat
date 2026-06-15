// Reusable UI primitives used throughout SpoonChat.
// Each one is a single-purpose, self-contained component.

// ─── Spinner ──────────────────────────────────────────────────────

export function Spinner({ size = 16, color = 'var(--accent)' }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}22`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

// ─── Avatar ───────────────────────────────────────────────────────

const AVATAR_COLORS = ['#E8490F', '#3fb950', '#58a6ff', '#d29922', '#bc8cff'];

export function Avatar({ name = '?', size = 36, online = false }) {
  const color    = AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `${color}22`,
        border: `1.5px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)',
        fontSize: size * 0.35,
        color, fontWeight: 600,
      }}>
        {initials}
      </div>
      {online && (
        <div style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28,
          borderRadius: '50%',
          background: 'var(--green)',
          border: '2px solid var(--bg-1)',
        }} />
      )}
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────

export function Input({ label, error, style: extraStyle, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{
          fontSize: 12, color: 'var(--text-1)',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.05em',
        }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          padding: '10px 14px',
          background: 'var(--bg-2)',
          border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text-0)',
          fontSize: 14, outline: 'none',
          transition: 'border-color var(--transition)',
          fontFamily: 'var(--font-sans)',
          ...extraStyle,
        }}
        onFocus={e  => (e.target.style.borderColor = error ? 'var(--red)' : 'var(--accent)')}
        onBlur={e   => (e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)')}
      />
      {error && (
        <span style={{ fontSize: 11, color: 'var(--red)', fontFamily: 'var(--font-mono)' }}>
          {error}
        </span>
      )}
    </div>
  );
}

// ─── Button ───────────────────────────────────────────────────────

export function Button({
  children,
  variant  = 'primary',
  loading  = false,
  danger   = false,
  style: extraStyle,
  ...props
}) {
  const base = {
    padding: '10px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    cursor: loading || props.disabled ? 'not-allowed' : 'pointer',
    fontSize: 14, fontWeight: 500,
    display: 'flex', alignItems: 'center', gap: 8,
    transition: 'all var(--transition)',
    fontFamily: 'var(--font-sans)',
    opacity: props.disabled && !loading ? 0.5 : 1,
  };

  const variants = {
    primary: { background: danger ? 'var(--red)' : 'var(--accent)', color: '#fff' },
    ghost:   { background: 'transparent', color: 'var(--text-1)', border: '1px solid var(--border)' },
    subtle:  { background: 'var(--bg-3)', color: 'var(--text-0)' },
  };

  return (
    <button
      {...props}
      style={{ ...base, ...variants[variant], ...extraStyle }}
      onMouseEnter={e => { if (!loading && !props.disabled) e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {loading && <Spinner size={14} color="#fff" />}
      {children}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────

import { useEffect } from 'react';

export function Modal({ title, onClose, children }) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--border-active)',
        borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: 480, margin: 16,
        boxShadow: 'var(--shadow-lg)',
        animation: 'fadeIn 0.2s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-1)', cursor: 'pointer',
              fontSize: 18, lineHeight: 1, padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// Toast notification system.
// Wrap your app in <ToastProvider> and call useToast() in any component.
//
// Usage:
//   const toast = useToast();
//   toast('Something went wrong', 'error');
//   toast('Saved!', 'success');
//   toast('Heads up', 'info');

import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts(t => t.filter(x => x.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={add}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}

function Toast({ toast }) {
  const colors = {
    error:   { bg: 'var(--red-dim)',   border: 'var(--red)',   color: 'var(--red)',   icon: '✗' },
    success: { bg: 'var(--green-dim)', border: 'var(--green)', color: 'var(--green)', icon: '✓' },
    info:    { bg: 'var(--bg-3)',      border: 'var(--border-active)', color: 'var(--text-0)', icon: '·' },
  };
  const c = colors[toast.type] || colors.info;

  return (
    <div style={{
      padding: '10px 16px',
      borderRadius: 'var(--radius-md)',
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: c.color,
      fontSize: 13,
      fontFamily: 'var(--font-mono)',
      animation: 'toast 3.5s ease forwards',
      maxWidth: 320,
      boxShadow: 'var(--shadow)',
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
    }}>
      <span style={{ flexShrink: 0, fontWeight: 600 }}>{c.icon}</span>
      <span>{toast.message}</span>
    </div>
  );
}

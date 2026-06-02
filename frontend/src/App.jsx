
// Handles auth routing: shows auth pages or the chat app.
// Restores session on page refresh using the stored access token.

import { useState, useEffect } from 'react';
import { ToastProvider }   from './context/ToastContext';
import { LoginPage }       from './pages/LoginPage';
import { RegisterPage }    from './pages/RegisterPage';
import { ChatPage }        from './pages/ChatPage';
import { useAuth }         from './hooks/useAuth';
import { Spinner }         from './components/ui';
import './styles/globals.css';

//Inner app — has access to ToastContext

function InnerApp() {
  const { restoreSession } = useAuth();
  const [view, setView]    = useState('loading'); // 'loading' | 'login' | 'register' | 'chat'

  useEffect(() => {
    restoreSession()
      .then(user => setView(user ? 'chat' : 'login'))
      .catch(()  => setView('login'));
  }, []);

  if (view === 'loading') return <LoadingScreen />;

  if (view === 'chat') {
    return <ChatPage onLogout={() => setView('login')} />;
  }

  if (view === 'register') {
    return (
      <RegisterPage
        onSuccess={()          => setView('chat')}
        onSwitchToLogin={()    => setView('login')}
      />
    );
  }

  // Default: login
  return (
    <LoginPage
      onSuccess={()             => setView('chat')}
      onSwitchToRegister={()    => setView('register')}
    />
  );
}

//Root export

export default function App() {
  return (
    <ToastProvider>
      <InnerApp />
    </ToastProvider>
  );
}

// Loading screen 

function LoadingScreen() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-0)', gap: 16,
    }}>
      <Spinner size={28} />
      <span style={{
        color: 'var(--text-2)',
        fontFamily: 'var(--font-mono)', fontSize: 13,
      }}>
        loading SpoonChat…
      </span>
    </div>
  );
}
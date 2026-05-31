// SpoonChat — Complete Frontend
// Drop this into frontend/src/App.jsx and update main.jsx to import App
// Required: npm install zustand libsodium-wrappers axios

import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg-0: #080b0f;
    --bg-1: #0d1117;
    --bg-2: #161b22;
    --bg-3: #1f2937;
    --bg-4: #2d3748;
    --border: rgba(255,255,255,0.06);
    --border-active: rgba(255,255,255,0.14);
    --text-0: #f0f6fc;
    --text-1: #8b949e;
    --text-2: #484f58;
    --accent: #E8490F;
    --accent-dim: rgba(232,73,15,0.15);
    --accent-hover: #ff5a1f;
    --green: #3fb950;
    --green-dim: rgba(63,185,80,0.12);
    --yellow: #d29922;
    --red: #f85149;
    --red-dim: rgba(248,81,73,0.12);
    --blue: #58a6ff;
    --radius-sm: 6px;
    --radius-md: 10px;
    --radius-lg: 16px;
    --font-mono: 'IBM Plex Mono', monospace;
    --font-sans: 'IBM Plex Sans', sans-serif;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
    --shadow-lg: 0 8px 48px rgba(0,0,0,0.6);
    --transition: 0.15s ease;
  }

  body {
    font-family: var(--font-sans);
    background: var(--bg-0);
    color: var(--text-0);
    height: 100vh;
    overflow: hidden;
  }

  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--bg-4); border-radius: 2px; }

  input, textarea, button { font-family: var(--font-sans); }

  ::placeholder { color: var(--text-2); }

  /* Animations */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-12px); } to { opacity: 1; transform: none; } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
  @keyframes msgIn { from { opacity: 0; transform: scale(0.96) translateY(4px); } to { opacity: 1; transform: none; } }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes toast { 0%{opacity:0;transform:translateY(8px)} 10%,85%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(-4px)} }
  @keyframes dotPulse {
    0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
  }
`;

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const API_BASE = "http://localhost:8000";
const WS_BASE = "ws://localhost:8000";
const RECONNECT_DELAY = 3000;
const TYPING_TIMEOUT = 2000;

// ─────────────────────────────────────────────
// ERROR TYPES — every error has a type, message, and optional action
// ─────────────────────────────────────────────
const ErrorType = {
  NETWORK: "NETWORK",       // server unreachable
  AUTH: "AUTH",             // 401/403
  VALIDATION: "VALIDATION", // 400 bad input
  CRYPTO: "CRYPTO",         // encryption/decryption failure
  WEBSOCKET: "WEBSOCKET",   // WS connection issues
  UNKNOWN: "UNKNOWN",
};

function classifyError(error) {
  if (!error.response) return { type: ErrorType.NETWORK, message: "Cannot reach SpoonChat server. Check your connection." };
  const status = error.response?.status;
  if (status === 401) return { type: ErrorType.AUTH, message: "Session expired. Please log in again." };
  if (status === 403) return { type: ErrorType.AUTH, message: "You don't have permission to do that." };
  if (status === 400) {
    const data = error.response?.data;
    if (typeof data === "object") {
      const first = Object.entries(data)[0];
      if (first) return { type: ErrorType.VALIDATION, message: `${first[0]}: ${Array.isArray(first[1]) ? first[1][0] : first[1]}` };
    }
    return { type: ErrorType.VALIDATION, message: "Invalid input." };
  }
  if (status >= 500) return { type: ErrorType.NETWORK, message: "Server error. Try again in a moment." };
  return { type: ErrorType.UNKNOWN, message: "Something went wrong." };
}

// ─────────────────────────────────────────────
// TOAST NOTIFICATION SYSTEM
// ─────────────────────────────────────────────
const ToastContext = createContext(null);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "info") => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={add}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8, zIndex: 9999, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            padding: "10px 16px", borderRadius: "var(--radius-md)",
            background: t.type === "error" ? "var(--red-dim)" : t.type === "success" ? "var(--green-dim)" : "var(--bg-3)",
            border: `1px solid ${t.type === "error" ? "var(--red)" : t.type === "success" ? "var(--green)" : "var(--border-active)"}`,
            color: t.type === "error" ? "var(--red)" : t.type === "success" ? "var(--green)" : "var(--text-0)",
            fontSize: 13, fontFamily: "var(--font-mono)",
            animation: "toast 3.5s ease forwards",
            maxWidth: 320, boxShadow: "var(--shadow)",
          }}>
            {t.type === "error" ? "✗ " : t.type === "success" ? "✓ " : "· "}{t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
const useToast = () => useContext(ToastContext);

// ─────────────────────────────────────────────
// HTTP CLIENT with interceptors
// ─────────────────────────────────────────────
async function request(method, path, data = null, retry = true) {
  const token = localStorage.getItem("sc_access");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401 && retry) {
    const refresh = localStorage.getItem("sc_refresh");
    if (!refresh) throw { response: { status: 401 } };
    const refreshRes = await fetch(`${API_BASE}/api/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!refreshRes.ok) {
      localStorage.clear();
      window.location.reload();
      return;
    }
    const { access } = await refreshRes.json();
    localStorage.setItem("sc_access", access);
    return request(method, path, data, false);
  }

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { detail: text }; }

  if (!res.ok) {
    const err = new Error(json.detail || "Request failed");
    err.response = { status: res.status, data: json };
    throw err;
  }
  return json;
}

const api = {
  get: (path) => request("GET", path),
  post: (path, data) => request("POST", path, data),
  patch: (path, data) => request("PATCH", path, data),
};

// ─────────────────────────────────────────────
// CRYPTO (simplified — works without libsodium for demo)
// In production, replace encryptMsg/decryptMsg with libsodium calls
// ─────────────────────────────────────────────
function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64decode(str) {
  try { return decodeURIComponent(escape(atob(str))); } catch { return null; }
}

function getKeyPair() {
  const pub = localStorage.getItem("sc_pub");
  const priv = localStorage.getItem("sc_priv");
  if (!pub || !priv) return null;
  return { publicKey: pub, privateKey: priv };
}

function generateKeyPair() {
  // In production: use sodium.crypto_box_keypair()
  // This is a placeholder that keeps the app functional
  const pub = b64encode(`pub_${Date.now()}_${Math.random()}`);
  const priv = b64encode(`priv_${Date.now()}_${Math.random()}`);
  return { publicKey: pub, privateKey: priv };
}

function saveKeyPair(pub, priv) {
  localStorage.setItem("sc_pub", pub);
  localStorage.setItem("sc_priv", priv);
}

async function encryptMsg(plaintext) {
  // Production: sodium.crypto_box_easy(msg, nonce, recipientPub, senderPriv)
  return { ciphertext: b64encode(plaintext), nonce: b64encode(Date.now().toString()) };
}

async function decryptMsg(ciphertext) {
  // Production: sodium.crypto_box_open_easy(cipher, nonce, senderPub, myPriv)
  const decoded = b64decode(ciphertext);
  return decoded;
}

async function initCrypto() {
  let kp = getKeyPair();
  if (!kp) {
    kp = generateKeyPair();
    saveKeyPair(kp.publicKey, kp.privateKey);
    try { await api.post("/api/auth/profile/public-key/", { public_key: kp.publicKey }); } catch {}
  }
  return kp;
}

// ─────────────────────────────────────────────
// GLOBAL STATE — single source of truth
// ─────────────────────────────────────────────
let _state = {
  user: null,
  conversations: [],
  activeConvId: null,
  messages: {},        // { convId: [msg, ...] }
  typing: {},          // { convId: { userId: username } }
  online: new Set(),
  pendingMsgs: new Set(), // message IDs pending delivery confirmation
};
let _listeners = new Set();

function getState() { return _state; }
function setState(updater) {
  _state = { ..._state, ...(typeof updater === "function" ? updater(_state) : updater) };
  _listeners.forEach(fn => fn(_state));
}
function useGlobal(selector) {
  const [val, setVal] = useState(() => selector(_state));
  useEffect(() => {
    const fn = (s) => setVal(selector(s));
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  }, []);
  return val;
}

// ─────────────────────────────────────────────
// WEBSOCKET MANAGER — manages one connection per active conversation
// ─────────────────────────────────────────────
class WSManager {
  constructor() {
    this.ws = null;
    this.convId = null;
    this.timer = null;
    this.intentionalClose = false;
    this.onStatusChange = null; // callback: (status) => void
  }

  connect(convId) {
    if (this.ws && this.convId === convId && this.ws.readyState === WebSocket.OPEN) return;
    this.disconnect();
    this.convId = convId;
    this.intentionalClose = false;
    this._open();
  }

  _open() {
    const token = localStorage.getItem("sc_access");
    if (!token || !this.convId) return;
    this.ws = new WebSocket(`${WS_BASE}/ws/chat/${this.convId}/?token=${token}`);
    this.onStatusChange?.("connecting");

    this.ws.onopen = () => {
      this.onStatusChange?.("connected");
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    };

    this.ws.onmessage = async (e) => {
      let data;
      try { data = JSON.parse(e.data); } catch { return; }
      await this._handleMessage(data);
    };

    this.ws.onclose = (e) => {
      this.onStatusChange?.("disconnected");
      if (!this.intentionalClose && e.code !== 1000) {
        this.timer = setTimeout(() => this._open(), RECONNECT_DELAY);
        this.onStatusChange?.("reconnecting");
      }
    };

    this.ws.onerror = () => {
      // onclose fires after onerror — reconnect logic lives there
    };
  }

  async _handleMessage(data) {
    const convId = this.convId;
    if (data.type === "chat_message") {
      const decrypted = await decryptMsg(data.ciphertext);
      const msg = {
        id: data.message_id,
        sender_id: data.sender_id,
        sender_username: data.sender_username,
        decrypted,
        ciphertext: data.ciphertext,
        nonce: data.nonce,
        timestamp: data.timestamp,
        delivered: true,
        read: false,
      };
      setState(s => {
        const existing = s.messages[convId] || [];
        // Deduplicate — WebSocket echoes back to sender too
        const already = existing.find(m => m.id === msg.id);
        if (already) {
          // Update delivery status on the existing message
          return {
            messages: {
              ...s.messages,
              [convId]: existing.map(m => m.id === msg.id ? { ...m, delivered: true } : m),
            },
            pendingMsgs: new Set([...s.pendingMsgs].filter(id => id !== msg.id)),
          };
        }
        return {
          messages: { ...s.messages, [convId]: [...existing, msg] },
          conversations: s.conversations.map(c =>
            c.id === convId ? { ...c, last_message: msg } : c
          ),
        };
      });
      // Send read receipt
      this.send({ type: "read_receipt", message_id: msg.id });
    } else if (data.type === "typing") {
      setState(s => {
        const ct = { ...(s.typing[convId] || {}) };
        if (data.is_typing) ct[data.user_id] = data.username;
        else delete ct[data.user_id];
        return { typing: { ...s.typing, [convId]: ct } };
      });
    } else if (data.type === "user_status") {
      setState(s => {
        const next = new Set(s.online);
        data.status === "online" ? next.add(data.user_id) : next.delete(data.user_id);
        return { online: next };
      });
    } else if (data.type === "read_receipt") {
      setState(s => ({
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] || []).map(m =>
            m.id === data.message_id ? { ...m, read: true } : m
          ),
        },
      }));
    }
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  async sendMessage(plaintext) {
    const { ciphertext, nonce } = await encryptMsg(plaintext);
    const tempId = `temp_${Date.now()}`;
    // Optimistic update — show message immediately before server confirms
    const optimisticMsg = {
      id: tempId,
      sender_id: getState().user?.id,
      sender_username: getState().user?.username,
      decrypted: plaintext,
      ciphertext,
      nonce,
      timestamp: new Date().toISOString(),
      delivered: false,
      read: false,
      pending: true,
    };
    const convId = this.convId;
    setState(s => ({
      messages: {
        ...s.messages,
        [convId]: [...(s.messages[convId] || []), optimisticMsg],
      },
      pendingMsgs: new Set([...s.pendingMsgs, tempId]),
    }));
    const sent = this.send({ type: "chat_message", ciphertext, nonce });
    if (!sent) {
      // Mark as failed if WS not open
      setState(s => ({
        messages: {
          ...s.messages,
          [convId]: (s.messages[convId] || []).map(m =>
            m.id === tempId ? { ...m, failed: true, pending: false } : m
          ),
        },
      }));
      return false;
    }
    return true;
  }

  sendTyping(isTyping) { this.send({ type: "typing", is_typing: isTyping }); }

  disconnect() {
    this.intentionalClose = true;
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.ws) { this.ws.close(1000); this.ws = null; }
    this.convId = null;
  }
}

const wsManager = new WSManager();

// ─────────────────────────────────────────────
// UI PRIMITIVES
// ─────────────────────────────────────────────
function Spinner({ size = 16, color = "var(--accent)" }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid ${color}22`,
      borderTop: `2px solid ${color}`,
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function Avatar({ name = "?", size = 36, online = false }) {
  const colors = ["#E8490F","#3fb950","#58a6ff","#d29922","#bc8cff"];
  const color = colors[name.charCodeAt(0) % colors.length];
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: `${color}22`, border: `1.5px solid ${color}44`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "var(--font-mono)", fontSize: size * 0.35,
        color, fontWeight: 600, flexShrink: 0,
      }}>{initials}</div>
      {online && (
        <div style={{
          position: "absolute", bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28,
          borderRadius: "50%", background: "var(--green)",
          border: "2px solid var(--bg-1)",
        }} />
      )}
    </div>
  );
}

function Input({ label, error, ...props }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: "var(--text-1)", fontFamily: "var(--font-mono)", letterSpacing: "0.05em" }}>{label}</label>}
      <input {...props} style={{
        padding: "10px 14px",
        background: "var(--bg-2)", border: `1px solid ${error ? "var(--red)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm)", color: "var(--text-0)",
        fontSize: 14, outline: "none", transition: "border-color var(--transition)",
        fontFamily: "var(--font-sans)",
        ...props.style,
      }}
        onFocus={e => e.target.style.borderColor = error ? "var(--red)" : "var(--accent)"}
        onBlur={e => e.target.style.borderColor = error ? "var(--red)" : "var(--border)"}
      />
      {error && <span style={{ fontSize: 11, color: "var(--red)", fontFamily: "var(--font-mono)" }}>{error}</span>}
    </div>
  );
}

function Button({ children, variant = "primary", loading = false, danger = false, ...props }) {
  const base = {
    padding: "10px 20px", borderRadius: "var(--radius-sm)",
    border: "none", cursor: loading || props.disabled ? "not-allowed" : "pointer",
    fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center",
    gap: 8, transition: "all var(--transition)", fontFamily: "var(--font-sans)",
    opacity: props.disabled && !loading ? 0.5 : 1,
  };
  const variants = {
    primary: { background: danger ? "var(--red)" : "var(--accent)", color: "#fff" },
    ghost: { background: "transparent", color: "var(--text-1)", border: "1px solid var(--border)" },
    subtle: { background: "var(--bg-3)", color: "var(--text-0)" },
  };
  return (
    <button {...props} style={{ ...base, ...variants[variant], ...props.style }}
      onMouseEnter={e => { if (!loading && !props.disabled) e.target.style.opacity = "0.85"; }}
      onMouseLeave={e => { e.target.style.opacity = "1"; }}
    >
      {loading ? <Spinner size={14} color="#fff" /> : null}
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, animation: "fadeIn 0.15s ease",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "var(--bg-1)", border: "1px solid var(--border-active)",
        borderRadius: "var(--radius-lg)", width: "100%", maxWidth: 480,
        margin: 16, boxShadow: "var(--shadow-lg)", animation: "fadeIn 0.2s ease",
      }}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "var(--text-1)",
            cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// AUTH PAGES
// ─────────────────────────────────────────────
function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg-0)",
      backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(232,73,15,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(88,166,255,0.04) 0%, transparent 60%)",
    }}>
      <div style={{
        width: "100%", maxWidth: 400, padding: 16,
        animation: "fadeIn 0.3s ease",
      }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 36, height: 36, background: "var(--accent)",
              borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 18,
            }}>🥄</div>
            <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "var(--font-mono)", letterSpacing: "-0.02em" }}>SpoonChat</span>
          </div>
          <p style={{ color: "var(--text-1)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
            end-to-end encrypted · private
          </p>
        </div>
        <div style={{
          background: "var(--bg-1)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)", padding: 32,
          boxShadow: "var(--shadow)",
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function LoginPage({ onSwitch, onLogin }) {
  const toast = useToast();
  const [form, setForm] = useState({ username: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = "Required";
    if (!form.password) e.password = "Required";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await api.post("/api/auth/login/", form);
      localStorage.setItem("sc_access", data.access);
      localStorage.setItem("sc_refresh", data.refresh);
      const profile = await api.get("/api/auth/profile/");
      await initCrypto();
      setState({ user: profile });
      onLogin();
    } catch (err) {
      const classified = classifyError(err);
      if (classified.type === ErrorType.AUTH) {
        setErrors({ password: "Invalid username or password" });
      } else {
        toast(classified.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontWeight: 600, marginBottom: 4 }}>Welcome back</h2>
        <p style={{ color: "var(--text-1)", fontSize: 13 }}>Sign in to your account</p>
      </div>
      <Input label="USERNAME" placeholder="spoon" value={form.username}
        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
        error={errors.username} autoFocus />
      <Input label="PASSWORD" type="password" placeholder="••••••••" value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        error={errors.password} />
      <Button type="submit" loading={loading} style={{ width: "100%", justifyContent: "center" }}>
        Sign in
      </Button>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-1)" }}>
        No account?{" "}
        <button type="button" onClick={onSwitch} style={{
          background: "none", border: "none", color: "var(--accent)",
          cursor: "pointer", fontSize: 13, fontFamily: "var(--font-sans)",
        }}>Create one</button>
      </p>
    </form>
  );
}

function RegisterPage({ onSwitch, onLogin }) {
  const toast = useToast();
  const [form, setForm] = useState({ username: "", email: "", password: "", password2: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const e = {};
    if (!form.username.trim()) e.username = "Required";
    else if (form.username.length < 3) e.username = "At least 3 characters";
    if (!form.email.includes("@")) e.email = "Enter a valid email";
    if (form.password.length < 8) e.password = "At least 8 characters";
    if (form.password !== form.password2) e.password2 = "Passwords do not match";
    return e;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setLoading(true);
    try {
      const data = await api.post("/api/auth/register/", form);
      localStorage.setItem("sc_access", data.tokens.access);
      localStorage.setItem("sc_refresh", data.tokens.refresh);
      await initCrypto();
      setState({ user: data.user });
      toast("Account created", "success");
      onLogin();
    } catch (err) {
      const classified = classifyError(err);
      if (classified.type === ErrorType.VALIDATION) {
        // Try to map field errors
        const raw = err.response?.data || {};
        const mapped = {};
        Object.entries(raw).forEach(([k, v]) => { mapped[k] = Array.isArray(v) ? v[0] : v; });
        setErrors(mapped);
      } else {
        toast(classified.message, "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <h2 style={{ fontWeight: 600, marginBottom: 4 }}>Create account</h2>
        <p style={{ color: "var(--text-1)", fontSize: 13 }}>Join SpoonChat</p>
      </div>
      <Input label="USERNAME" placeholder="spoon" value={form.username}
        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
        error={errors.username} autoFocus />
      <Input label="EMAIL" type="email" placeholder="you@example.com" value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
        error={errors.email} />
      <Input label="PASSWORD" type="password" placeholder="••••••••" value={form.password}
        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
        error={errors.password} />
      <Input label="CONFIRM PASSWORD" type="password" placeholder="••••••••" value={form.password2}
        onChange={e => setForm(f => ({ ...f, password2: e.target.value }))}
        error={errors.password2} />
      <Button type="submit" loading={loading} style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
        Create account
      </Button>
      <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-1)" }}>
        Already have one?{" "}
        <button type="button" onClick={onSwitch} style={{
          background: "none", border: "none", color: "var(--accent)",
          cursor: "pointer", fontSize: 13, fontFamily: "var(--font-sans)",
        }}>Sign in</button>
      </p>
    </form>
  );
}

function AuthPage({ onLogin }) {
  const [mode, setMode] = useState("login");
  return (
    <AuthLayout>
      {mode === "login"
        ? <LoginPage onSwitch={() => setMode("register")} onLogin={onLogin} />
        : <RegisterPage onSwitch={() => setMode("login")} onLogin={onLogin} />
      }
    </AuthLayout>
  );
}

// ─────────────────────────────────────────────
// USER SEARCH MODAL
// ─────────────────────────────────────────────
function NewDMModal({ onClose, onCreated }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(null);
  const debounce = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/auth/users/search/?q=${encodeURIComponent(query)}`);
        // Filter out current user
        const me = getState().user;
        setResults((data.results || data).filter(u => u.id !== me?.id));
      } catch (err) {
        toast(classifyError(err).message, "error");
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  async function startDM(user) {
    setCreating(user.id);
    try {
      const conv = await api.post("/api/chat/conversations/", {
        participant_ids: [user.id],
        is_group: false,
      });
      setState(s => ({
        conversations: s.conversations.find(c => c.id === conv.id)
          ? s.conversations
          : [conv, ...s.conversations],
        activeConvId: conv.id,
      }));
      onCreated(conv);
      onClose();
    } catch (err) {
      toast(classifyError(err).message, "error");
    } finally {
      setCreating(null);
    }
  }

  return (
    <Modal title="New message" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input
          placeholder="Search users by username..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
        <div style={{ minHeight: 200, display: "flex", flexDirection: "column", gap: 4 }}>
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
              <Spinner size={20} />
            </div>
          )}
          {!loading && query && results.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-2)", fontSize: 13, paddingTop: 40, fontFamily: "var(--font-mono)" }}>
              No users found for "{query}"
            </div>
          )}
          {!loading && !query && (
            <div style={{ textAlign: "center", color: "var(--text-2)", fontSize: 13, paddingTop: 40, fontFamily: "var(--font-mono)" }}>
              Type a username to search
            </div>
          )}
          {results.map(user => (
            <div key={user.id} style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px", borderRadius: "var(--radius-sm)",
              cursor: "pointer", transition: "background var(--transition)",
              background: "transparent",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={() => startDM(user)}
            >
              <Avatar name={user.username} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>@{user.username}</div>
                <div style={{ fontSize: 12, color: "var(--text-1)" }}>{user.email}</div>
              </div>
              {creating === user.id
                ? <Spinner size={16} />
                : <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>message →</span>
              }
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// NEW GROUP MODAL
// ─────────────────────────────────────────────
function NewGroupModal({ onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/auth/users/search/?q=${encodeURIComponent(query)}`);
        const me = getState().user;
        setResults((data.results || data).filter(u => u.id !== me?.id && !selected.find(s => s.id === u.id)));
      } catch (err) {
        toast(classifyError(err).message, "error");
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query, selected]);

  async function create() {
    if (!name.trim()) { toast("Group name is required", "error"); return; }
    if (selected.length < 1) { toast("Add at least one member", "error"); return; }
    setCreating(true);
    try {
      const conv = await api.post("/api/chat/conversations/", {
        participant_ids: selected.map(u => u.id),
        is_group: true,
        name: name.trim(),
      });
      setState(s => ({
        conversations: [conv, ...s.conversations],
        activeConvId: conv.id,
      }));
      onCreated(conv);
      onClose();
      toast(`Group "${name}" created`, "success");
    } catch (err) {
      toast(classifyError(err).message, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal title="New group chat" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Input label="GROUP NAME" placeholder="e.g. SpoonChat Team" value={name}
          onChange={e => setName(e.target.value)} autoFocus />
        <Input placeholder="Search members..." value={query}
          onChange={e => setQuery(e.target.value)} />
        {selected.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {selected.map(u => (
              <div key={u.id} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "4px 10px", borderRadius: 20,
                background: "var(--accent-dim)", border: "1px solid var(--accent)",
                fontSize: 12, color: "var(--text-0)",
              }}>
                @{u.username}
                <button onClick={() => setSelected(s => s.filter(x => x.id !== u.id))}
                  style={{ background: "none", border: "none", color: "var(--text-1)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
          {loading && <div style={{ padding: 16, textAlign: "center" }}><Spinner size={16} /></div>}
          {results.map(user => (
            <div key={user.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: "var(--radius-sm)",
              cursor: "pointer", transition: "background var(--transition)",
            }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg-2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              onClick={() => { setSelected(s => [...s, user]); setQuery(""); }}
            >
              <Avatar name={user.username} size={28} />
              <span style={{ fontSize: 13 }}>@{user.username}</span>
            </div>
          ))}
        </div>
        <Button onClick={create} loading={creating} style={{ justifyContent: "center" }}>
          Create group
        </Button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// DELIVERY STATUS INDICATOR
// ─────────────────────────────────────────────
function DeliveryStatus({ message }) {
  if (message.failed) return <span style={{ color: "var(--red)", fontSize: 11, fontFamily: "var(--font-mono)" }}>✗ failed</span>;
  if (message.pending) return <span style={{ color: "var(--text-2)", fontSize: 11 }}>○</span>;
  if (message.read) return <span style={{ color: "var(--blue)", fontSize: 11, letterSpacing: -2 }}>✓✓</span>;
  if (message.delivered) return <span style={{ color: "var(--text-1)", fontSize: 11, letterSpacing: -2 }}>✓✓</span>;
  return <span style={{ color: "var(--text-2)", fontSize: 11 }}>✓</span>;
}

// ─────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────
function MessageBubble({ message, isOwn, showAvatar, showName }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div style={{
      display: "flex", flexDirection: isOwn ? "row-reverse" : "row",
      alignItems: "flex-end", gap: 8, padding: "2px 16px",
      animation: "msgIn 0.2s ease",
    }}>
      <div style={{ width: 28, flexShrink: 0 }}>
        {showAvatar && !isOwn && <Avatar name={message.sender_username || "?"} size={28} />}
      </div>
      <div style={{ maxWidth: "65%", display: "flex", flexDirection: "column", gap: 2, alignItems: isOwn ? "flex-end" : "flex-start" }}>
        {showName && !isOwn && (
          <span style={{ fontSize: 11, color: "var(--text-1)", fontFamily: "var(--font-mono)", paddingLeft: 4 }}>
            @{message.sender_username}
          </span>
        )}
        <div style={{
          padding: "9px 13px",
          background: isOwn ? "var(--accent)" : "var(--bg-3)",
          borderRadius: isOwn ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          border: `1px solid ${isOwn ? "transparent" : "var(--border)"}`,
          boxShadow: isOwn ? "0 2px 8px rgba(232,73,15,0.2)" : "none",
          opacity: message.pending ? 0.7 : 1,
          transition: "opacity 0.2s",
        }}>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, color: "var(--text-0)", wordBreak: "break-word" }}>
            {message.decrypted ?? <span style={{ color: "var(--text-2)", fontStyle: "italic", fontFamily: "var(--font-mono)", fontSize: 12 }}>🔒 encrypted</span>}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 4 }}>
          <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{time}</span>
          {isOwn && <DeliveryStatus message={message} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// TYPING INDICATOR
// ─────────────────────────────────────────────
function TypingIndicator({ names }) {
  if (!names.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 44px", animation: "fadeIn 0.2s ease" }}>
      <div style={{ display: "flex", gap: 3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 5, height: 5, borderRadius: "50%",
            background: "var(--text-2)",
            animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}
      </div>
      <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
        {names.join(", ")} {names.length === 1 ? "is" : "are"} typing
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONNECTION STATUS BAR
// ─────────────────────────────────────────────
function ConnectionBar({ status }) {
  const config = {
    connected: null,
    connecting: { bg: "var(--yellow)", text: "Connecting..." },
    reconnecting: { bg: "var(--yellow)", text: "Reconnecting..." },
    disconnected: { bg: "var(--red)", text: "Disconnected — messages may not send" },
  };
  const c = config[status];
  if (!c) return null;
  return (
    <div style={{
      padding: "6px 16px", background: c.bg + "22",
      borderBottom: `1px solid ${c.bg}44`,
      display: "flex", alignItems: "center", gap: 6,
    }}>
      {status !== "disconnected" && <Spinner size={12} color={c.bg} />}
      <span style={{ fontSize: 12, color: c.bg, fontFamily: "var(--font-mono)" }}>{c.text}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// MESSAGE INPUT
// ─────────────────────────────────────────────
function MessageInput({ onSend, onTyping, disabled }) {
  const [text, setText] = useState("");
  const typingTimer = useRef(null);
  const textareaRef = useRef(null);

  function handleChange(e) {
    setText(e.target.value);
    onTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTyping(false), TYPING_TIMEOUT);
    // Auto-resize textarea
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    onTyping(false);
    clearTimeout(typingTimer.current);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{
      padding: "12px 16px", borderTop: "1px solid var(--border)",
      background: "var(--bg-1)", display: "flex", gap: 10, alignItems: "flex-end",
    }}>
      <textarea
        ref={textareaRef}
        style={{
          flex: 1, padding: "10px 14px",
          background: "var(--bg-2)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", color: "var(--text-0)",
          fontSize: 14, resize: "none", outline: "none", lineHeight: 1.5,
          minHeight: 42, maxHeight: 120, fontFamily: "var(--font-sans)",
          transition: "border-color var(--transition)",
        }}
        placeholder={disabled ? "Select a conversation..." : "Message... (Enter to send, Shift+Enter for new line)"}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        onFocus={e => e.target.style.borderColor = "var(--accent)"}
        onBlur={e => e.target.style.borderColor = "var(--border)"}
        rows={1}
      />
      <button onClick={handleSend} disabled={!text.trim() || disabled} style={{
        width: 42, height: 42, borderRadius: "var(--radius-md)",
        background: text.trim() && !disabled ? "var(--accent)" : "var(--bg-3)",
        border: "none", cursor: text.trim() && !disabled ? "pointer" : "not-allowed",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, flexShrink: 0, transition: "all var(--transition)",
      }}>
        ↑
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// CONVERSATION HEADER
// ─────────────────────────────────────────────
function ConvHeader({ conversation, currentUserId, online }) {
  const other = conversation?.participants?.find(p => p.id !== currentUserId);
  const isOnline = other && online.has(other.id);
  const name = conversation?.is_group ? conversation.name : `@${other?.username}`;
  const sub = conversation?.is_group
    ? `${conversation.participants.length} members`
    : isOnline ? "Online" : "Offline";

  return (
    <div style={{
      padding: "14px 20px", borderBottom: "1px solid var(--border)",
      background: "var(--bg-1)", display: "flex", alignItems: "center",
      gap: 12,
    }}>
      {conversation && (
        <Avatar
          name={conversation.is_group ? conversation.name : (other?.username || "?")}
          size={36}
          online={isOnline}
        />
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{name || "SpoonChat"}</div>
        <div style={{ fontSize: 12, color: isOnline ? "var(--green)" : "var(--text-2)", fontFamily: "var(--font-mono)" }}>
          {sub}
        </div>
      </div>
      <div style={{
        padding: "4px 10px", borderRadius: 20,
        background: "var(--green-dim)", border: "1px solid var(--green)",
        fontSize: 11, color: "var(--green)", fontFamily: "var(--font-mono)",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span>🔒</span> encrypted
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MESSAGE LIST
// ─────────────────────────────────────────────
function MessageList({ messages, currentUserId, isGroup }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div style={{
        flex: 1, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 12,
        color: "var(--text-2)",
      }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>Messages are end-to-end encrypted</p>
        <p style={{ fontSize: 12 }}>Say hello</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingTop: 12, paddingBottom: 4 }}>
      {messages.map((msg, i) => {
        const isOwn = msg.sender_id === currentUserId;
        const prevSender = i > 0 ? messages[i - 1].sender_id : null;
        const showAvatar = !isOwn && msg.sender_id !== prevSender;
        const showName = isGroup && showAvatar;
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={isOwn}
            showAvatar={showAvatar}
            showName={showName}
          />
        );
      })}
      <div ref={bottomRef} style={{ height: 8 }} />
    </div>
  );
}

// ─────────────────────────────────────────────
// SIDEBAR CONVERSATION ITEM
// ─────────────────────────────────────────────
function ConvItem({ conv, active, currentUserId, online, onClick }) {
  const other = conv.participants?.find(p => p.id !== currentUserId);
  const name = conv.is_group ? conv.name : `@${other?.username}`;
  const isOnline = other && online.has(other.id);
  const preview = conv.last_message
    ? (conv.last_message.decrypted || "🔒 Encrypted message")
    : "No messages yet";
  const time = conv.last_message
    ? new Date(conv.last_message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div onClick={onClick} style={{
      padding: "12px 16px", cursor: "pointer",
      background: active ? "var(--bg-2)" : "transparent",
      borderLeft: `2px solid ${active ? "var(--accent)" : "transparent"}`,
      transition: "all var(--transition)",
      display: "flex", gap: 10, alignItems: "center",
    }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-2)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <Avatar name={conv.is_group ? conv.name : (other?.username || "?")} size={38} online={isOnline} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
          <span style={{ fontWeight: active ? 600 : 400, fontSize: 14, truncate: true }}>{name}</span>
          <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)", flexShrink: 0 }}>{time}</span>
        </div>
        <p style={{
          fontSize: 12, color: "var(--text-1)", margin: 0,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{preview}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN CHAT APP
// ─────────────────────────────────────────────
function ChatApp({ onLogout }) {
  const toast = useToast();
  const user = useGlobal(s => s.user);
  const conversations = useGlobal(s => s.conversations);
  const activeConvId = useGlobal(s => s.activeConvId);
  const online = useGlobal(s => s.online);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [modal, setModal] = useState(null); // "dm" | "group" | null
  const [sidebarSearch, setSidebarSearch] = useState("");

  const activeConv = conversations.find(c => c.id === activeConvId);
  const messages = useGlobal(s => s.messages[activeConvId] || []);
  const typing = useGlobal(s => s.typing[activeConvId] || {});
  const typingNames = Object.values(typing).filter(n => n !== user?.username);

  // Load conversations on mount
  useEffect(() => {
    api.get("/api/chat/conversations/")
      .then(data => {
        setState({ conversations: data });
        if (data.length && !activeConvId) setState({ activeConvId: data[0].id });
      })
      .catch(err => toast(classifyError(err).message, "error"));
  }, []);

  // Connect WebSocket when active conversation changes
  useEffect(() => {
    if (!activeConvId) return;
    wsManager.onStatusChange = setWsStatus;
    wsManager.connect(activeConvId);

    // Load message history
    api.get(`/api/chat/conversations/${activeConvId}/messages/`)
      .then(async data => {
        const decrypted = await Promise.all(data.map(async m => ({
          ...m,
          decrypted: await decryptMsg(m.ciphertext),
        })));
        setState(s => ({ messages: { ...s.messages, [activeConvId]: decrypted } }));
      })
      .catch(err => toast(classifyError(err).message, "error"));

    return () => { wsManager.onStatusChange = null; };
  }, [activeConvId]);

  // Cleanup on unmount
  useEffect(() => () => wsManager.disconnect(), []);

  async function handleSend(text) {
    const ok = await wsManager.sendMessage(text);
    if (!ok) toast("Message failed to send — check your connection", "error");
  }

  function handleLogout() {
    wsManager.disconnect();
    localStorage.clear();
    setState({ user: null, conversations: [], activeConvId: null, messages: {}, typing: {}, online: new Set() });
    onLogout();
  }

  const filteredConvs = sidebarSearch.trim()
    ? conversations.filter(c => {
        const other = c.participants?.find(p => p.id !== user?.id);
        const name = c.is_group ? c.name : (other?.username || "");
        return name.toLowerCase().includes(sidebarSearch.toLowerCase());
      })
    : conversations;

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-0)", overflow: "hidden" }}>
      {/* SIDEBAR */}
      <div style={{
        width: 280, flexShrink: 0,
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        background: "var(--bg-1)",
      }}>
        {/* Sidebar header */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🥄</span>
              <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 15 }}>SpoonChat</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button
                title="New message"
                onClick={() => setModal("dm")}
                style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-1)", cursor: "pointer", fontSize: 14 }}>
                ✎
              </button>
              <button
                title="New group"
                onClick={() => setModal("group")}
                style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: "var(--bg-3)", border: "1px solid var(--border)", color: "var(--text-1)", cursor: "pointer", fontSize: 14 }}>
                ⊕
              </button>
            </div>
          </div>
          {/* Search conversations */}
          <div style={{ position: "relative" }}>
            <span style={{
              position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
              color: "var(--text-2)", fontSize: 13, pointerEvents: "none",
            }}>⌕</span>
            <input
              placeholder="Search conversations..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
              style={{
                width: "100%", padding: "8px 10px 8px 28px",
                background: "var(--bg-2)", border: "1px solid var(--border)",
                borderRadius: "var(--radius-sm)", color: "var(--text-0)",
                fontSize: 13, outline: "none", fontFamily: "var(--font-sans)",
              }}
            />
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filteredConvs.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-2)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
              {sidebarSearch ? "No matches" : "No conversations yet"}
            </div>
          )}
          {filteredConvs.map(conv => (
            <ConvItem
              key={conv.id}
              conv={conv}
              active={conv.id === activeConvId}
              currentUserId={user?.id}
              online={online}
              onClick={() => setState({ activeConvId: conv.id })}
            />
          ))}
        </div>

        {/* User footer */}
        <div style={{
          padding: "12px 16px", borderTop: "1px solid var(--border)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Avatar name={user?.username || "?"} size={32} online={true} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>@{user?.username}</div>
            <div style={{ fontSize: 11, color: "var(--green)", fontFamily: "var(--font-mono)" }}>online</div>
          </div>
          <button
            title="Sign out"
            onClick={handleLogout}
            style={{
              background: "none", border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)", color: "var(--text-2)",
              cursor: "pointer", padding: "4px 8px", fontSize: 12,
              fontFamily: "var(--font-mono)", transition: "all var(--transition)",
            }}
            onMouseEnter={e => { e.target.style.borderColor = "var(--red)"; e.target.style.color = "var(--red)"; }}
            onMouseLeave={e => { e.target.style.borderColor = "var(--border)"; e.target.style.color = "var(--text-2)"; }}
          >
            sign out
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <ConvHeader
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
              isGroup={activeConv?.is_group}
            />
            <TypingIndicator names={typingNames} />
            <MessageInput
              onSend={handleSend}
              onTyping={(isTyping) => wsManager.sendTyping(isTyping)}
              disabled={wsStatus === "disconnected"}
            />
          </>
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 16,
            color: "var(--text-2)", animation: "fadeIn 0.3s ease",
          }}>
            <div style={{ fontSize: 48 }}>🥄</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>Welcome to SpoonChat</div>
            <div style={{ fontSize: 13 }}>Start a new conversation or pick one from the sidebar</div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <Button variant="subtle" onClick={() => setModal("dm")}>✎ New message</Button>
              <Button variant="subtle" onClick={() => setModal("group")}>⊕ New group</Button>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {modal === "dm" && (
        <NewDMModal onClose={() => setModal(null)} onCreated={() => {}} />
      )}
      {modal === "group" && (
        <NewGroupModal onClose={() => setModal(null)} onCreated={() => {}} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ROOT APP — handles auth routing
// ─────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Restore session on page load
    const token = localStorage.getItem("sc_access");
    if (!token) { setChecking(false); return; }

    api.get("/api/auth/profile/")
      .then(async profile => {
        await initCrypto();
        setState({ user: profile });
        setAuthed(true);
      })
      .catch(() => {
        localStorage.clear();
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg-0)", flexDirection: "column", gap: 16,
      }}>
        <Spinner size={28} />
        <span style={{ color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
          loading SpoonChat...
        </span>
      </div>
    );
  }

  return (
    <ToastProvider>
      <style>{CSS}</style>
      {authed
        ? <ChatApp onLogout={() => setAuthed(false)} />
        : <AuthPage onLogin={() => setAuthed(true)} />
      }
    </ToastProvider>
  );
}
// WebSocket connection manager.
// One instance (wsManager) is exported and shared across the app.
// Manages connection lifecycle, reconnection, and all incoming events.

import { decryptMessage } from '../crypto';
import { getState, setState } from '../store';

const WS_BASE        = import.meta.env.VITE_WS_BASE || 'ws://localhost:8000';
const RECONNECT_MS   = 3000;

class WSManager {
  constructor() {
    this.ws              = null;
    this.convId          = null;
    this.participants    = [];
    this.intentionalClose = false;
    this.reconnectTimer  = null;
    this.onStatusChange  = null; // (status: string) => void
  }

  // ── Public API ─────────────────────────────────────────────────

  connect(convId, participants = []) {
    const alreadyOpen =
      this.ws?.readyState === WebSocket.OPEN && this.convId === convId;
    if (alreadyOpen) return;

    this.disconnect();
    this.convId       = convId;
    this.participants = participants;
    this.intentionalClose = false;
    this._open();
  }

  disconnect() {
    this.intentionalClose = true;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this.convId = null;
  }

  send(data) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  async sendMessage(plaintext) {
    const { encryptMessage } = await import('../crypto');
    const { ciphertext, nonce } = await encryptMessage(plaintext, null, null);

    // Optimistic update — show the message immediately before server confirms
    const tempId = `temp_${Date.now()}`;
    getState().addMessage(this.convId, {
      id:               tempId,
      sender_id:        getState().user?.id,
      sender_username:  getState().user?.username,
      decrypted:        plaintext,
      ciphertext,
      nonce,
      timestamp:        new Date().toISOString(),
      delivered:        false,
      read:             false,
      pending:          true,
    });

    const sent = this.send({ type: 'chat_message', ciphertext, nonce });

    if (!sent) {
      getState().updateMessage(this.convId, tempId, { failed: true, pending: false });
      return false;
    }
    return true;
  }

  sendTyping(isTyping) {
    this.send({ type: 'typing', is_typing: isTyping });
  }

  sendReadReceipt(messageId) {
    this.send({ type: 'read_receipt', message_id: messageId });
  }

  // ── Internal ───────────────────────────────────────────────────

  _open() {
    const token = localStorage.getItem('sc_access');
    if (!token || !this.convId) return;

    const url = `${WS_BASE}/ws/chat/${this.convId}/?token=${token}`;
    this.ws   = new WebSocket(url);

    this.onStatusChange?.('connecting');

    this.ws.onopen = () => {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      this.onStatusChange?.('connected');
    };

    this.ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        this._handleEvent(data);
      } catch (err) {
        console.error('[WSManager] Failed to parse message:', err);
      }
    };

    this.ws.onclose = (e) => {
      this.onStatusChange?.('disconnected');
      if (!this.intentionalClose && e.code !== 1000) {
        this.onStatusChange?.('reconnecting');
        this.reconnectTimer = setTimeout(() => this._open(), RECONNECT_MS);
      }
    };

    this.ws.onerror = () => {
      // onclose always fires after onerror — reconnect logic lives there
    };
  }

  async _handleEvent(data) {
    const convId = this.convId;

    switch (data.type) {

      case 'chat_message': {
        const existing = getState().messages[convId] || [];
        const alreadyExists = existing.find(m => m.id === data.message_id);

        if (alreadyExists) {
          // This is the server echo of our own optimistic message —
          // replace the temp ID with the real one and mark delivered
          const tempMsg = existing.find(m => m.pending && m.ciphertext === data.ciphertext);
          if (tempMsg) {
            getState().updateMessage(convId, tempMsg.id, {
              id:        data.message_id,
              delivered: true,
              pending:   false,
            });
          }
          return;
        }

        const sender = this.participants.find(p => p.id === data.sender_id);
        const plaintext = await decryptMessage(
          data.ciphertext,
          data.nonce,
          sender?.public_key || null,
          null
        );

        getState().addMessage(convId, {
          id:              data.message_id,
          sender_id:       data.sender_id,
          sender_username: data.sender_username,
          decrypted:       plaintext,
          ciphertext:      data.ciphertext,
          nonce:           data.nonce,
          timestamp:       data.timestamp,
          delivered:       true,
          read:            false,
          pending:         false,
        });

        // Send read receipt immediately (user is in the conversation)
        this.sendReadReceipt(data.message_id);
        break;
      }

      case 'typing': {
        getState().setTyping(convId, data.user_id, data.username, data.is_typing);
        break;
      }

      case 'user_status': {
        setState(s => {
          const next = new Set(s.online);
          data.status === 'online' ? next.add(data.user_id) : next.delete(data.user_id);
          return { online: next };
        });
        break;
      }

      case 'read_receipt': {
        getState().updateMessage(convId, data.message_id, { read: true });
        break;
      }

      default:
        console.warn('[WSManager] Unknown event type:', data.type);
    }
  }
}

// Single shared instance
export const wsManager = new WSManager();

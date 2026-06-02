import { create } from 'zustand'

const useStore = create((set, get) => ({

  //Auth state
currentUser: null,
  // User's profile object: {id, username, email, public_key, ...}
  // null means not logged in

setCurrentUser: (user) => set({ currentUser: user }),

  //Conversation state
conversations: [],
  // Array of all conversations the user is part of
  // Each: {id, is_group, name, participants, last_message}

setConversations: (conversations) => set({ conversations }),

activeConversationId: null,
  // The conversation currently open on screen
  // null means no conversation selected (sidebar only visible)

setActiveConversation: (id) => set({ activeConversationId: id }),

  // Message state
messages: {},

setMessages: (conversationId, messages) =>
    set((state) => ({
    messages: { ...state.messages, [conversationId]: messages },
    })),

addMessage: (conversationId, message) =>
    set((state) => ({
    messages: {
        ...state.messages,
        [conversationId]: [
        ...(state.messages[conversationId] || []),
        message,
        ],
    },
    conversations: state.conversations.map((conv) =>
        conv.id === conversationId
        ? { ...conv, last_message: message }
        : conv
    ),
    })),

  //Typing indicators
typingUsers: {},
  // { "conv-uuid": { "user-id": "alice" } }
  // Tracks who is currently typing in each conversation

setTyping: (conversationId, userId, username, isTyping) =>
    set((state) => {
    const convTyping = { ...(state.typingUsers[conversationId] || {}) }
    if (isTyping) {
    convTyping[userId] = username
    } else {
    delete convTyping[userId]
    }
    return {
    typingUsers: { ...state.typingUsers, [conversationId]: convTyping },
    }
    }),


  //Online status
onlineUsers: new Set(),
  // Set of user IDs currently connected via WebSocket

setUserOnline: (userId) =>
    set((state) => ({
    onlineUsers: new Set([...state.onlineUsers, userId]),
    })),

setUserOffline: (userId) =>
    set((state) => {
    const next = new Set(state.onlineUsers)
    next.delete(userId)
    return { onlineUsers: next }
    }),

updateMessage: (conversationId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      }
    }))
}))

export default useStore

export const getState = () => useStore.getState()
export const setState = (patch) => useStore.setState(
  typeof patch === 'function' ? patch : (s) => ({ ...s, ...patch })
)
export function useGlobal(selector) {
  return useStore(selector)
}


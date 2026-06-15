    // frontend/src/hooks/useWebSocket.js

    import { useEffect, useRef, useCallback } from 'react'
    import { decryptMessage, loadKeyPair } from '../crypto'
    import useStore from '../store'

    const WS_BASE = 'ws://localhost:8000'
    const RECONNECT_DELAY = 3000
    // If the connection drops, wait 3 seconds before retrying.
    export function useWebSocket(conversationId, participants) {

    const wsRef = useRef(null)

    const reconnectTimer = useRef(null)
    const { addMessage, setTyping, setUserOnline, setUserOffline } = useStore()

    const connect = useCallback(() => {
        const token = localStorage.getItem('spoonchat_access_token')
        if (!token || !conversationId) return

        const url = `${WS_BASE}/ws/chat/${conversationId}/?token=${token}`
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
        console.log(`SpoonChat: connected to conversation ${conversationId}`)
        // Clear any pending reconnect timer, we're connected
        if (reconnectTimer.current) {
            clearTimeout(reconnectTimer.current)
            reconnectTimer.current = null
        }
        }

        ws.onmessage = async (event) => {
        // Fires every time the server sends data through the WebSocket.
        // event.data is a JSON string so parse it first.
        const data = JSON.parse(event.data)

        if (data.type === 'chat_message') {
            await handleIncomingMessage(data)
        } else if (data.type === 'typing') {
            setTyping(
            conversationId,
            data.user_id,
            data.username,
            data.is_typing
            )
        } else if (data.type === 'user_status') {
            if (data.status === 'online') {
            setUserOnline(data.user_id)
            } else {
            setUserOffline(data.user_id)
            }
        } else if (data.type === 'read_receipt') {
            // Could update message read status in store here
            console.log('Read receipt:', data)
        }
        }

        ws.onclose = (event) => {
        console.log('SpoonChat: WebSocket closed', event.code)
        if (event.code !== 1000) {
            // 1000 = normal closure (user navigated away or logged out)
            // Any other code = unexpected disconnection, try to reconnect
            reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY)
        }
        }

        ws.onerror = (error) => {
        console.error('SpoonChat: WebSocket error', error)
        // onerror is always followed by onclose, reconnect logic
        // lives in onclose to avoid duplicate reconnection attempts
        }

    }, [conversationId])

    const handleIncomingMessage = async (data) => {
        const myKeys = loadKeyPair()
        if (!myKeys) return

        // Find the sender's public key from participants list
        const sender = participants.find((p) => p.id === data.sender_id)
        if (!sender?.public_key) {
        // Sender has no public key, can't verify authenticity
        // Add message as unreadable rather than silently dropping it
        addMessage(conversationId, {
            id: data.message_id,
            sender_id: data.sender_id,
            sender_username: data.sender_username,
            decrypted: '[Unable to decrypt — missing public key]',
            timestamp: data.timestamp,
            delivered: true,
            read: false,
            pending: false,
        })
        return
        }

        // Decrypt the message using sender's public key and our private key
        const plaintext = await decryptMessage(
        data.ciphertext,
        data.nonce,
        sender.public_key,    // proves it came from sender
        myKeys.privateKey     // our key to decrypt it
        )

        addMessage(conversationId, {
        id: data.message_id,
        sender_id: data.sender_id,
        sender_username: data.sender_username,
        decrypted: plaintext || '[Decryption failed]',
        ciphertext: data.ciphertext,
        timestamp: data.timestamp,
        read: false,
        delivered: true,
        pending: false,
        })
    }

    const sendMessage = useCallback(async (plaintext, recipientPublicKey) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.error('SpoonChat: WebSocket not connected')
        return false
        }

        const myKeys = loadKeyPair()
        if (!myKeys) return false

        // Import encryptMessage here to avoid circular dependency
        const { encryptMessage } = await import('../crypto')
        const { ciphertext, nonce } = await encryptMessage(
        plaintext,
        recipientPublicKey,
        myKeys.privateKey
        )

        wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        ciphertext,
        nonce,
        }))

        return true
    }, [])

    const sendTyping = useCallback((isTyping) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
            type: 'typing',
            is_typing: isTyping,
        }))
        }
    }, [])

    useEffect(() => {
        // Open connection when hook mounts or conversationId changes
        connect()

        return () => {
        // Cleanup: close connection when component unmounts
        // or when conversationId changes (new connection opens)
        if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
        if (wsRef.current) {
            wsRef.current.close(1000)
            // 1000 = intentional close, onclose won't trigger reconnect
        }
        }
    }, [connect])

    return { sendMessage, sendTyping }
    }
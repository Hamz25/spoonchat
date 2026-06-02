# SpoonChat Frontend

End-to-end encrypted chat app built with React + Vite.

---

## Setup

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## File map

```
src/
├── styles/
│   └── globals.css          # CSS variables, resets, animations
│
├── utils/
│   └── errors.js            # Error classification — all errors go through here
│
├── api/
│   └── index.js             # HTTP client + all backend endpoints
│
├── crypto/
│   └── index.js             # E2EE — keygen, encrypt, decrypt
│                            # Swap placeholder for libsodium in production
│
├── store/
│   └── index.js             # Global state — useGlobal() hook
│
├── ws/
│   └── wsManager.js         # WebSocket manager — one shared instance
│
├── context/
│   └── ToastContext.jsx     # Toast notification system
│
├── hooks/
│   ├── useAuth.js           # login / register / logout / restoreSession
│   └── useWebSocket.js      # connect / sendMessage / sendTyping
│
├── components/
│   ├── ui.jsx               # Primitives: Spinner, Avatar, Input, Button, Modal
│   ├── MessageBubble.jsx    # Single message + delivery status (○ ✓ ✓✓ grey/blue)
│   ├── MessageList.jsx      # Scrollable message history
│   ├── MessageInput.jsx     # Textarea + send button
│   ├── StatusIndicators.jsx # TypingIndicator + ConnectionBar
│   ├── ConversationHeader.jsx # Top bar: name, online status, E2EE badge
│   ├── Sidebar.jsx          # Conversation list + search + new DM/group buttons
│   └── ConversationModals.jsx # NewDMModal + NewGroupModal (with user search)
│
├── pages/
│   ├── LoginPage.jsx        # Login form + AuthLayout (shared with register)
│   ├── RegisterPage.jsx     # Registration form
│   └── ChatPage.jsx         # Main chat interface — composes everything above
│
├── App.jsx                  # Root — handles auth routing + session restore
└── main.jsx                 # Vite entry point
```

---

## Environment variables

Create `frontend/.env`:

```
VITE_API_BASE=http://localhost:8000
VITE_WS_BASE=ws://localhost:8000
```

---

## Backend requirement: user search endpoint

The NewDM and NewGroup modals call `GET /api/auth/users/search/?q=...`

Add to `apps/users/views.py`:

```python
from django.db.models import Q

class UserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 2:
            return Response([])
        users = User.objects.filter(
            Q(username__icontains=q) | Q(email__icontains=q)
        ).exclude(id=request.user.id)[:10]
        return Response(UserSerializer(users, many=True).data)
```

Add to `apps/users/urls.py`:

```python
path('users/search/', UserSearchView.as_view(), name='user_search'),
```

---

## Enabling real E2EE (production)

1. `npm install libsodium-wrappers`
2. Open `src/crypto/index.js`
3. Uncomment the libsodium blocks and remove the placeholder blocks
4. That's it — the rest of the app doesn't change

---

## Delivery status legend

| Symbol | Meaning |
|--------|---------|
| ○      | Pending — not yet confirmed by server |
| ✓      | Sent — server received it |
| ✓✓ grey | Delivered — reached recipient's device |
| ✓✓ blue | Read — recipient opened the conversation |
| ✗ failed | WebSocket was closed before send |

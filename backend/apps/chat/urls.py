from django.urls import path
from .views import ConversationListView, MessageHistoryView

urlpatterns = [
    path('conversations/', ConversationListView.as_view(), name='conversations'),
    # GET  /api/chat/conversations/     → list spoon's conversations
    # POST /api/chat/conversations/     → create a new conversation

    path('conversations/<uuid:conversation_id>/messages/',
        MessageHistoryView.as_view(),
        name='message_history'),
    # GET /api/chat/conversations/{id}/messages/?limit=50&offset=0
]
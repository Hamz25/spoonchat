# apps/chat/models.py

import uuid
from django.db import models
from django.conf import settings


class Conversation(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations'
    )

    is_group = models.BooleanField(default=False)
    # Is this a 2-person DM or a group chat?
    # This one boolean unlocks different UI behaviour on the frontend:
    # group chats show a group name and avatar, DMs show the other person.

    name = models.CharField(max_length=100, blank=True, default='')

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'conversations'
        ordering = ['-created_at']
        # Default ordering: newest conversations first.
        # WHY set this here rather than in every query?
        # DRY — define it once, every query that fetches conversations
        # automatically gets them in the right order.

    def __str__(self):
        if self.is_group:
            return f"Group: {self.name}"
        return f"DM: {self.id}"


class Message(models.Model):

        id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

        conversation = models.ForeignKey(
            Conversation,
            on_delete=models.CASCADE,
            related_name='messages'
        )
        sender = models.ForeignKey(
            settings.AUTH_USER_MODEL,
            on_delete=models.SET_NULL,
            null=True,
            related_name='sent_messages'
        )

        ciphertext = models.TextField()

        nonce = models.TextField() #This is the random value used in encryption, needed for decryption. Stored alongside the ciphertext.

        timestamp = models.DateTimeField(auto_now_add=True)
        # When the message was sent. auto_now_add — set once, never changed.

        delivered = models.BooleanField(default=False)
        # Has the message been delivered to the recipient's device? 
        read = models.BooleanField(default=False)
        # Has the recipient opened and seen the message?
        # This powers the blue double checkmark in apps like WhatsApp.
        # Separate from delivered — you can receive a message without reading it.

        class Meta:
            db_table = 'messages'
            ordering = ['timestamp']
            # Messages ordered oldest-first — natural reading order.
            # Conversations show newest-first, messages within show oldest-first.
            # Both controlled here, both consistent everywhere.

        def __str__(self):
            return f"Message {self.id} in {self.conversation_id}"
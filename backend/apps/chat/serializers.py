from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class ParticipantSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username','avatar','last_seen', 'public_key']

class ConversationSerializer(serializers.ModelSerializer):
    participants = ParticipantSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()
    class Meta:
        model = Conversation
        fields = ['id','is_group', 'name', 'participants', 'created_at', 'last_message']

    def get_last_message(self, obj):
        last = obj.messages.order_by('-timestamp').first()
        if last:
            return{
                'id': last.id,
                'sender': last.sender.username if last.sender else 'Deleted',
                'timestamp': last.timestamp,
                'ciphertext': last.ciphertext,
            }
        return None
    
class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(
        source='sender.username',
        read_only=True
    )
    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender_id', 'sender_username', 'ciphertext','nonce', 'timestamp','delivered', 'read']
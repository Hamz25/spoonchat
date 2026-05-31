import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import Conversation, Message

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return
        
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        is_participant = await self.get_conversation()
        if not is_participant:
            await self.close()
            return
        
        self.room_group_name = f'chat_{self.conversation_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.channel_layer.group_send(
            self.room_group_name,{
                'type': 'user_status',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'status': 'online'
            }
        )
        await self.accept()

    async def disconnect(self, close_code):

        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,{
                    'type': 'user_status',
                    'user_id': str(self.user.id),
                    'username': self.user.username,
                    'status': 'offline'
                }
            )

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
        except json.JSONDecoderError:
            await self.send(text_data=json.dumps({
                'error': 'Invalid JSON format'
                }) )
            return
                    
        message_type = data.get('type')

        if message_type == 'chat_message':
            await self.handle_chat_message(data)
        elif message_type == 'typing':
            await self.handle_typing(data)
        elif message_type == 'read_receipt':
            await self.handle_read_receipt(data)

    async def handle_chat_message(self, data):
        ciphertext = data.get('ciphertext')
        nonce = data.get('nonce')

        if not ciphertext or not nonce:
            await self.send(text_data=json.dumps({
                'error': 'Missing ciphertext or nonce'
            }))
            return
        message = await self.save_message(ciphertext, nonce)

        await self.channel_layer.group_send(
            self.room_group_name, {
                'type': 'chat_message',
                'message_id': str(message.id),
                'sender_id': str(self.user.id),
                'sender_username': self.user.username,
                'ciphertext': message.ciphertext,
                'nonce': message.nonce,
                'timestamp': message.timestamp.isoformat()
            }   
        )
    async def handle_typing(self, data):

        await self.channel_layer.group_send(
            self.room_group_name, {
                'type': 'typing_indicator',
                'user_id': str(self.user.id),
                'username': self.user.username,
                'is_typing': data.get('is_typing', False)
            }
        )
    async def handle_read_receipt(self, data):
        message_id = data.get('message_id')
        if message_id:
            await self.mark_message_read(message_id)
            await self.channel_layer.group_send(
                self.room_group_name, {
                    'type': 'read_receipt',
                    'message_id': message_id,
                    'read_by': str(self.user.id),
                }
            )


# This is where Group event handlers are

    async def chat_message(self, event):

        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message_id': event['message_id'],
            'ciphertext': event['ciphertext'],
            'nonce': event['nonce'],
            'sender_id': event['sender_id'],
            'sender_username': event['sender_username'],
            'timestamp': event['timestamp']
        }))
    async def typing_indicator(self, event):
        
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'user_id': event['user_id'],
            'username': event['username'],
            'is_typing': event['is_typing']
        }))
    async def read_receipt(self, event):

        await self.send(text_data=json.dumps({
            'type': 'read_receipt',
            'message_id': event['message_id'],
            'read_by': event['read_by']
        }))
    async def user_status(self, event):

        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'user_id': event['user_id'],
            'username': event['username'],
            'status': event['status']
        }))

# Database methods

    @database_sync_to_async
    def get_conversation(self):
        try:
            conversation = Conversation.objects.get(
                id=self.conversation_id,
                participants=self.user
                )
            self.conversation = conversation
            return True
        except Conversation.DoesNotExist:
            return False
    @database_sync_to_async
    def save_message(self, ciphertext, nonce):
        return Message.objects.create(
            conversation=self.conversation,
            sender=self.user,
            ciphertext=ciphertext,
            nonce=nonce
        )
    @database_sync_to_async
    def mark_message_read(self, message_id):
        Message.objects.filter(id=message_id, conversation=self.conversation).update(read_by=self.user)
            
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

User = get_user_model()

class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(
            participants=request.user
            )
        serializer = ConversationSerializer(
            conversations,
            many=True,
            context={'request': request}
            )
        return Response(serializer.data)
    def post(self, request):
        participant_ids = request.data.get('participant_ids', [])
        is_group = request.data.get('is_group', False)
        name = request.data.get('name', '')

        if not participant_ids:
            return Response(
                {'error': 'At least one participant is required.'},
                status=status.HTTP_400_BAD_REQUEST
                )
        
        participant_ids.append(request.user.id)  # Add the current user to the participants
        participant_ids = list(set(participant_ids))  # Remove duplicates

        if not is_group and len(participant_ids) == 2:
            # Check if a conversation already exists between the two users
            existing = Conversation.objects.filter(
                is_group=False,
                participants__id=participant_ids[0]
                ).filter(
                    participants__id=participant_ids[1]
                    ).first()
            if existing:
                serializer = ConversationSerializer(
                    existing.first(),
                    context={'request': request}
                    )
                return Response(serializer.data, status=status.HTTP_200_OK)
            
        conversation = Conversation.objects.create(
            is_group=is_group,
            name=name if is_group else ''
            )
        participants = User.objects.filter(id__in=participant_ids)
        conversation.participants.set(participants)

        serializer = ConversationSerializer(
            conversation,
            context={'request': request}
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    

class MessageHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id):
        try:
            conversation = Conversation.objects.get(
                id=conversation_id,
                participants=request.user
                )
        except Conversation.DoesNotExist:
            return Response(
                {'error': 'Conversation not found.'},
                status=status.HTTP_404_NOT_FOUND
                )
        limit = int(request.query_params.get('limit', 50))
        offset = int(request.query_params.get('offset', 0))

        messages = Message.objects.filter(
            conversation=conversation
            ).select_related('sender')[offset:offset+limit]
        serializer = MessageSerializer(messages, many=True)
        return Response(serializer.data)
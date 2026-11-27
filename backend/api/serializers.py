from rest_framework import serializers
from .models import Conversation, Message
class ConversationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Conversation
        fields = [
            "id",
            "title",
            "last_message",
            "created_at",
            "updated_at",
        ]

class MessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "text",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "created_at",
        ]

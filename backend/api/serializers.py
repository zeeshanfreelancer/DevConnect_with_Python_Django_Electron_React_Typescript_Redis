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

        # The conversation is selected by the URL and assigned by the view.
        # Clients should only provide the message content.
        read_only_fields = ["id", "conversation", "created_at"]

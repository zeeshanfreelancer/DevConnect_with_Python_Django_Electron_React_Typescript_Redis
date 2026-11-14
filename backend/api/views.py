from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse

from .models import Conversation
from .serializers import ConversationSerializer

def health_check(request):
    return JsonResponse({
        "success": True,
        "message": "DevConnect Django API is running!",
        "application": "DevConnect",
    })


@api_view(["GET", "POST"])
def conversations(request):

    # Get all conversations
    if request.method == "GET":

        data = Conversation.objects.all().order_by("-updated_at")

        serializer = ConversationSerializer(data, many=True)

        return Response(serializer.data)

    # Create a conversation
    elif request.method == "POST":

        serializer = ConversationSerializer(data=request.data)

        if serializer.is_valid():

            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
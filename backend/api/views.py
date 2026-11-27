from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .auth_serializers import RegisterSerializer

from django.contrib.auth import authenticate
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import (
    api_view,
    permission_classes
)

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer

def health_check(request):
    return JsonResponse({
        "success": True,
        "message": "DevConnect Django API is running!",
        "application": "DevConnect",
    })


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def conversations(request):

    if request.method == "GET":

        data = Conversation.objects.filter(
            members=request.user
        ).distinct().order_by("-updated_at")

        serializer = ConversationSerializer(data, many=True)

        return Response(serializer.data)

    elif request.method == "POST":

        serializer = ConversationSerializer(data=request.data)

        if serializer.is_valid():

            conversation = serializer.save()

            # Automatically add the logged-in user
            conversation.members.add(request.user)

            return Response(
                ConversationSerializer(conversation).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def conversation_messages(request, conversation_id):

    try:
        conversation = Conversation.objects.get(id=conversation_id)

    except Conversation.DoesNotExist:
        return Response(
            {"error": "Conversation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # GET: Retrieve all messages
    if request.method == "GET":

        messages = conversation.messages.all()

        serializer = MessageSerializer(messages, many=True)

        return Response(serializer.data)

    # POST: Create a new message
    elif request.method == "POST":

        serializer = MessageSerializer(data=request.data)

        if serializer.is_valid():

            message = serializer.save(conversation=conversation)

            conversation.last_message = message.text
            conversation.save()

            return Response(
                MessageSerializer(message).data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def message_detail(request, message_id):

    try:
        message = Message.objects.get(id=message_id)

    except Message.DoesNotExist:
        return Response(
            {"error": "Message not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = MessageSerializer(message)

    return Response(serializer.data)

@api_view(["POST"])
def register(request):

    serializer = RegisterSerializer(data=request.data)

    if serializer.is_valid():
        user = serializer.save()

        token, created = Token.objects.get_or_create(
            user=user
        )

        return Response({
            "success": True,
            "message": "Account created successfully.",
            "token": token.key,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        }, status=status.HTTP_201_CREATED)

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(["POST"])
def login(request):

    username = request.data.get("username")
    password = request.data.get("password")

    if not username or not password:
        return Response(
            {"error": "Username and password are required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = authenticate(
        request,
        username=username,
        password=password
    )

    if user is None:
        return Response(
            {"error": "Invalid username or password."},
            status=status.HTTP_401_UNAUTHORIZED
        )

    token, created = Token.objects.get_or_create(user=user)

    return Response({
        "success": True,
        "message": "Login successful.",
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
    }, status=status.HTTP_200_OK)   

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):

    request.user.auth_token.delete()

    return Response({
        "success": True,
        "message": "Logout successful."
    }, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request):

    user = request.user

    return Response({
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
        }
    }, status=status.HTTP_200_OK)

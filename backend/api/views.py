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

            conversation = serializer.save(
                created_by=request.user
            )

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
        conversation = Conversation.objects.get(
            id=conversation_id,
            members=request.user
        )

    except Conversation.DoesNotExist:
        return Response(
            {"error": "Conversation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "GET":

        messages = conversation.messages.all()

        serializer = MessageSerializer(messages, many=True)

        return Response(serializer.data)

    elif request.method == "POST":

        serializer = MessageSerializer(data=request.data)

        if serializer.is_valid():

            message = serializer.save(
                conversation=conversation,
                sender=request.user.username
            )

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
        message = Message.objects.get(
            id=message_id,
            conversation__members=request.user
        )

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


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def conversation_members(request, conversation_id):

    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            members=request.user
        )

    except Conversation.DoesNotExist:
        return Response(
            {"error": "Conversation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "POST":
        username = request.data.get("username")

        if not username:
            return Response(
                {"error": "Username is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if conversation.members.filter(id=user.id).exists():
            return Response(
                {"error": "User is already a member."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        conversation.members.add(user)

        return Response(
            {
                "success": True,
                "message": f"{username} added to conversation.",
                "conversation_id": conversation.id,
                "member": {"id": user.id, "username": user.username},
            },
            status=status.HTTP_200_OK,
        )

    members = conversation.members.all()

    data = [
        {
            "id": member.id,
            "username": member.username,
            "email": member.email,
            "first_name": member.first_name,
            "last_name": member.last_name,
        }
        for member in members
    ]

    return Response({
        "success": True,
        "conversation_id": conversation.id,
        "members": data
    }, status=status.HTTP_200_OK)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def remove_conversation_member(request, conversation_id, user_id):

    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            members=request.user
        )

    except Conversation.DoesNotExist:
        return Response(
            {"error": "Conversation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Find the user to remove
    try:
        user_to_remove = conversation.members.get(
            id=user_id
        )

    except User.DoesNotExist:
        return Response(
            {"error": "User is not a member of this conversation."},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only creator can remove other members
    if user_to_remove != request.user:

        if conversation.created_by != request.user:
            return Response(
                {"error": "Only the conversation creator can remove other members."},
                status=status.HTTP_403_FORBIDDEN
            )

    # Prevent removing the last member
    if conversation.members.count() <= 1:
        return Response(
            {"error": "The last member cannot leave the conversation."},
            status=status.HTTP_400_BAD_REQUEST
        )

    conversation.members.remove(user_to_remove)

    return Response({
        "success": True,
        "message": f"{user_to_remove.username} removed from conversation.",
        "conversation_id": conversation.id,
        "removed_user_id": user_to_remove.id
    }, status=status.HTTP_200_OK)

@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_conversation(request, conversation_id):

    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            members=request.user
        )

    except Conversation.DoesNotExist:
        return Response(
            {"error": "Conversation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only the creator can update the conversation
    if conversation.created_by != request.user:
        return Response(
            {"error": "Only the conversation creator can update it."},
            status=status.HTTP_403_FORBIDDEN
        )

    title = request.data.get("title")

    if not isinstance(title, str) or not title.strip():
        return Response(
            {"error": "A valid conversation title is required."},
            status=status.HTTP_400_BAD_REQUEST
        )

    conversation.title = title.strip()
    conversation.save()

    return Response({
        "success": True,
        "message": "Conversation updated successfully.",
        "conversation": {
            "id": conversation.id,
            "title": conversation.title,
            "last_message": conversation.last_message,
            "updated_at": conversation.updated_at
        }
    }, status=status.HTTP_200_OK)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_conversation(request, conversation_id):

    try:
        conversation = Conversation.objects.get(
            id=conversation_id,
            members=request.user
        )

    except Conversation.DoesNotExist:
        return Response(
            {"error": "Conversation not found"},
            status=status.HTTP_404_NOT_FOUND
        )

    # Only creator can delete the conversation
    if conversation.created_by != request.user:
        return Response(
            {"error": "Only the conversation creator can delete it."},
            status=status.HTTP_403_FORBIDDEN
        )

    conversation.delete()

    return Response({
        "success": True,
        "message": "Conversation deleted successfully."
    }, status=status.HTTP_200_OK)
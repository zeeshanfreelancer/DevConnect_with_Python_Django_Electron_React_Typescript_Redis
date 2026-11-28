from django.urls import path

from .views import (
    health_check,
    conversations,
    conversation_messages,
    message_detail,
    register,
    login,
    profile,
    logout,
    conversation_members
)

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("register/", register, name="register"),
    path("login/", login, name="login"),
    path("logout/", logout, name="logout"),
    path("profile/", profile, name="profile"),

    path("conversations/", conversations, name="conversations"),

    path(
        "conversations/<int:conversation_id>/messages/",
        conversation_messages,
        name="conversation_messages"
    ),

    path(
        "messages/<int:message_id>/",
        message_detail,
        name="message_detail"
    ),

    path(
        "conversations/<int:conversation_id>/members/",
        conversation_members,
        name="conversation_members"
    ),
]

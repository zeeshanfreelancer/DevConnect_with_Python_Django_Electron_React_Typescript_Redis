from django.db import models
from django.contrib.auth.models import User


class Conversation(models.Model):
    title = models.CharField(max_length=255)

    members = models.ManyToManyField(
        User,
        related_name="conversations"
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_conversations"
    )

    last_message = models.TextField(blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class Message(models.Model):
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender = models.CharField(max_length=255)
    text = models.TextField()

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender}: {self.text[:30]}"

    class Meta:
        ordering = ["created_at"]
from django.db import models
class Conversation(models.Model):
    title = models.CharField(max_length=255)
    last_message = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
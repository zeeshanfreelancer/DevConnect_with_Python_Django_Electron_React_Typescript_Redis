from django.urls import path
from .views import health_check, conversations

urlpatterns = [
    path("health/", health_check, name="health_check"),
    path("conversations/", conversations, name="conversations"),
]
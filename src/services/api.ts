
const API_BASE_URL = "http://127.0.0.1:8000/api";

export interface HealthResponse {
  success: boolean;
  message: string;
  application: string;
}

export interface BackendConversation {
  id: number;
  title: string;
  last_message: string;
  created_at: string;
  updated_at: string;
}

export interface BackendMessage {
  id: number;
  conversation: number;
  sender: string;
  text: string;
  created_at: string;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health/`);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json();
}

export async function getConversations(): Promise<BackendConversation[]> {
  const response = await fetch(`${API_BASE_URL}/conversations/`);

  if (!response.ok) {
    throw new Error("Failed to fetch conversations");
  }

  return response.json();
}

export async function createConversation(
  title: string,
  last_message = ""
): Promise<BackendConversation> {
  const response = await fetch(`${API_BASE_URL}/conversations/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title, last_message }),
  });

  if (!response.ok) {
    throw new Error("Failed to create conversation");
  }

  return response.json();
}

export async function getMessages(
  conversationId: number
): Promise<BackendMessage[]> {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages/`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch messages");
  }

  return response.json();
}

export async function sendMessage(
  conversationId: number,
  sender: string,
  text: string
): Promise<BackendMessage> {
  const response = await fetch(
    `${API_BASE_URL}/conversations/${conversationId}/messages/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sender, text }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to send message");
  }

  return response.json();
}

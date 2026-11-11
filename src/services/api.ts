const API_BASE_URL = "http://127.0.0.1:8000/api";

export interface HealthResponse {
  success: boolean;
  message: string;
  application: string;
}

export async function checkBackendHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health/`);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json();
}
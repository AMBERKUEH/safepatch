const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatResponse {
  reply: string;
}

export async function chatWithAI(message: string, distanceToExit?: number): Promise<string> {
  const response = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, distanceToExit }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'AI request failed');
  }
  const data = (await response.json()) as ChatResponse;
  return data.reply;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface ChatResponse {
  reply: string;
}

export async function chatWithAI(message: string, distanceToExit?: number): Promise<string> {
  const res = await fetch(`${API_BASE}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, distanceToExit }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || 'AI request failed');
  }
  const data = (await res.json()) as ChatResponse;
  return data.reply;
}

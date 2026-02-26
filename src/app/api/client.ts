// client.ts
let chatHistory: { role: 'user' | 'ai'; content: string }[] = [];

export async function chatWithAI(message: string) {
  chatHistory.push({ role: 'user', content: message });

  const response = await fetch('http://localhost:3001/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      history: chatHistory,
    }),
  });

  if (!response.ok) {
    throw new Error('AI request failed');
  }

  const data = await response.json();
  chatHistory = data.history;

  return data.reply;
}

// Optional: function to reset chat history
export function resetChatHistory() {
  chatHistory = [];
}
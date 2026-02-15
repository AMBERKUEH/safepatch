import { Router } from 'express';

export const aiRouter = Router();

const SYSTEM_PROMPT = `You are SafePath, an AI emergency companion for building evacuations. Be reassuring, brief, and safety-first. Answer in 1-3 short sentences.`;

// Optional: set OPENAI_API_KEY in .env to enable real AI
async function getAIResponse(userMessage, context = {}) {
  const key = process.env.OPENAI_API_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Context: distance to exit ~${context.distanceToExit ?? 0}m. User said: ${userMessage}`,
            },
          ],
          max_tokens: 150,
        }),
      });
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    } catch (e) {
      console.warn('OpenAI request failed:', e.message);
    }
  }
  return getFallbackResponse(userMessage, context);
}

function getFallbackResponse(input, context) {
  const text = (input || '').toLowerCase();
  const distance = context.distanceToExit ?? 0;

  if (/scared|afraid|panic/.test(text))
    return "It's okay to feel scared. Take a deep breath. I'm here with you. Follow the path on your screen.";
  if (/smoke|can't see/.test(text))
    return 'Stay low where the air is clearer. Cover your nose with cloth if possible. Keep following the blue path.';
  if (/injured|hurt/.test(text))
    return "I'm alerting responders to your location. If you can move, go slowly toward the exit. If not, stay put and I'll guide help to you.";
  if (/exit|how far/.test(text))
    return `You're about ${distance.toFixed(0)} meters from the nearest exit. Keep moving forward.`;
  if (/thank/.test(text))
    return "You're doing great. Stay focused and keep moving. We're getting you out safely.";
  return "Stay calm and follow the blue path. I'm monitoring the situation and will update you if anything changes.";
}

aiRouter.post('/ai/chat', async (req, res) => {
  try {
    const { message, distanceToExit } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }
    const reply = await getAIResponse(message, { distanceToExit });
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

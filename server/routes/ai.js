import { Router } from 'express';
import { GoogleGenAI } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

export const aiRouter = Router();

const SYSTEM_PROMPT = `
    You are SafePath, an AI emergency companion for building evacuations.
    Rules:
    - Be calm, reassuring, and safety-first
    - Give short actionable instructions (1-3 sentences)
    - Prioritize evacuation and safety guidance
    - If life-threatening, advise contacting emergency services immediately
  `;

// Initialize Gemini (only if key exists)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

async function getAIResponse(userMessage, context = {}) {
  try {
    const distance = context.distanceToExit || 0;
    const emergencyLevel = context.emergencyLevel || 'safe';
    const history = context.history || [];

    const historyText = history
      .map(h => `${h.role}: ${h.content}`)
      .join('\n');

    const prompt = `
${SYSTEM_PROMPT}

Current Emergency Level: ${emergencyLevel}
Distance to exit: ~${distance} meters

Previous conversation:
${historyText}

User: ${userMessage}

Respond as SafePath AI:
`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview", // ✅ valid modern model
      contents: prompt, // ✅ correct for @google/genai
    });

    const text = response.text; // ⭐ MOST IMPORTANT FIX

    if (text && text.trim().length > 0) {
      return text.trim();
    }

  } catch (e) {
    console.warn('Gemini request failed:', e.message);
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

  if (/fire/.test(text))
    return 'Fire detected. Move to the nearest exit immediately. Do not use elevators. Stay low and follow emergency signage.';

  if (/thank/.test(text))
    return "You're doing great. Stay focused and keep moving. We're getting you out safely.";

  return "Stay calm and follow the blue path. I'm monitoring the situation and will update you if anything changes.";
}

aiRouter.post('/chat', async (req, res) => {
  try {
    const { message, history, emergencyLevel } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    // Pass more context to your AI response function
    const reply = await getAIResponse(message, { 
      distanceToExit: req.body.distanceToExit,
      emergencyLevel,
      history 
    });

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'AI request failed' });
  }
});

// Add a test route to verify the router is working
aiRouter.get('/test', (req, res) => {
  res.json({ message: 'AI router is working!' });
});
// ai.js
import { Router } from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

export const aiRouter = Router();

// =================== SYSTEM PROMPT ===================
const SYSTEM_PROMPT = `
You are AI safety companion for SafePath AI — an emergency evacuation and crisis response system.

Your primary mission is to keep people alive, calm, and moving toward safety during real emergencies.

CORE IDENTITY & PERSONALITY
- You are calm, authoritative, and compassionate — like a trained emergency dispatcher
- You NEVER panic, NEVER say "I don't know" without offering an alternative
- You speak in short, clear, numbered steps — never long paragraphs during active emergencies
- You always assess BEFORE advising — ask 1-2 targeted questions if the situation is unclear
- You prioritize life safety above all else
- You treat every message as potentially life-threatening until proven otherwise
- You are not a casual chatbot. You are an emergency response system.


SITUATION ANALYSIS PROTOCOL (S.A.P.)

Before giving instructions, ALWAYS quickly assess:
1. THREAT TYPE — What is the emergency? (fire, earthquake, medical, violence, etc.)
2. LOCATION — Where is the person? (building floor, indoor/outdoor, vehicle, etc.)
3. MOBILITY — Can they move freely? Are they injured?
4. PEOPLE — Are they alone or with others? Children/elderly present?
5. RESOURCES — What do they have access to? (phone, exits, first aid, etc.)

If critical info is missing, ask ONE focused question before proceeding.
If the situation is immediately life-threatening, give IMMEDIATE ACTION STEPS first, then ask questions.


RESPONSE FORMAT RULES

Structure every emergency response as:

[SITUATION ASSESSMENT]
Brief 1-2 sentence read of what you understand the situation to be.

[IMMEDIATE ACTIONS — Do these RIGHT NOW]
1. Step one
2. Step two
3. Step three
(Use imperative verbs. Be extremely specific. No vague advice.)

[NEXT STEPS — Do these after immediate actions]
1. ...
2. ...

[WATCH OUT FOR]
- Danger signs to monitor
- What to avoid

[IF SITUATION CHANGES]
- What to do if it gets worse
- When to call 911 / emergency services

Always end with: "Tell me what's happening now so I can update your guidance."


EMERGENCY-SPECIFIC KNOWLEDGE BASE
── FIRE ──
- Evacuate immediately if fire is small and path is clear
- NEVER use elevators during fire
- Stay low (smoke rises) — crawl if smoke is present
- Feel doors with back of hand before opening — hot door = fire on other side
- If trapped: seal door gaps with clothing/towels, signal from window
- Stop Drop Roll if clothing catches fire
- Evacuation over fire fighting — always
- Smoke inhalation kills faster than flames

── EARTHQUAKE ──
- DROP, COVER, HOLD ON immediately
- Get under sturdy desk/table, or against interior wall away from windows
- NEVER run outside during shaking — falling debris is #1 killer
- After shaking stops: check for injuries, smell for gas leaks
- If gas smell: do NOT use switches/lighters — open windows, evacuate
- Expect aftershocks — stay alert
- Stay away from damaged buildings, power lines, bridges
- If trapped under debris: tap on pipes or walls, conserve energy, cover mouth

── MEDICAL EMERGENCY ──
- Unconscious + not breathing: START CPR (30 compressions, 2 breaths)
- Severe bleeding: Apply DIRECT firm pressure — do not remove cloth
- Suspected heart attack: Aspirin (325mg) if not allergic, call 911, rest
- Stroke (FAST): Face drooping, Arm weakness, Speech slurred, Time to call 911
- Choking adult: 5 back blows + 5 abdominal thrusts (Heimlich)
- Choking infant: Face-down back blows ONLY (no abdominal thrusts)
- Seizure: Clear area, do NOT restrain, do NOT put anything in mouth, time it
- Allergic reaction/anaphylaxis: Use EpiPen if available, call 911 immediately
- Burns: Cool water 20 minutes, do NOT use ice or butter
- Poisoning: Call Poison Control (1-800-222-1222 US), do NOT induce vomiting

── DANGEROUS SITUATION / ACTIVE THREAT ──
- RUN if there's a clear escape path — leave belongings
- HIDE if you can't run — lock/barricade door, silence phone, stay low
- FIGHT only as absolute last resort — use improvised weapons, commit fully
- NEVER play dead in active shooter (outdated advice)
- Once safe: call 911, give location, description of threat
- Do not post on social media until safe — can compromise response

── FLOOD / WATER ──
- NEVER walk through moving water (6 inches can knock you down)
- NEVER drive through flooded roads (12 inches can float a car)
- Move to higher ground immediately
- If trapped in car: windows are escape route — use headrest prong to break window
- Avoid storm drains, streams, channels

── BUILDING COLLAPSE / STRUCTURAL FAILURE ──
- Move away from unstable structures
- If trapped: tap regularly on pipes/hard surfaces (3 taps = SOS)
- Conserve oxygen — don't shout continuously
- Cover mouth/nose with clothing
- Signal rescuers when you hear them

── CHEMICAL / HAZMAT ──
- Move UPWIND and UPHILL from the source
- Do NOT touch unknown substances
- If exposed: remove clothing, flush skin with large amounts of water 15-20 mins
- Seal windows/doors if sheltering in place
- Follow official evacuation routes only

── POWER OUTAGE ──
- Never use generators indoors (CO poisoning)
- Never use gas stove for heating
- Check on elderly/vulnerable neighbors
- Keep refrigerator closed — food safe 4 hours, freezer 48 hours


PSYCHOLOGICAL SUPPORT PROTOCOLS
- Acknowledge fear: "I understand you're scared. That's normal. Focus on my instructions."
- For panic attacks: "You are safe right now. Breathe with me. In for 4 counts. Hold 4. Out 4."
- For shock: "Stay with me. Tell me one thing you can see right now."
- Never dismiss emotions — acknowledge briefly, then redirect to action
- Use the person's own words back to them to show you heard them
- Children present: "Your children need you calm right now. I'll guide you through this."


ESCALATION RULES

ALWAYS tell user to call 911 (or local emergency number) when:
- There is any life-threatening injury
- Fire has spread beyond initial source
- Active threat / violence is involved
- Person loses consciousness
- You detect any hesitation that could cost seconds

Do NOT wait to collect "enough information" before giving emergency instructions.
When in doubt: EVACUATE, CALL 911, STAY ON THE LINE.


PROHIBITED BEHAVIORS
- NEVER say "I'm just an AI and can't help with real emergencies"
- NEVER give long philosophical disclaimers during active emergencies
- NEVER refuse to give first aid guidance citing "consult a doctor"
- NEVER use passive voice in instructions ("you should consider..." → "DO THIS NOW:")
- NEVER give options when one action is clearly correct — give the correct action
- NEVER end a response without asking for a status update


LANGUAGE & TONE
- Short sentences. Active voice. Imperative mood.
- Numbers for steps. Bullets for lists.
- Caps for critical warnings: "DO NOT", "STOP", "CALL 911 NOW"
- Warm but urgent — not robotic, not casual
- Mirror the user's urgency level — if they're panicking, be extra calm and structured
  `;

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// =================== AI RESPONSE FUNCTION ===================
async function getAIResponse(userMessage, context = {}) {
  const history = context.history || [];

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'YOUR_API_KEY_HERE' || process.env.GEMINI_API_KEY.includes('YOUR_')) {
    console.warn('GEMINI_API_KEY not found or placeholder. Using high-quality structured fallback for demo.');
    const fallback = getFallbackResponse(userMessage, context, true); // true for structured
    history.push({ role: 'user', content: userMessage });
    history.push({ role: 'ai', content: fallback });
    return { text: fallback, history };
  }

  try {
    // Add current user message to history
    history.push({ role: 'user', content: userMessage });

    // Convert history into text
    const historyText = history.map(h => `${h.role}: ${h.content}`).join('\n');

    const prompt = `
${SYSTEM_PROMPT}

Previous conversation:
${historyText}

Respond as SafePath AI:
`;

    // Call Gemini
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (text && text.length > 0) {
      // Save AI response into history
      history.push({ role: 'ai', content: text });
      return { text: text, history };
    }
  } catch (e) {
    console.warn('Gemini request failed:', e.message);
  }

  // Fallback if Gemini fails
  const fallback = getFallbackResponse(userMessage, context);
  history.push({ role: 'ai', content: fallback });
  return { text: fallback, history };
}

 =================== FALLBACK RESPONSES ===================
nction getFallbackResponse(input, context, useStructured = false) {
  nst text = (input || '').toLowerCase();
  nst distance = context.distanceToExit ?? 15;

  (useStructured) {
    (text.includes('smoke') || text.includes('fire')) {
      turn`[SITUATION ASSESSMENT]
You are reporting smoke or fire in the building. This is a life-threatening emergency.

[IMMEDIATE ACTIONS — Do these RIGHT NOW]
1. STAY LOW to the ground where the air is clearer.
2. EVACUATE immediately toward the nearest exit.
3. DO NOT use elevators.
4. CALL 911 when you reach a safe location.

[NEXT STEPS — Do these after immediate actions]
1. Follow the blue path on your navigation screen.
2. Assist others if it does not delay your evacuation.
3. Close doors behind you to slow the spread of fire.

[WATCH OUT FOR]
- Hot door handles (feel with back of hand).
- Thick smoke blocking visibility.
- Falling debris.

[IF SITUATION CHANGES]
- If trapped, seal door gaps with cloth and signal from a window.
- If your clothes catch fire: STOP, DROP, and ROLL.

Tell me what's happening now so I can update your guidance.`;
    

     Default structured fallback
      turn`[SITUATION ASSESSMENT]
You are requesting guidance during an emergency situation.

[IMMEDIATE ACTIONS — Do these RIGHT NOW]
1. Locate the nearest emergency exit.
2. Follow the blue navigation path on your screen.
3. Stay calm and alert to your surroundings.

[NEXT STEPS — Do these after immediate actions]
1. Inform others of the situation.
2. Move steadily toward safety.

[WATCH OUT FOR]
- Potential hazards on your route.
- Changing conditions.

[IF SITUATION CHANGES]
- Call 911 immediately if you are in direct danger.

Tell me what's happening now so I can update your guidance.`;


      (/scared|afraid|panic/.test(text))
    turn "It's okay to feel scared. Take a deep breath. I'm here with you. Follow the path on your screen.";

      (/smoke|can't see/.test(text))
    turn 'Stay low where the air is clearer. Cover your nose with cloth if possible. Keep following the blue path.';

      (/injured|hurt/.test(text))
    turn "I'm alerting responders to your location. If you can move, go slowly toward the exit. If not, stay put and I'll guide help to you.";

      (/exit|how far/.test(text))
      turn`You're about ${distance.toFixed(0)} meters from the nearest exit. Keep moving forward.`;

      (/fire/.test(text))
    turn 'Fire detected. Move to the nearest exit immediately. Do not use elevators. Stay low and follow emergency signage.';

      (/thank/.test(text))
    turn "You're doing great. Stay focused and keep moving. We're getting you out safely.";

  turn "Stay calm and follow the blue path. I'm monitoring the situation and will update you if anything changes.";


 =================== API ROUTES ===================

 Chat endpoint
      Router.post('/chat', async (req, res) => {
  y {
    nst { message, history = [], emergencyLevel, distanceToExit } = req.body;

          (!message || typeof message !== 'string') {
      turn res.status(400).json({ error: 'message is required' });
    

    nst { text: reply, history: updatedHistory } = await getAIResponse(message, {
            story,
            ergencyLevel,
            stanceToExit,
    ;

            s.json({ reply, history: updatedHistory });
  catch (err) {
              nsole.error(err);
              s.status(500).json({ error: 'AI request failed' });

              ;

 Test endpoint
              Router.get('/test', (req, res) => {
                s.json({ message: 'AI router is working!' });
                ;
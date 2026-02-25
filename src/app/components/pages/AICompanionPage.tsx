// AICompanionPage.tsx
// SafePath AI – Emergency Evacuation System
// AI Companion & Voice Page

import React, { useState, useEffect, useRef, useCallback } from 'react';
import VoiceControl from '../VoiceControl';
import ChatPanel from '../ChatPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmergencyLevel = 'safe' | 'warning' | 'critical';

export interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  emergencyLevel?: EmergencyLevel;
}

// Emergency keywords that trigger UI state escalation
const CRITICAL_KEYWORDS = ['fire', 'explosion', 'bomb', 'shooting', 'attack', 'trapped', 'dying'];
const WARNING_KEYWORDS = ['help', 'danger', 'injury', 'injured', 'hurt', 'emergency', 'earthquake', 'flood', 'medical', 'unconscious', 'bleeding'];

const QUICK_SCENARIOS = [
  { label: 'Fire', icon: '🔥', prompt: 'There is a fire. What should I do immediately?' },
  { label: 'Earthquake', icon: '🌍', prompt: 'An earthquake is happening right now. What should I do?' },
  { label: 'Medical', icon: '🏥', prompt: 'Someone needs immediate medical help. What should I do?' },
  { label: 'Danger', icon: '⚠️', prompt: 'I am in a dangerous situation and need help.' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function detectEmergencyLevel(text: string): EmergencyLevel {
  const lower = text.toLowerCase();
  if (CRITICAL_KEYWORDS.some(kw => lower.includes(kw))) return 'critical';
  if (WARNING_KEYWORDS.some(kw => lower.includes(kw))) return 'warning';
  return 'safe';
}

// ─── Component ────────────────────────────────────────────────────────────────

const AICompanionPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [emergencyLevel, setEmergencyLevel] = useState<EmergencyLevel>('safe');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sosSent, setSosSent] = useState(false);

  // Socket ref – imported lazily so the page works even if socket isn't wired yet
  const socketRef = useRef<any>(null);

  // Cancel any ongoing TTS before new speech
  const speakText = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;   // calm, deliberate pace
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Prefer a calm voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('karen') ||
      v.name.toLowerCase().includes('moira') ||
      (v.lang === 'en-US' && v.localService)
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  }, []);

  // ── Send message to AI ──────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const level = detectEmergencyLevel(text);
    if (level === 'critical') setEmergencyLevel('critical');
    else if (level === 'warning' && emergencyLevel !== 'critical') setEmergencyLevel('warning');

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
      emergencyLevel: level,
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const API_BASE = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

      const response = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: [...messages, userMsg].slice(-8).map(m => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.text,
          })),
          emergencyLevel: level,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server ${response.status}: ${errText}`);
      }

      const data = await response.json();
      setIsLoading(false);
      const aiText = data.reply;

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'ai',
        text: aiText,
        timestamp: new Date(),
        emergencyLevel: detectEmergencyLevel(aiText),
      };

      setMessages(prev => [...prev, aiMsg]);
      speakText(aiText);
      return;

    } catch (err) {
      console.error('AI error:', err);
      setError('AI service is not responding. Please follow emergency signage.');
    }
  }, [messages, emergencyLevel, speakText]);

  // ── SOS socket event ────────────────────────────────────────────────────────
  const handleSOS = useCallback(() => {
    setSosSent(true);
    setEmergencyLevel('critical');

    // Emit via socket if available
    if (socketRef.current?.emit) {
      socketRef.current.emit('sos', {
        timestamp: new Date().toISOString(),
        location: 'USER_DEVICE',
        level: 'critical',
      });
    }

    // Also send to AI for immediate guidance
    sendMessage('SOS! I need immediate emergency help!');

    // Reset SOS button visual after 3s
    setTimeout(() => setSosSent(false), 3000);
  }, [sendMessage]);

  // ── Welcome message on mount ────────────────────────────────────────────────
  useEffect(() => {
    const welcome: Message = {
      id: crypto.randomUUID(),
      role: 'ai',
      text: 'SafePath AI is active and ready to assist. I\'m here to guide you through any emergency. Press the microphone and speak clearly, or choose a scenario below.',
      timestamp: new Date(),
      emergencyLevel: 'safe',
    };
    setMessages([welcome]);

    // Try to load socket lazily
    import('../../hooks/useSocket').then(mod => {
      // If hook exports a socket instance, store it
    }).catch(() => {});
  }, []);

  // ── Level badge config ──────────────────────────────────────────────────────
  const levelConfig = {
    safe: { label: 'SYSTEM ACTIVE', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/40', dot: 'bg-emerald-400' },
    warning: { label: 'WARNING', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-500/40', dot: 'bg-amber-400' },
    critical: { label: 'CRITICAL EMERGENCY', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-500/40', dot: 'bg-red-400 animate-ping' },
  }[emergencyLevel];

  return (
    <div
      className={`min-h-screen w-full font-mono flex flex-col transition-all duration-700 bg-white
        ${emergencyLevel === 'critical' ? 'ring-2 ring-red-600/30 ring-inset' : ''}
        ${emergencyLevel === 'warning' ? 'ring-1 ring-amber-500/20 ring-inset' : ''}
      `}
      // style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace" }}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-black/10 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-red-900/50 text-white">
              SP
            </div>
            <div>
              <div className="text-sm font-bold tracking-widest text-black">SAFEPATH AI</div>
              <div className="text-[10px] text-black/50 tracking-widest uppercase">Emergency Companion</div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${levelConfig.bg} ${levelConfig.border} transition-all duration-500`}>
            <div className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${levelConfig.dot}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${levelConfig.dot.replace(' animate-ping', '')}`} />
            </div>
            <span className={`text-[11px] font-bold tracking-widest ${levelConfig.color}`}>{levelConfig.label}</span>
          </div>

          {/* SOS button */}
          <button
            onClick={handleSOS}
            className={`relative px-4 py-2 rounded-lg font-bold text-xs tracking-widest transition-all duration-200
              ${sosSent
                ? 'bg-red-600 text-white scale-95 shadow-lg shadow-red-900/60'
                : 'bg-red-600/10 text-red-600 border border-red-600/30 hover:bg-red-600 hover:text-white hover:shadow-lg hover:shadow-red-900/40 active:scale-95'
              }`}
            aria-label="Send SOS signal"
          >
            {sosSent ? '✓ SOS SENT' : '⬡ SOS'}
          </button>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex-1 mx-auto w-full px-4 pb-12 py-6 flex flex-col gap-5">

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-700 text-sm">
            <span className="text-lg">⚠</span>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-amber-600/60 hover:text-amber-800 text-lg leading-none">×</button>
          </div>
        )}

        {/* ── Two-column layout ─────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-5 flex-1">

          {/* Left: Voice control + quick scenarios */}
          <div className="lg:w-72 flex flex-col gap-4 shrink-0">

            {/* AI Personality card */}
            <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-lg text-white">
                  🛡
                </div>
                <div>
                  <div className="text-sm font-bold text-black">ARIA</div>
                  <div className="text-[10px] text-black/50 tracking-widest">AI SAFETY COMPANION</div>
                </div>
                {isSpeaking && (
                  <div className="ml-auto flex items-end gap-0.5 h-4">
                    {[3, 5, 4, 6, 3].map((h, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-blue-600 rounded-full animate-pulse"
                        style={{ height: `${h * 2}px`, animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[11px] text-black/60 leading-relaxed">
                Calm. Clear. Ready. ARIA provides real-time safety guidance during emergencies. Stay on the line.
              </p>
            </div>

            {/* Voice control */}
            <VoiceControl
              isListening={isListening}
              setIsListening={setIsListening}
              isLoading={isLoading}
              onTranscript={sendMessage}
              emergencyLevel={emergencyLevel}
            />

            {/* Quick scenario buttons */}
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
              <div className="text-[10px] text-black/50 tracking-widest mb-3 uppercase">Quick Scenarios</div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_SCENARIOS.map(scenario => (
                  <button
                    key={scenario.label}
                    onClick={() => sendMessage(scenario.prompt)}
                    disabled={isLoading}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white border border-black/10
                      hover:bg-black/5 hover:border-black/20 active:scale-95 transition-all duration-150
                      disabled:opacity-40 disabled:cursor-not-allowed text-center"
                  >
                    <span className="text-xl">{scenario.icon}</span>
                    <span className="text-[10px] text-black/70 font-bold tracking-wider uppercase">{scenario.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Emergency numbers */}
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 shadow-sm">
              <div className="text-[10px] text-red-600/70 tracking-widest mb-3 uppercase">Emergency Contacts</div>
              {[
                { label: 'Emergency', number: '911' },
                { label: 'Police', number: '911' },
                { label: 'Medical', number: '911' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-black/5 last:border-0">
                  <span className="text-[11px] text-black/60">{item.label}</span>
                  <a href={`tel:${item.number}`} className="text-sm font-bold text-red-600 hover:text-red-700 transition-colors">
                    {item.number}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Chat panel */}
          <div className="flex-1 min-h-[500px]">
            <ChatPanel
              messages={messages}
              isLoading={isLoading}
              emergencyLevel={emergencyLevel}
              onSendMessage={sendMessage}
            />
          </div>
        </div>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-black/10 bg-white py-3 px-4 text-center">
        <p className="text-[10px] text-black/40 tracking-widest">
          SAFEPATH AI v2.0 · EMERGENCY SYSTEMS · IF IN IMMEDIATE DANGER CALL 911
        </p>
      </footer>
    </div>
  );
};

export default AICompanionPage;
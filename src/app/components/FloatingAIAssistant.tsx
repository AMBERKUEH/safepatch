import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, X, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  timestamp: Date;
}

declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface FloatingAIAssistantProps {
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

// ─── ARIA Response Renderer ───────────────────────────────────────────────────
// Parses the structured [SECTION] format from ARIA and renders it beautifully

const SECTION_CONFIG: Record<string, {
  icon: string;
  bg: string;
  border: string;
  titleColor: string;
  badge?: string;
  badgeClass?: string;
}> = {
  'SITUATION ASSESSMENT': {
    icon: '🔍',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    titleColor: 'text-blue-700',
  },
  'IMMEDIATE ACTIONS': {
    icon: '⚡',
    bg: 'bg-red-50',
    border: 'border-red-300',
    titleColor: 'text-red-700',
    badge: 'RIGHT NOW',
    badgeClass: 'bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded font-bold',
  },
  'NEXT STEPS': {
    icon: '➡️',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    titleColor: 'text-amber-700',
  },
  'WATCH OUT FOR': {
    icon: '⚠️',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    titleColor: 'text-orange-700',
  },
  'IF SITUATION CHANGES': {
    icon: '🚨',
    bg: 'bg-red-50',
    border: 'border-red-200',
    titleColor: 'text-red-600',
  },
  'IF IT GETS WORSE': {
    icon: '🚨',
    bg: 'bg-red-50',
    border: 'border-red-200',
    titleColor: 'text-red-600',
  },
};

// Strip **bold** markers and return text with <strong> spans
function renderInline(text: string) {
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function ARIAMessageRenderer({ text }: { text: string }) {
  // Split into sections by [HEADER] pattern
  const sectionRegex = /\[([^\]]+)\]/g;
  const parts: { header: string | null; content: string }[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Collect preamble text before first section (if any)
  const firstMatch = sectionRegex.exec(text);
  if (firstMatch && firstMatch.index > 0) {
    parts.push({ header: null, content: text.slice(0, firstMatch.index).trim() });
  }

  // Reset regex
  sectionRegex.lastIndex = 0;

  const allMatches: { header: string; index: number }[] = [];
  while ((match = sectionRegex.exec(text)) !== null) {
    allMatches.push({ header: match[1], index: match.index + match[0].length });
  }

  allMatches.forEach((m, i) => {
    const end = i + 1 < allMatches.length
      ? text.lastIndexOf('[', allMatches[i + 1].index - 1)
      : text.length;
    parts.push({ header: m.header, content: text.slice(m.index, end).trim() });
  });

  // If no sections found at all, render as plain formatted text
  if (allMatches.length === 0) {
    return <PlainMessageRenderer text={text} />;
  }

  // Find closing line (usually "Tell me what's happening...")
  const closingLine = text.includes('Tell me what') || text.includes('tell me what')
    ? text.slice(text.lastIndexOf('\n')).trim()
    : null;

  return (
    <div className="space-y-2 text-xs w-full">
      {parts.map((part, idx) => {
        if (!part.header) {
          // Preamble
          return part.content ? (
            <p key={idx} className="text-gray-700 text-xs leading-relaxed">{renderInline(part.content)}</p>
          ) : null;
        }

        // Match section config (partial key match)
        const rawKey = part.header.split('—')[0].trim().toUpperCase();
        const configKey = Object.keys(SECTION_CONFIG).find(
          k => rawKey.includes(k) || k.includes(rawKey)
        );
        const config = configKey ? SECTION_CONFIG[configKey] : null;

        // Split content into numbered items, bullet points, plain lines
        const lines = part.content
          .split('\n')
          .map(l => l.trim())
          .filter(Boolean);

        const numberedItems = lines.filter(l => /^\d+\./.test(l));
        const bulletItems = lines.filter(l => /^[-•*]/.test(l));
        const plainLines = lines.filter(l => !/^\d+\./.test(l) && !/^[-•*]/.test(l));

        const isNumbered = numberedItems.length > 0;
        const isBullet = bulletItems.length > 0;

        return (
          <div
            key={idx}
            className={`rounded-xl border p-2.5 ${config?.bg ?? 'bg-gray-50'} ${config?.border ?? 'border-gray-200'}`}
          >
            {/* Section header */}
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{config?.icon ?? '📋'}</span>
              <span className={`text-[10px] font-bold tracking-wider uppercase ${config?.titleColor ?? 'text-gray-600'}`}>
                {configKey ?? rawKey}
              </span>
              {config?.badge && (
                <span className={config.badgeClass}>{config.badge}</span>
              )}
            </div>

            {/* Plain lines (assessment paragraph) */}
            {plainLines.map((line, li) => (
              <p key={li} className="text-gray-800 text-xs leading-relaxed mb-1">
                {renderInline(line)}
              </p>
            ))}

            {/* Numbered steps */}
            {isNumbered && (
              <ol className="space-y-1.5 mt-1">
                {numberedItems.map((item, li) => {
                  const content = item.replace(/^\d+\.\s*/, '');
                  return (
                    <li key={li} className="flex gap-2 items-start">
                      <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                        ${config?.titleColor?.includes('red') ? 'bg-red-500 text-white' :
                          config?.titleColor?.includes('amber') ? 'bg-amber-500 text-white' :
                          'bg-blue-500 text-white'}`}>
                        {li + 1}
                      </span>
                      <span className="text-gray-800 text-xs leading-relaxed">{renderInline(content)}</span>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Bullet points */}
            {isBullet && (
              <ul className="space-y-1.5 mt-1">
                {bulletItems.map((item, li) => {
                  const content = item.replace(/^[-•*]\s*/, '');
                  return (
                    <li key={li} className="flex gap-2 items-start">
                      <span className={`shrink-0 mt-0.5 text-xs ${config?.titleColor ?? 'text-gray-500'}`}>▸</span>
                      <span className="text-gray-800 text-xs leading-relaxed">{renderInline(content)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      {/* Closing question line */}
      {closingLine && (
        <p className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mt-1">
          💬 {renderInline(closingLine)}
        </p>
      )}
    </div>
  );
}

// Fallback: render plain text with basic **bold** support and numbered lists
function PlainMessageRenderer({ text }: { text: string }) {
  const lines = text.split('\n').filter(l => l.trim());
  return (
    <div className="space-y-1 text-xs text-gray-800 leading-relaxed">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (/^\d+\./.test(trimmed)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 w-4 h-4 bg-gray-400 text-white rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5">
                {trimmed.match(/^(\d+)/)?.[1]}
              </span>
              <span>{renderInline(trimmed.replace(/^\d+\.\s*/, ''))}</span>
            </div>
          );
        }
        if (/^[-•*]/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="text-gray-400 mt-0.5">▸</span>
              <span>{renderInline(trimmed.replace(/^[-•*]\s*/, ''))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FloatingAIAssistant({ isOpen, onOpen, onClose }: FloatingAIAssistantProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen ?? internalOpen;
  const setOpen = (value: boolean) => {
    if (value) onOpen?.();
    else onClose?.();
    if (isOpen === undefined) setInternalOpen(value);
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your SafePath AI assistant. I'm here to guide you safely. You can type or speak to me.",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'en-US';
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        sendMessage(transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
    synthRef.current = window.speechSynthesis;
  }, []);

  const speak = (text: string) => {
    if (!voiceEnabled || !synthRef.current) return;
    // Strip section headers and markdown for clean TTS
    const clean = text
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\*\*/g, '')
      .replace(/^\d+\.\s/gm, '')
      .replace(/^[-•▸]\s/gm, '')
      .trim();
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';
    synthRef.current.speak(utterance);
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      alert('Speech Recognition not supported in this browser');
      return;
    }
    setIsListening(true);
    recognitionRef.current.start();
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { chatWithAI } = await import('../api/client');
      const aiResponse: string = await chatWithAI(text);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
      speak(aiResponse);
    } catch (error) {
      console.error('Gemini Error:', error);
      const fallback = "I'm still guiding you. Please stay calm and follow the nearest safe exit path.";
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        text: fallback,
        sender: 'ai',
        timestamp: new Date(),
      }]);
      speak(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  const quickReplies = [
    { text: "I'm scared", icon: '😰' },
    { text: 'Where is the exit?', icon: '🚪' },
    { text: 'I see smoke', icon: '💨' },
    { text: 'Help me', icon: '🆘' },
  ];

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full shadow-2xl flex items-center justify-center z-50"
          >
            <Bot className="w-7 h-7 text-white" />
            <motion.div
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[380px] h-[580px] z-50 flex flex-col"
          >
            <Card className="flex flex-col h-full shadow-2xl border-2 border-gray-200 overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Bot className="w-6 h-6" />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-300 rounded-full border border-green-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">ARIA — SafePath AI</h3>
                    <span className="text-xs text-green-100">Emergency Response Companion</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    title={voiceEnabled ? 'Mute voice' : 'Enable voice'}
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => setOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0 bg-gray-50">
                <div className="p-3 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {/* AI avatar */}
                      {msg.sender === 'ai' && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mr-2 mt-1 shrink-0">
                          <Bot className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl shadow-sm overflow-hidden
                          ${msg.sender === 'user'
                            ? 'max-w-[80%] bg-blue-600 text-white px-3 py-2'
                            : 'w-full bg-white border border-gray-100 px-3 py-2.5'
                          }`}
                      >
                        {msg.sender === 'user' ? (
                          // User message — plain text
                          <div>
                            <p className="text-sm leading-relaxed">{msg.text}</p>
                            <p className="text-[10px] opacity-60 mt-1 text-right">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ) : (
                          // AI message — rich ARIA renderer
                          <div>
                            <ARIAMessageRenderer text={msg.text} />
                            <p className="text-[10px] text-gray-400 mt-2 text-right">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Loading indicator */}
                  {isLoading && (
                    <div className="flex justify-start items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">Analyzing situation…</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Replies */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 bg-white border-t flex flex-wrap gap-1.5 flex-shrink-0">
                  <p className="w-full text-[10px] text-gray-400 mb-0.5 tracking-wide">QUICK SCENARIOS</p>
                  {quickReplies.map((reply) => (
                    <button
                      key={reply.text}
                      onClick={() => sendMessage(reply.text)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:border-red-200 border border-transparent rounded-full text-xs transition-colors disabled:opacity-50"
                      disabled={isLoading}
                    >
                      {reply.icon} {reply.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="bg-white border-t p-3 flex-shrink-0">
                {isListening && (
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="flex gap-0.5 items-end h-3">
                      {[2, 4, 3, 5, 2].map((h, i) => (
                        <div
                          key={i}
                          className="w-0.5 bg-red-400 rounded-full animate-pulse"
                          style={{ height: `${h * 2}px`, animationDelay: `${i * 80}ms` }}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-red-500 font-medium">Listening…</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                    placeholder="Describe your situation…"
                    className="flex-1 text-sm"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={startListening}
                    size="sm"
                    className={`h-9 w-9 p-0 transition-colors ${
                      isListening
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    disabled={isLoading}
                    title="Voice input"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => sendMessage(input)}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 h-9 w-9 p-0 hover:from-green-700 hover:to-emerald-700"
                    disabled={!input.trim() || isLoading}
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>

            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
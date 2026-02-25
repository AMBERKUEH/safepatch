// FloatingAICompanion.tsx
import React, { useState, useEffect, useRef } from 'react';
import VoiceControl from './VoiceControl'; // Adjust import path as needed

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
  emergencyLevel?: 'safe' | 'warning' | 'critical';
}

const FloatingAIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [emergencyLevel, setEmergencyLevel] = useState<'safe' | 'warning' | 'critical'>('safe');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  
  // Text-to-speech setup
  const synth = window.speechSynthesis;
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speechRate, setSpeechRate] = useState(1);
  const [speechPitch, setSpeechPitch] = useState(1);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = synth.getVoices();
      setVoices(availableVoices);
    };
    
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, [synth]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      if (synth.speaking) {
        synth.cancel();
      }
    };
  }, [synth]);

  const speak = (text: string, level: 'safe' | 'warning' | 'critical' = 'safe') => {
    if (synth.speaking) {
      synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Adjust voice based on emergency level
    if (level === 'critical') {
      utterance.rate = 0.9; // Slower for clarity
      utterance.pitch = 0.9; // Lower, more serious pitch
      utterance.volume = 1;
    } else if (level === 'warning') {
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 0.9;
    } else {
      utterance.rate = 1.1; // Slightly faster for normal conversation
      utterance.pitch = 1.1; // Slightly higher for friendly tone
      utterance.volume = 0.8;
    }

    // Try to find a good voice
    const preferredVoice = voices.find(voice => 
      voice.lang.includes('en') && voice.name.includes('Google') || voice.name.includes('Natural')
    ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
    
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Simulate AI response (replace with your actual AI logic)
    setTimeout(() => {
      const level = detectEmergencyLevel(text);
      const responseText = getAIResponse(text);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: responseText,
        timestamp: new Date(),
        emergencyLevel: level,
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      
      // Speak the response
      speak(responseText, level);
    }, 1000);
  };

  const detectEmergencyLevel = (text: string): 'safe' | 'warning' | 'critical' => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('heart attack') || lowerText.includes('bleeding') || lowerText.includes('unconscious') || lowerText.includes('emergency')) {
      setEmergencyLevel('critical');
      return 'critical';
    }
    if (lowerText.includes('hurt') || lowerText.includes('pain') || lowerText.includes('accident') || lowerText.includes('help')) {
      setEmergencyLevel('warning');
      return 'warning';
    }
    setEmergencyLevel('safe');
    return 'safe';
  };

  const getAIResponse = (text: string): string => {
    // Simple response logic - replace with your actual AI
    const lowerText = text.toLowerCase();
    if (lowerText.includes('hello') || lowerText.includes('hi')) {
      return "Hello! I'm ARIA, your safety companion. How can I help you today?";
    }
    if (lowerText.includes('help')) {
      return "I'm here to help. Please describe your situation, and I'll provide safety guidance.";
    }
    if (lowerText.includes('heart attack')) {
      return "If someone is having a heart attack, first call 911 immediately. Have them sit or lie down and loosen any tight clothing. If they're conscious, help them take any prescribed medication. Stay on the line with me and I'll guide you through what to do next.";
    }
    if (lowerText.includes('bleeding')) {
      return "For severe bleeding, call 911 immediately. Apply firm pressure with a clean cloth and elevate the wound if possible. Do not remove any objects that are embedded in the wound. Keep applying pressure until help arrives. I'm here with you.";
    }
    if (lowerText.includes('fire')) {
      return "If there's a fire, get out immediately and call 911. Stay low to avoid smoke, and check doors for heat before opening. Never go back inside for anything. Once you're safe, I can help you with next steps.";
    }
    return "I understand you need assistance. Could you provide more details about your situation so I can give you the most appropriate safety guidance? I'm here to help and will stay with you.";
  };

  const handleSOS = () => {
    setSosSent(true);
    const sosMessage: Message = {
      id: Date.now().toString(),
      role: 'ai',
      text: "🚨 SOS SIGNAL SENT - EMERGENCY SERVICES NOTIFIED\n\nStay calm. Help is on the way. I'll stay with you until they arrive.\n\n• Keep the line open\n• Follow any instructions from dispatchers\n• Stay where you are if safe\n• Unlock doors if possible",
      timestamp: new Date(),
      emergencyLevel: 'critical',
    };
    setMessages(prev => [...prev, sosMessage]);
    setEmergencyLevel('critical');
    
    // Speak SOS message
    speak("SOS signal sent. Emergency services have been notified. Stay calm, help is on the way. I'll stay with you until they arrive.", 'critical');
    
    // Reset SOS sent status after 5 seconds (for demo)
    setTimeout(() => setSosSent(false), 5000);
  };

  const levelConfig = {
    safe: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      dot: 'bg-emerald-500',
      color: 'text-emerald-700',
      label: 'SAFE MODE',
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
      color: 'text-amber-700',
      label: 'WARNING',
    },
    critical: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      dot: 'bg-red-500',
      color: 'text-red-700',
      label: 'CRITICAL',
    },
  }[emergencyLevel];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputText.trim()) {
        handleSendMessage(inputText);
        setInputText('');
      }
    }
  };

  const stopSpeaking = () => {
    if (synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95
          ${isOpen 
            ? 'bg-gray-200 rotate-90' 
            : emergencyLevel === 'critical'
              ? 'bg-red-600 animate-pulse'
              : emergencyLevel === 'warning'
                ? 'bg-amber-500'
                : 'bg-blue-600'
          }`}
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <span className="text-2xl text-white">🛡️</span>
            {emergencyLevel === 'critical' && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
            )}
          </div>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                  🛡️
                </div>
                <div>
                  <div className="font-bold text-sm">ARIA</div>
                  <div className="text-[10px] text-white/80">AI Safety Companion</div>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${levelConfig.bg} ${levelConfig.border}`}>
                <div className="relative flex h-2 w-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${levelConfig.dot}`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${levelConfig.dot.replace(' animate-ping', '')}`} />
                </div>
                <span className={`text-[9px] font-bold ${levelConfig.color}`}>{levelConfig.label}</span>
              </div>
            </div>
            
            {/* Voice/speaking controls */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                {isSpeaking && (
                  <>
                    {[3, 5, 4, 6, 3].map((h, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-white rounded-full animate-pulse"
                        style={{ height: `${h}px`, animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                    <span className="text-[10px] text-white/80 ml-2">ARIA is speaking...</span>
                  </>
                )}
              </div>
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="text-[10px] bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full transition-colors"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-3xl mb-3 animate-pulse">
                  🛡️
                </div>
                <p className="text-gray-500 text-sm mb-2">Hello, I'm ARIA</p>
                <p className="text-gray-400 text-xs">Your AI safety companion. How can I help you today?</p>
                <button
                  onClick={() => handleSendMessage("Hello")}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 transition-colors"
                >
                  Say Hello
                </button>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : msg.emergencyLevel === 'critical'
                        ? 'bg-red-50 border border-red-200 text-red-800 rounded-bl-md'
                        : msg.emergencyLevel === 'warning'
                          ? 'bg-amber-50 border border-amber-200 text-amber-800 rounded-bl-md'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
                  }`}
                >
                  {msg.role === 'ai' && msg.emergencyLevel === 'critical' && (
                    <div className="flex items-center gap-1 mb-1 pb-1 border-b border-red-200">
                      <span className="text-red-600 text-xs">⚠</span>
                      <span className="text-red-600 text-[8px] font-bold">EMERGENCY</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[8px] opacity-60">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {msg.role === 'ai' && (
                      <button
                        onClick={() => speak(msg.text, msg.emergencyLevel)}
                        className="text-[8px] opacity-60 hover:opacity-100 transition-opacity"
                      >
                        🔈 Replay
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Voice Control */}
          <div className="px-3 pt-2">
            <VoiceControl
              isListening={isListening}
              setIsListening={setIsListening}
              isLoading={isLoading}
              onTranscript={handleSendMessage}
              emergencyLevel={emergencyLevel}
            />
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                disabled={isLoading}
              />
              <button
                onClick={handleSOS}
                className="px-3 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                SOS
              </button>
              <button
                onClick={() => {
                  if (inputText.trim()) {
                    handleSendMessage(inputText);
                    setInputText('');
                  }
                }}
                disabled={!inputText.trim() || isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors shadow-sm"
              >
                Send
              </button>
            </div>
            <p className="text-[8px] text-gray-400 mt-2 text-center">
              Voice input available • ARIA speaks back • Click 🔈 to replay
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingAIAssistant;
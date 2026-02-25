import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Send, X, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface FloatingAIAssistantProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const AI_RESPONSES: Record<string, string> = {
  scared: "I understand this is frightening. Take a deep breath. I'm here with you. Focus on my voice and follow the safe path.",
  smoke: 'Stay low to the ground where the air is clearer. Cover your nose and mouth with cloth if possible.',
  injured: "I'm alerting emergency responders to your location. If you can move, continue slowly. If not, stay where you are.",
  help: "I'm here to guide you. Follow the blue path on your screen. You're doing great. Stay calm.",
  exit: "The nearest safe exit is approximately 45 meters ahead. Keep following the path I'm showing you.",
  default: "Stay calm and follow my guidance. I'm monitoring the situation and will keep you safe.",
};

export function FloatingAIAssistant({ isOpen, onOpen, onClose }: FloatingAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your SafePath AI assistant. I'm here to help guide you safely. How can I assist you?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);

  const quickReplies = [
    { text: "I'm scared", icon: '😰' },
    { text: 'Where is exit?', icon: '🚪' },
    { text: 'I see smoke', icon: '💨' },
    { text: 'Help me', icon: '🆘' },
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

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
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpen}
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
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 w-[340px] h-[500px] z-50 flex flex-col"
          >
            <Card className="flex flex-col h-full shadow-2xl border-2 border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Bot className="w-5 h-5" />
                      </div>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">SafePath AI</h3>
                      <div className="flex items-center gap-1 text-xs text-green-100">
                        <div className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                        <span>Online</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    >
                      {voiceEnabled ? (
                        <Volume2 className="w-4 h-4" />
                      ) : (
                        <VolumeX className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      onClick={onClose}
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
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
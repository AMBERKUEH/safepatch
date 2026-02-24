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
  text: string;
  sender: 'ai' | 'user';
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

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      const { chatWithAI } = await import('../api/client');
      const response = await chatWithAI(text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      const response = getAIResponse(text);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
    }
  };

  const getAIResponse = (userText: string): string => {
    const text = userText.toLowerCase();
    if (text.includes('scared') || text.includes('afraid')) return AI_RESPONSES.scared;
    if (text.includes('smoke')) return AI_RESPONSES.smoke;
    if (text.includes('injured') || text.includes('hurt')) return AI_RESPONSES.injured;
    if (text.includes('exit')) return AI_RESPONSES.exit;
    if (text.includes('help')) return AI_RESPONSES.help;
    return AI_RESPONSES.default;
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
      </AnimatePresence>

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
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-gray-50">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                        {/* Avatar */}
                        {message.sender === 'ai' && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div>
                          <div
                            className={`px-3 py-2 rounded-2xl ${
                              message.sender === 'user'
                                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-tr-sm'
                                : 'bg-white text-gray-900 rounded-tl-sm shadow-sm'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{message.text}</p>
                          </div>
                          <p className={`text-xs text-gray-500 mt-1 px-1 ${message.sender === 'user' ? 'text-right' : ''}`}>
                            {message.timestamp.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>

              {/* Quick Replies */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 bg-white border-t">
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.text}
                        onClick={() => sendMessage(reply.text)}
                        className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs font-medium transition-colors"
                      >
                        <span className="mr-1">{reply.icon}</span>
                        {reply.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="bg-white border-t p-3">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
                    placeholder="Type a message..."
                    className="flex-1 text-sm"
                  />
                  <Button
                    onClick={() => sendMessage(input)}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-9 w-9 p-0"
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
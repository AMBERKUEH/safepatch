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

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

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

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }

    synthRef.current = window.speechSynthesis;
  }, []);

  // Text-to-Speech
  const speak = (text: string) => {
    if (!voiceEnabled || !synthRef.current) return;

    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.lang = 'en-US';

    synthRef.current.speak(utterance);
  };

  // Start Voice Input
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
      // 🔗 Gemini API via your backend
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

      const fallback =
        "I'm still guiding you. Please stay calm and follow the nearest safe exit path.";

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallback,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);
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
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
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
            className="fixed bottom-24 right-6 w-[360px] h-[520px] z-50 flex flex-col"
          >
            <Card className="flex flex-col h-full shadow-2xl border-2 border-gray-200 overflow-hidden">
              {/* Header - Fixed height */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 text-white flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Bot className="w-6 h-6" />
                  <div>
                    <h3 className="font-semibold text-sm">SafePath AI (Gemini)</h3>
                    <span className="text-xs text-green-100">Emergency Voice Assistant</span>
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Messages - Scrollable area with proper height constraints */}
              <ScrollArea className="flex-1 min-h-0 bg-gray-50">
                <div className="p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm shadow-sm ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900'
                        }`}
                      >
                        {msg.text}
                        <p className="text-[10px] opacity-60 mt-1">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white px-4 py-2 rounded-2xl text-sm text-gray-500">
                        SafePath AI is analyzing situation...
                      </div>
                    </div>
                  )}
                  
                  {/* Invisible element to scroll to */}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Quick Replies - Fixed height if present */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 bg-white border-t flex flex-wrap gap-2 flex-shrink-0">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply.text}
                      onClick={() => sendMessage(reply.text)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs"
                      disabled={isLoading}
                    >
                      {reply.icon} {reply.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area - Fixed height */}
              <div className="bg-white border-t p-3 flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && sendMessage(input)
                    }
                    placeholder="Type or use voice..."
                    className="flex-1 text-sm"
                    disabled={isLoading}
                  />

                  {/* Mic Button */}
                  <Button
                    onClick={startListening}
                    size="sm"
                    className={`h-9 w-9 p-0 ${
                      isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'
                    }`}
                    disabled={isLoading}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>

                  {/* Send Button */}
                  <Button
                    onClick={() => sendMessage(input)}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 h-9 w-9 p-0 hover:from-green-700 hover:to-emerald-700"
                    disabled={!input.trim() || isLoading}
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
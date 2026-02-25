// import { useState, useEffect } from 'react';
// import { motion } from 'motion/react';
// import { MessageSquare, Volume2, VolumeX, Send, Bot } from 'lucide-react';
// import { Button } from './ui/button';
// import { Card } from './ui/card';
// import { Input } from './ui/input';
// import { ScrollArea } from './ui/scroll-area';
// import { useVoiceGuidance } from '../hooks/useVoiceGuidance';

// interface Message {
//   id: string;
//   text: string;
//   sender: 'ai' | 'user';
//   timestamp: Date;
// }

// interface AICompanionProps {
//   currentStep: string;
//   distanceToExit: number;
//   isEmergency: boolean;
// }

// export function AICompanion({ currentStep, distanceToExit, isEmergency }: AICompanionProps) {
//   const [messages, setMessages] = useState<Message[]>([]);
//   const [input, setInput] = useState('');
//   const { speak, isEnabled, toggle, isSpeaking } = useVoiceGuidance();

//   useEffect(() => {
//     // Initial greeting
//     const greeting: Message = {
//       id: '1',
//       text: "I'm here to help you evacuate safely. Stay calm and follow my guidance.",
//       sender: 'ai',
//       timestamp: new Date(),
//     };
//     setMessages([greeting]);
//     speak({ text: greeting.text });
//   }, []);

//   useEffect(() => {
//     if (currentStep) {
//       const stepMessage: Message = {
//         id: Date.now().toString(),
//         text: currentStep,
//         sender: 'ai',
//         timestamp: new Date(),
//       };
//       setMessages((prev) => [...prev, stepMessage]);
//       speak({ text: currentStep, urgent: isEmergency });
//     }
//   }, [currentStep]);

//   const handleSendMessage = async () => {
//     if (!input.trim()) return;

//     const userMessage: Message = {
//       id: Date.now().toString(),
//       text: input,
//       sender: 'user',
//       timestamp: new Date(),
//     };

//     setMessages((prev) => [...prev, userMessage]);
//     const currentInput = input;
//     setInput('');

//     try {
//       const { chatWithAI } = await import('../api/client');
//       const response = await chatWithAI(currentInput, distanceToExit);
//       const aiMessage: Message = {
//         id: (Date.now() + 1).toString(),
//         text: response,
//         sender: 'ai',
//         timestamp: new Date(),
//       };
//       setMessages((prev) => [...prev, aiMessage]);
//       speak({ text: response });
//     } catch {
//       const response = generateAIResponse(currentInput, distanceToExit);
//       const aiMessage: Message = {
//         id: (Date.now() + 1).toString(),
//         text: response,
//         sender: 'ai',
//         timestamp: new Date(),
//       };
//       setMessages((prev) => [...prev, aiMessage]);
//       speak({ text: response });
//     }
//   };

//   return (
//     <Card className="flex flex-col h-[500px] bg-white">
//       {/* Header */}
//       <div className="flex items-center justify-between p-4 border-b">
//         <div className="flex items-center gap-2">
//           <div className="relative">
//             <Bot className="w-6 h-6 text-blue-600" />
//             {isSpeaking && (
//               <motion.div
//                 animate={{ scale: [1, 1.2, 1] }}
//                 transition={{ repeat: Infinity, duration: 1 }}
//                 className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"
//               />
//             )}
//           </div>
//           <div>
//             <h3 className="font-medium">SafePath AI</h3>
//             <p className="text-xs text-gray-500">Emergency Companion</p>
//           </div>
//         </div>
//         <Button onClick={toggle} variant="ghost" size="sm">
//           {isEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
//         </Button>
//       </div>

//       {/* Status bar */}
//       <div className="bg-blue-50 px-4 py-2 text-sm">
//         <div className="flex items-center justify-between">
//           <span className="text-blue-900">Distance to exit:</span>
//           <span className="font-medium text-blue-900">{distanceToExit.toFixed(0)}m</span>
//         </div>
//       </div>

//       {/* Messages */}
//       <ScrollArea className="flex-1 p-4">
//         <div className="space-y-4">
//           {messages.map((message) => (
//             <motion.div
//               key={message.id}
//               initial={{ opacity: 0, y: 10 }}
//               animate={{ opacity: 1, y: 0 }}
//               className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
//             >
//               <div
//                 className={`max-w-[80%] rounded-lg px-4 py-2 ${
//                   message.sender === 'user'
//                     ? 'bg-blue-600 text-white'
//                     : 'bg-gray-100 text-gray-900'
//                 }`}
//               >
//                 <p className="text-sm">{message.text}</p>
//                 <p className="text-xs opacity-70 mt-1">
//                   {message.timestamp.toLocaleTimeString([], {
//                     hour: '2-digit',
//                     minute: '2-digit',
//                   })}
//                 </p>
//               </div>
//             </motion.div>
//           ))}
//         </div>
//       </ScrollArea>

//       {/* Input */}
//       <div className="p-4 border-t">
//         <div className="flex gap-2">
//           <Input
//             value={input}
//             onChange={(e) => setInput(e.target.value)}
//             onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
//             placeholder="Ask for help..."
//             className="flex-1"
//           />
//           <Button onClick={handleSendMessage} size="sm">
//             <Send className="w-4 h-4" />
//           </Button>
//         </div>
//       </div>
//     </Card>
//   );
// }

// function generateAIResponse(userInput: string, distance: number): string {
//   const input = userInput.toLowerCase();

//   if (input.includes('scared') || input.includes('afraid') || input.includes('panic')) {
//     return "I understand this is frightening. Take a deep breath. I'm here with you. Focus on my voice and follow the path I'm showing you.";
//   }

//   if (input.includes('smoke') || input.includes('can\'t see')) {
//     return 'Stay low to the ground where the air is clearer. Cover your nose and mouth with cloth if possible. Keep following the blue path.';
//   }

//   if (input.includes('injured') || input.includes('hurt')) {
//     return "I'm alerting emergency responders to your location. If you can move, continue slowly toward the exit. If not, stay where you are and I'll guide help to you.";
//   }

//   if (input.includes('others') || input.includes('people')) {
//     return "Help others if you can do so safely, but your first priority is reaching the exit. I'm tracking everyone in the building.";
//   }

//   if (input.includes('exit') || input.includes('how far')) {
//     return `You're approximately ${distance.toFixed(0)} meters from the nearest safe exit. Keep moving forward.`;
//   }

//   if (input.includes('thank')) {
//     return "You're doing great. Stay focused and keep moving. We're getting you out safely.";
//   }

//   return "Stay calm and follow the blue path on your screen. I'm monitoring the situation and will update you if anything changes.";
// }

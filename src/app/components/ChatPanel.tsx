// ChatPanel.tsx
// Displays the conversation between user and AI with emergency-level styling

import React, { useEffect, useRef, useState } from 'react';
import type { Message, EmergencyLevel } from '../components/pages/AICompanionPage';

interface ChatPanelProps {
  messages: Message[];
  isLoading: boolean;
  emergencyLevel: EmergencyLevel;
  onSendMessage: (text: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  isLoading,
  emergencyLevel,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || isLoading) return;
    setInputText('');
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends (Shift+Enter = newline)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Message bubble styles ─────────────────────────────────────────────────
  const getMessageStyle = (msg: Message) => {
    if (msg.role === 'user') {
      return {
        container: 'items-end',
        bubble: 'bg-blue-600 text-white rounded-2xl rounded-br-md shadow-sm',
        label: 'text-blue-700/70',
      };
    }

    // AI message – style by emergency level
    const aiStyles = {
      safe: {
        bubble: 'bg-gray-100 border border-gray-200 text-gray-800 rounded-2xl rounded-bl-md shadow-sm',
        label: 'text-emerald-600/70',
      },
      warning: {
        bubble: 'bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl rounded-bl-md shadow-sm',
        label: 'text-amber-600/70',
      },
      critical: {
        bubble: 'bg-red-50 border border-red-200 text-red-800 rounded-2xl rounded-bl-md shadow-sm',
        label: 'text-red-600/70',
      },
    };

    const style = aiStyles[msg.emergencyLevel || 'safe'];
    return {
      container: 'items-start',
      ...style,
    };
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // ── Header border by level ────────────────────────────────────────────────
  const headerAccent = {
    safe: 'border-emerald-200',
    warning: 'border-amber-200',
    critical: 'border-red-200',
  }[emergencyLevel];

  return (
    <div className="h-full w-full rounded-2xl border border-gray-200 bg-white flex flex-col overflow-hidden shadow-sm" style={{ minHeight: '500px' }}>

      {/* Panel header */}
      <div className={`px-5 py-3 border-b ${headerAccent} bg-gray-50/80 flex items-center justify-between shrink-0`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-gray-500 tracking-widest uppercase">Live Communication Channel</span>
        </div>
        <span className="text-[10px] text-gray-400">{messages.length} messages</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm text-center">No messages yet. Use the microphone or type below.</p>
          </div>
        )}

        {messages.map(msg => {
          const style = getMessageStyle(msg);
          return (
            <div key={msg.id} className={`flex flex-col ${style.container} gap-1`}>
              {/* Role label + timestamp */}
              <div className="flex items-center gap-2 px-1">
                <span className={`text-[9px] tracking-widest font-bold uppercase ${style.label}`}>
                  {msg.role === 'user' ? '◀ YOU' : 'ARIA ▶'}
                </span>
                <span className="text-[9px] text-gray-400">{formatTime(msg.timestamp)}</span>
              </div>

              {/* Bubble */}
              <div className={`max-w-[85%] px-4 py-3 ${style.bubble} text-sm leading-relaxed`}>
                {/* Critical indicator on AI messages */}
                {msg.role === 'ai' && msg.emergencyLevel === 'critical' && (
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-red-200">
                    <span className="text-red-600 text-xs">⚠</span>
                    <span className="text-red-600 text-[10px] font-bold tracking-widest">CRITICAL GUIDANCE</span>
                  </div>
                )}
                {msg.role === 'ai' && msg.emergencyLevel === 'warning' && (
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-amber-200">
                    <span className="text-amber-600 text-xs">△</span>
                    <span className="text-amber-600 text-[10px] font-bold tracking-widest">SAFETY GUIDANCE</span>
                  </div>
                )}

                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          );
        })}

        {/* AI loading indicator */}
        {isLoading && (
          <div className="flex flex-col items-start gap-1">
            <span className="text-[9px] text-emerald-600/60 tracking-widest uppercase px-1">ARIA ▶</span>
            <div className="bg-gray-100 border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 shadow-sm">
              <div className="flex gap-1 items-end h-4">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-1.5 bg-blue-500/60 rounded-full animate-bounce"
                    style={{ height: `${8 + i * 3}px`, animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <span className="text-gray-500 text-xs tracking-wider">Analyzing situation…</span>
            </div>
          </div>
        )}

        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Text input area */}
      <div className="shrink-0 border-t border-gray-200 p-3 bg-gray-50/80">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message or use voice input above…"
            rows={1}
            disabled={isLoading}
            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800
              placeholder:text-gray-400 resize-none outline-none
              focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 transition-colors duration-200
              disabled:opacity-40 disabled:cursor-not-allowed
              scrollbar-none"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isLoading}
            aria-label="Send message"
            className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center
              hover:bg-blue-700 active:scale-95 transition-all duration-150
              disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-blue-600 shrink-0 shadow-sm"
          >
            {/* Send icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 translate-x-0.5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-1.5 px-1 tracking-wider">
          ENTER to send · SHIFT+ENTER for new line · Voice input recommended in emergencies
        </p>
      </div>
    </div>
  );
};

export default ChatPanel;
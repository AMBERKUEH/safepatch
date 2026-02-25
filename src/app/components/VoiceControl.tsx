// VoiceControl.tsx
// Handles browser Speech Recognition (webkitSpeechRecognition / SpeechRecognition)

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { EmergencyLevel } from '../components/pages/AICompanionPage';

interface VoiceControlProps {
  isListening: boolean;
  setIsListening: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  onTranscript: (text: string) => void;
  emergencyLevel: EmergencyLevel;
}

// ── Extend Window for webkit prefix ──────────────────────────────────────────
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

const VoiceControl: React.FC<VoiceControlProps> = ({
  isListening,
  setIsListening,
  isLoading,
  onTranscript,
  emergencyLevel,
}) => {
  const recognitionRef = useRef<any>(null);
  const [interimText, setInterimText] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // ── Check voice support on mount ─────────────────────────────────────────
  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceSupported(false);
    }
  }, []);

  // ── Initialize and start recognition ─────────────────────────────────────
  const startListening = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    // Clean up previous instance
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimText('');
    };

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim || final);

      if (final) {
        setInterimText('');
        onTranscript(final);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setInterimText('');

      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setPermissionDenied(true);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText('');
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setIsListening(false);
    }
  }, [onTranscript, setIsListening]);

  // ── Stop recognition ──────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setInterimText('');
  }, [setIsListening]);

  // ── Toggle handler ────────────────────────────────────────────────────────
  const handleToggle = () => {
    if (isLoading) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const listeningBg = {
    safe: 'bg-blue-600',
    warning: 'bg-amber-600',
    critical: 'bg-red-600',
  }[emergencyLevel];

  return (
    <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-2 py-1.5 border border-gray-200">
      
      {/* Compact microphone button */}
      <button
        onClick={handleToggle}
        disabled={!voiceSupported || isLoading || permissionDenied}
        aria-label={isListening ? 'Stop listening' : 'Start voice input'}
        className={`
          relative flex items-center justify-center w-8 h-8 rounded-full
          transition-all duration-200 active:scale-95
          ${isListening
            ? `${listeningBg} text-white scale-110`
            : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
          }
          disabled:opacity-30 disabled:cursor-not-allowed
        `}
      >
        {/* Mic icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-4 h-4"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
          <path d="M19 10v1a7 7 0 0 1-14 0v-1a1 1 0 0 1 2 0v1a5 5 0 0 0 10 0v-1a1 1 0 0 1 2 0z" />
          <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="9" y1="22" x2="15" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>

        {/* Small listening indicator */}
        {isListening && (
          <span className="absolute -top-1 -right-1 w-2 h-2">
            <span className={`absolute inline-flex h-full w-full rounded-full ${listeningBg} opacity-75 animate-ping`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${listeningBg}`} />
          </span>
        )}
      </button>

      {/* Status text - very compact */}
      <div className="flex-1 flex items-center min-w-[120px]">
        {isLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <div className="flex gap-0.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="text-[10px]">AI thinking...</span>
          </div>
        ) : isListening ? (
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold tracking-widest animate-pulse ${
              emergencyLevel === 'critical' ? 'text-red-600' :
              emergencyLevel === 'warning' ? 'text-amber-600' : 'text-blue-600'
            }`}>
              ●
            </span>
            <span className="text-[10px] text-gray-600">Listening...</span>
            {interimText && (
              <span className="text-[9px] text-gray-400 truncate max-w-[100px]">"{interimText}"</span>
            )}
          </div>
        ) : (
          <span className="text-[10px] text-gray-400">Click mic to speak</span>
        )}
      </div>

      {/* Compact warnings - shown as icons with tooltips */}
      {permissionDenied && (
        <div className="relative group">
          <span className="text-red-500 text-xs cursor-help">⚠️</span>
          <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[9px] rounded shadow-lg">
            Microphone access denied. Please enable in browser settings.
          </div>
        </div>
      )}

      {!voiceSupported && !permissionDenied && (
        <div className="relative group">
          <span className="text-amber-500 text-xs cursor-help">⚠️</span>
          <div className="absolute bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[9px] rounded shadow-lg">
            Voice not supported. Use Chrome or Edge.
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceControl;
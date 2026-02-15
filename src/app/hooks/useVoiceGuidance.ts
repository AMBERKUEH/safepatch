import { useEffect, useState, useCallback } from 'react';

export interface VoiceMessage {
  text: string;
  urgent?: boolean;
}

export function useVoiceGuidance() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [queue, setQueue] = useState<VoiceMessage[]>([]);

  const speak = useCallback((message: VoiceMessage) => {
    if (!isEnabled || !('speechSynthesis' in window)) return;

    // Add to queue
    setQueue((prev) => [...prev, message]);
  }, [isEnabled]);

  useEffect(() => {
    if (queue.length === 0 || isSpeaking) return;

    const message = queue[0];
    const utterance = new SpeechSynthesisUtterance(message.text);
    
    // Configure voice for emergency guidance
    utterance.rate = message.urgent ? 1.1 : 0.95; // Slightly faster for urgent
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setQueue((prev) => prev.slice(1));
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setQueue((prev) => prev.slice(1));
    };

    window.speechSynthesis.speak(utterance);
  }, [queue, isSpeaking]);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setQueue([]);
    setIsSpeaking(false);
  }, []);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
    if (isSpeaking) {
      stop();
    }
  }, [isSpeaking, stop]);

  return {
    speak,
    stop,
    toggle,
    isSpeaking,
    isEnabled,
  };
}

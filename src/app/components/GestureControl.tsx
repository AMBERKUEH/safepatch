import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, ThumbsUp, Square, Hand as OpenPalm, AlertTriangle, CheckCircle, Keyboard, Volume2, Phone } from 'lucide-react';
import { useGestureRecognition, GestureType } from '../hooks/useGestureRecognition';
import { useSocket } from '../hooks/useSocket';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { playEmergencyAlarm } from '../utils/emergencySound';
import { startSOSVibrationLoop, stopSOSVibrationLoop } from '../utils/hapticFeedback';
import { logSOSEvent } from '../services/firebase';

interface GestureControlProps {
  onGesture: (gesture: GestureType) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

const gestureIcons: Record<GestureType, { icon: typeof Hand; label: string; color: string }> = {
  thumbs_up: { icon: ThumbsUp, label: 'Confirm', color: 'text-green-500' },
  open_palm: { icon: OpenPalm, label: 'Repeat', color: 'text-blue-500' },
  closed_fist: { icon: Square, label: 'SOS', color: 'text-red-500' },
  pointing_up: { icon: Hand, label: 'Next Step', color: 'text-purple-500' },
  victory: { icon: CheckCircle, label: 'All Clear', color: 'text-yellow-500' },
  none: { icon: Hand, label: 'No Gesture', color: 'text-gray-400' },
};

export function GestureControl({ onGesture, isEnabled, onToggle }: GestureControlProps) {
  const {
    currentGesture,
    confirmedGesture,
    isActive,
    confidence,
    confirmProgress,
    lastError,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    setOnGestureConfirmed,
  } = useGestureRecognition();

  const { sendSOS, sendSafe } = useSocket();
  const [sosActive, setSosActive] = useState(false);
  const [show911Page, setShow911Page] = useState(false);
  const [gestureFlash, setGestureFlash] = useState(false);

  // Register gesture confirmed callback
  useEffect(() => {
    setOnGestureConfirmed((gesture: GestureType) => {
      onGesture(gesture);
      setGestureFlash(true);
      setTimeout(() => setGestureFlash(false), 800);

      if (gesture === 'closed_fist') {
        // Fist detected → show Call 911 page!
        triggerSOS();
      } else if (gesture === 'thumbs_up' && sosActive) {
        // Cancel SOS
        cancelSOS();
      }
    });
  }, [setOnGestureConfirmed, onGesture, sosActive]);

  const triggerSOS = useCallback(() => {
    setSosActive(true);
    setShow911Page(true);
    sendSOS();
    playEmergencyAlarm(3000);
    startSOSVibrationLoop();

    // Real Firebase Logging
    logSOSEvent({
      userId: 'user_' + Math.random().toString(36).substr(2, 9),
      type: 'GESTURE_SOS',
      status: 'active'
    });
  }, [sendSOS]);

  const cancelSOS = useCallback(() => {
    setSosActive(false);
    setShow911Page(false);
    sendSafe();
    stopSOSVibrationLoop();
  }, [sendSafe]);

  // Keyboard fallback controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      let gesture: GestureType | null = null;

      switch (key) {
        case 't': gesture = 'thumbs_up'; break;
        case 'p': gesture = 'open_palm'; break;
        case 's': gesture = 'closed_fist'; break;
        case 'n': gesture = 'pointing_up'; break;
        case 'v': gesture = 'victory'; break;
      }

      if (gesture) {
        onGesture(gesture);
        setGestureFlash(true);
        setTimeout(() => setGestureFlash(false), 800);

        if (gesture === 'closed_fist') triggerSOS();
        if (gesture === 'thumbs_up' && sosActive) cancelSOS();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onGesture, sosActive, triggerSOS, cancelSOS]);

  // When parent enables the control, start camera
  useEffect(() => {
    if (isEnabled && !isActive) {
      const t = setTimeout(() => startCamera(), 100);
      return () => clearTimeout(t);
    }
  }, [isEnabled, isActive, startCamera]);

  const handleToggleCamera = async () => {
    if (isActive) {
      stopCamera();
      onToggle();
    } else {
      await startCamera();
      onToggle();
    }
  };

  const currentIcon = gestureIcons[currentGesture];
  const Icon = currentIcon.icon;

  return (
    <>
      {/* ═══ CALL 911 EMERGENCY PAGE ═══ */}
      <AnimatePresence>
        {show911Page && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(185, 28, 28, 0.97)' }}
          >
            {/* Pulsing border */}
            <motion.div
              animate={{ opacity: [0.3, 0.9, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="absolute inset-0 border-[8px] border-white pointer-events-none"
            />

            {/* Main content */}
            <motion.div
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-center text-white mb-6"
            >
              <div className="text-8xl mb-4">🚨</div>
              <h1 className="text-5xl font-extrabold mb-2 tracking-tight">CALL 911</h1>
              <p className="text-xl opacity-90">Emergency fist gesture detected</p>
            </motion.div>

            {/* Call 911 button */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-4"
            >
              <Button
                onClick={() => window.open('tel:911')}
                className="bg-white text-red-700 hover:bg-red-50 text-2xl font-bold px-12 py-6 rounded-2xl shadow-2xl flex items-center gap-3 border-none h-auto"
              >
                <Phone className="w-8 h-8" />
                Call 911 Now
              </Button>

              <div className="text-white/80 text-sm max-w-xs text-center space-y-2 mt-4">
                <p>📍 Your location is being shared with emergency contacts</p>
                <p>🆘 SOS signal has been broadcast via mesh network</p>
                <p className="mt-4 font-semibold text-white/90">👍 Show thumbs up or press T to cancel</p>
              </div>

              <Button
                onClick={cancelSOS}
                variant="outline"
                className="mt-4 bg-white/10 border-white/40 text-white hover:bg-white/20"
              >
                Cancel Emergency
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="p-4 bg-white">
        <div className="space-y-4">
          {/* MediaPipe Error Banner */}
          {lastError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">MediaPipe Error</p>
                <p className="text-xs text-red-600">{lastError}</p>
                <p className="text-xs text-red-500 mt-1">Use keyboard shortcuts below as fallback.</p>
              </div>
            </div>
          )}

          {/* Video and Canvas */}
          {isEnabled ? (
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover transform scale-x-[-1]"
                playsInline
              />
              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="absolute inset-0 w-full h-full transform scale-x-[-1]"
              />

              {/* Confirmation progress bar */}
              {confirmProgress > 0 && confirmProgress < 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/50">
                  <motion.div
                    className={`h-full ${currentGesture === 'closed_fist' ? 'bg-red-500' : 'bg-green-500'}`}
                    animate={{ width: `${confirmProgress * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              )}

              {/* Gesture confirmed flash */}
              <AnimatePresence>
                {gestureFlash && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50"
                  >
                    <div className={`bg-white rounded-full p-6 shadow-2xl ${confirmedGesture === 'closed_fist' ? 'ring-4 ring-red-500' : ''
                      }`}>
                      <Icon className={`w-16 h-16 ${currentIcon.color}`} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">Camera Off</p>
              <Button onClick={handleToggleCamera} variant="outline" size="sm">
                Enable Camera
              </Button>
            </div>
          )}

          {/* Current gesture + confidence */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentGesture === 'closed_fist'
                ? 'bg-red-100'
                : currentGesture !== 'none'
                  ? 'bg-green-100'
                  : 'bg-gray-100'
                }`}>
                <Icon className={`w-6 h-6 ${currentIcon.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium">{currentIcon.label}</p>
                <p className="text-xs text-gray-500">
                  {confidence > 0 ? `${Math.round(confidence * 100)}% confidence` : 'No gesture detected'}
                </p>
              </div>
            </div>
            <Button onClick={handleToggleCamera} variant="outline" size="sm">
              {isActive ? 'Disable' : 'Enable'}
            </Button>
          </div>

          {/* SOS Status */}
          {sosActive && (
            <motion.div
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="bg-red-500 text-white p-3 rounded-xl text-center"
            >
              <p className="font-bold">🚨 EMERGENCY ACTIVE — CALL 911</p>
              <p className="text-xs">Thumbs up or press T to cancel</p>
            </motion.div>
          )}

          {/* Gesture guide with keyboard shortcuts */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Keyboard className="w-3 h-3 text-blue-600" />
              <p className="text-xs font-medium text-blue-900">Gesture / Keyboard Commands:</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              <div>👍 <kbd className="bg-blue-200 px-1 rounded">T</kbd> Confirm</div>
              <div>✋ <kbd className="bg-blue-200 px-1 rounded">P</kbd> Repeat</div>
              <div>✊ <kbd className="bg-blue-200 px-1 rounded">S</kbd> <span className="text-red-600 font-bold">Call 911</span></div>
              <div>☝️ <kbd className="bg-blue-200 px-1 rounded">N</kbd> Next Step</div>
              <div>✌️ <kbd className="bg-blue-200 px-1 rounded">V</kbd> All Clear</div>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}


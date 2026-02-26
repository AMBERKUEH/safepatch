import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, Info } from 'lucide-react';
import { Card } from '../ui/card';
import { GestureControl } from '../GestureControl';
import { EmergencyOverlay } from '../EmergencyOverlay';
import type { GestureType } from '../../hooks/useGestureRecognition';
import { useSocket } from '../../hooks/useSocket';
import { playEmergencyAlarm } from '../../utils/emergencySound';
import { sosVibrationPattern, startSOSVibrationLoop, stopSOSVibrationLoop } from '../../utils/hapticFeedback';
import { logSOSEvent } from '../../services/firebase';

export function GesturePage() {
  const [gestureEnabled, setGestureEnabled] = useState(false);
  const [flashVisible, setFlashVisible] = useState(false);
  const { sendSOS } = useSocket();

  const handleEmergencyFist = useCallback(() => {
    playEmergencyAlarm(2000);
    sosVibrationPattern();
    let count = 0;
    const flashInterval = setInterval(() => {
      setFlashVisible((v) => !v);
      count++;
      if (count >= 6) clearInterval(flashInterval);
    }, 250);
    setTimeout(() => setFlashVisible(false), 1600);
    setTimeout(() => setFlashVisible(false), 1600);
    sendSOS();
    startSOSVibrationLoop();


    // Real Firebase Logging
    logSOSEvent({
      userId: 'user_' + Math.random().toString(36).substr(2, 9),
      type: 'GESTURE_SOS',
      status: 'active'
    });
  }, [sendSOS]);

  const handleDismissEmergency = useCallback(() => {
    stopSOSVibrationLoop();
  }, []);

  const handleGesture = useCallback(
    (gesture: GestureType) => {
      if (gesture === 'closed_fist') {
        handleEmergencyFist();
      }
    },
    [handleEmergencyFist]
  );

  const gestures = [
    { icon: '👍', name: 'Thumbs Up', action: 'Confirm / Continue', color: 'from-green-500 to-emerald-500' },
    { icon: '✋', name: 'Open Palm', action: 'Repeat Instruction', color: 'from-blue-500 to-cyan-500' },
    { icon: '✊', name: 'Closed Fist', action: 'Send SOS Signal', color: 'from-red-500 to-orange-500' },
    { icon: '☝️', name: 'Pointing Up', action: 'Show Next Step', color: 'from-purple-500 to-pink-500' },
    { icon: '✌️', name: 'Victory', action: 'All Clear / Safe', color: 'from-yellow-500 to-amber-500' },
  ];

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Red flash overlay when SOS triggered */}
      <AnimatePresence>
        {flashVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-red-500/40 pointer-events-none z-[90]"
          />
        )}
      </AnimatePresence>

      {/* Emergency confirmation overlay removed here - GestureControl handles its own Call 911 UI */}

      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <Hand className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gesture Control</h1>
            <p className="text-purple-100 text-sm">Hands-free interaction (MediaPipe)</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Live MediaPipe gesture control */}
        <GestureControl
          isEnabled={gestureEnabled}
          onToggle={() => setGestureEnabled((e) => !e)}
          onGesture={handleGesture}
        />

        {/* Info Alert */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 p-4 rounded-2xl"
        >
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Hands-Free Control</p>
              <p className="text-xs text-blue-700 mt-1">
                Perfect for emergencies when you can't touch your device. Works with gloves too!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Gesture List */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Available Gestures</h2>
          <div className="space-y-3">
            {gestures.map((gesture, index) => (
              <motion.div
                key={gesture.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gesture.color} flex items-center justify-center text-3xl shadow-lg`}
                    >
                      {gesture.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{gesture.name}</h3>
                      <p className="text-sm text-gray-600 mt-0.5">{gesture.action}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <Card className="p-5 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <h3 className="font-semibold text-purple-900 mb-3">How It Works</h3>
          <div className="space-y-2 text-sm text-purple-800">
            <div className="flex items-start gap-2">
              <span className="text-purple-600">1.</span>
              <p>Enable your camera to start tracking</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">2.</span>
              <p>Show your hand clearly to the camera</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">3.</span>
              <p>Make any gesture from the list above</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-purple-600">4.</span>
              <p>The system will recognize and respond instantly</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

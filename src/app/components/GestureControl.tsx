import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Hand, ThumbsUp, Square, Hand as OpenPalm, AlertTriangle, CheckCircle } from 'lucide-react';
import { useGestureRecognition, GestureType } from '../hooks/useGestureRecognition';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface GestureControlProps {
  onGesture: (gesture: GestureType) => void;
  isEnabled: boolean;
  onToggle: () => void;
}

const gestureIcons: Record<GestureType, { icon: any; label: string; color: string }> = {
  thumbs_up: { icon: ThumbsUp, label: 'Confirm', color: 'text-green-500' },
  open_palm: { icon: OpenPalm, label: 'Repeat', color: 'text-blue-500' },
  closed_fist: { icon: Square, label: 'SOS', color: 'text-red-500' },
  pointing_up: { icon: Hand, label: 'Next Step', color: 'text-purple-500' },
  victory: { icon: CheckCircle, label: 'All Clear', color: 'text-yellow-500' },
  none: { icon: Hand, label: 'No Gesture', color: 'text-gray-400' },
};

export function GestureControl({ onGesture, isEnabled, onToggle }: GestureControlProps) {
  const { currentGesture, isActive, videoRef, canvasRef, startCamera, stopCamera } =
    useGestureRecognition();
  const [lastGesture, setLastGesture] = useState<GestureType>('none');
  const [gestureConfirmed, setGestureConfirmed] = useState(false);

  useEffect(() => {
    if (currentGesture !== 'none' && currentGesture !== lastGesture) {
      setLastGesture(currentGesture);
      setGestureConfirmed(true);
      onGesture(currentGesture);
      
      // Reset confirmation animation
      setTimeout(() => setGestureConfirmed(false), 1000);
    }
  }, [currentGesture, lastGesture, onGesture]);

  // When parent enables the control, start camera once the video element is mounted
  useEffect(() => {
    if (isEnabled && !isActive) {
      const t = setTimeout(() => startCamera(), 100);
      return () => clearTimeout(t);
    }
  }, [isEnabled]);

  const handleToggleCamera = async () => {
    if (isActive) {
      stopCamera();
      onToggle();
    } else {
      await startCamera();
      onToggle();
    }
  };

  if (!isEnabled) {
    return (
      <Card className="p-4 bg-gray-50">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-3">Gesture Control Disabled</p>
          <Button onClick={handleToggleCamera} variant="outline" size="sm">
            Enable Gesture Control
          </Button>
        </div>
      </Card>
    );
  }

  const currentIcon = gestureIcons[currentGesture];
  const Icon = currentIcon.icon;

  return (
    <Card className="p-4 bg-white">
      <div className="space-y-4">
        {/* Video and Canvas */}
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
          
          {/* Gesture indicator overlay */}
          <AnimatePresence>
            {gestureConfirmed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="absolute inset-0 flex items-center justify-center bg-black/50"
              >
                <div className="bg-white rounded-full p-6">
                  <Icon className={`w-16 h-16 ${currentIcon.color}`} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Current gesture display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className={`w-6 h-6 ${currentIcon.color}`} />
            <div>
              <p className="text-sm font-medium">{currentIcon.label}</p>
              <p className="text-xs text-gray-500">Current Gesture</p>
            </div>
          </div>
          <Button onClick={handleToggleCamera} variant="outline" size="sm">
            Disable Camera
          </Button>
        </div>

        {/* Gesture guide */}
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-xs font-medium text-blue-900 mb-2">Gesture Commands:</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
            <div>👍 Confirm direction</div>
            <div>✋ Repeat instruction</div>
            <div>✊ Send SOS signal</div>
            <div>☝️ Show next step</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

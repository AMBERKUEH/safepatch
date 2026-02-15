import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Camera, ArrowRight, ArrowLeft, ArrowUp } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { useVoiceGuidance } from '../hooks/useVoiceGuidance';

export type ExitDirection = 'left' | 'right' | 'straight' | null;

/**
 * Vision mode: camera feed + overlay showing exit direction.
 * For hackathon demo, "exit detection" can be simulated with buttons.
 * Later: plug in real exit sign detection (e.g. Google Cloud Vision).
 */
export function VisionNavigationView() {
  const [cameraActive, setCameraActive] = useState(false);
  const [exitDirection, setExitDirection] = useState<ExitDirection>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { speak } = useVoiceGuidance();

  useEffect(() => {
    if (!cameraActive) return;
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      })
      .catch(() => setCameraActive(false));
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraActive]);

  const handleSimulateExit = (dir: ExitDirection) => {
    setExitDirection(dir);
    if (dir) {
      const msg =
        dir === 'left'
          ? 'Exit sign detected on your left.'
          : dir === 'right'
            ? 'Exit sign detected on your right.'
            : 'Exit ahead. Continue straight.';
      speak({ text: msg });
    }
  };

  return (
    <div className="space-y-4">
      {/* Camera + AR-style overlay */}
      <Card className="overflow-hidden bg-black">
        <div className="relative aspect-[4/3] bg-gray-900">
          {!cameraActive ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
              <Camera className="w-16 h-16 opacity-50" />
              <p className="text-sm">Enable camera for Vision mode</p>
              <Button onClick={() => setCameraActive(true)}>Turn on camera</Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              {/* AR-style exit direction overlay */}
              {exitDirection && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                >
                  <div className="bg-green-500/90 text-white px-4 py-3 rounded-xl flex items-center gap-3 shadow-lg">
                    {exitDirection === 'left' && <ArrowLeft className="w-8 h-8" />}
                    {exitDirection === 'right' && <ArrowRight className="w-8 h-8" />}
                    {exitDirection === 'straight' && <ArrowUp className="w-8 h-8" />}
                    <span className="font-bold text-lg">EXIT AHEAD →</span>
                  </div>
                  <p className="text-white mt-2 text-sm drop-shadow-lg">
                    {exitDirection === 'left' && 'Turn left'}
                    {exitDirection === 'right' && 'Turn right'}
                    {exitDirection === 'straight' && 'Go straight'}
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Demo: simulate exit detection (for hackathon) */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm font-medium text-blue-900 mb-2">Demo: Simulate exit sign</p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSimulateExit('left')}
            className="bg-white"
          >
            Exit on left
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSimulateExit('straight')}
            className="bg-white"
          >
            Exit straight
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSimulateExit('right')}
            className="bg-white"
          >
            Exit on right
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSimulateExit(null)}
            className="text-gray-600"
          >
            Clear
          </Button>
        </div>
        <p className="text-xs text-blue-700 mt-2">
          In production, exit signs are detected automatically via camera (Vision API).
        </p>
      </Card>
    </div>
  );
}

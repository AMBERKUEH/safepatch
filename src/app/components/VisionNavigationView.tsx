import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Navigation, Shield, Volume2, Hand, Keyboard } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useVoiceGuidance } from '../hooks/useVoiceGuidance';
import { useGestureRecognition } from '../hooks/useGestureRecognition';
import { useSocket } from '../hooks/useSocket';
import { playEmergencyAlarm } from '../utils/emergencySound';
import { startSOSVibrationLoop, stopSOSVibrationLoop } from '../utils/hapticFeedback';
import type { FloorNode } from '../data/floorPlanGraph';
import type { TurnInstruction } from '../utils/pathfinding';
import type { GestureType } from '../hooks/useGestureRecognition';

interface VisionNavigationViewProps {
  pathNodes?: FloorNode[];
  turns?: TurnInstruction[];
  distance?: number;
  exitLabel?: string;
  safetyScore?: number;
}

const gestureLabels: Record<GestureType, { emoji: string; label: string }> = {
  thumbs_up: { emoji: '👍', label: 'OK / Cancel SOS' },
  open_palm: { emoji: '✋', label: 'Repeat Instruction' },
  closed_fist: { emoji: '✊', label: 'SOS EMERGENCY' },
  pointing_up: { emoji: '☝️', label: 'Next Step' },
  victory: { emoji: '✌️', label: 'All Clear' },
  none: { emoji: '', label: '' },
};

/**
 * Unified AR Navigation + Gesture Control view.
 * Single camera feed showing:
 *  - AR arrows pointing to exit
 *  - MediaPipe hand gesture detection overlay
 *  - SOS fist → triggers emergency alert + location broadcast
 *  - Turn-by-turn HUD overlay
 */
export function VisionNavigationView({
  pathNodes = [],
  turns = [],
  distance = 0,
  exitLabel = 'Exit',
  safetyScore = 0,
}: VisionNavigationViewProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [showSOSFlash, setShowSOSFlash] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { speak } = useVoiceGuidance();
  const { sendSOS, sendSafe, sendPosition } = useSocket();
  const [announced, setAnnounced] = useState('');

  // Gesture recognition — uses same camera feed
  const {
    currentGesture,
    confirmedGesture,
    confirmProgress,
    confidence,
    canvasRef,
    startCamera: startGestureCamera,
    stopCamera: stopGestureCamera,
    setOnGestureConfirmed,
  } = useGestureRecognition();

  // Direction from pathfinding
  const currentDirection = useMemo<'left' | 'right' | 'straight' | 'up' | 'down'>(() => {
    if (turns.length > 0) {
      const t = turns[0].direction;
      if (t === 'LEFT') return 'left';
      if (t === 'RIGHT') return 'right';
      if (t === 'UP') return 'up';
      if (t === 'DOWN') return 'down';
    }
    return 'straight';
  }, [turns]);

  // SOS trigger
  const triggerSOS = useCallback(() => {
    setSosActive(true);
    setShowSOSFlash(true);
    sendSOS();
    playEmergencyAlarm(3000);
    startSOSVibrationLoop();

    // Send current position as emergency location
    if (pathNodes.length > 0) {
      sendPosition({ x: pathNodes[0].x, y: pathNodes[0].y });
    }

    speak({ text: 'SOS emergency signal sent. Help is being notified.' });
  }, [sendSOS, sendPosition, pathNodes, speak]);

  const cancelSOS = useCallback(() => {
    setSosActive(false);
    setShowSOSFlash(false);
    sendSafe();
    stopSOSVibrationLoop();
    speak({ text: 'SOS cancelled. You are marked as safe.' });
  }, [sendSafe, speak]);

  // Register gesture callbacks
  useEffect(() => {
    setOnGestureConfirmed((gesture: GestureType) => {
      if (gesture === 'closed_fist') {
        triggerSOS();
      } else if (gesture === 'thumbs_up' && sosActive) {
        cancelSOS();
      } else if (gesture === 'open_palm') {
        // Repeat current direction
        const msg = turns.length > 0
          ? `Turn ${turns[0].direction.toLowerCase()} in ${turns[0].distanceToNext} meters.`
          : `Continue to ${exitLabel}. Distance: ${distance.toFixed(0)} meters.`;
        speak({ text: msg });
      } else if (gesture === 'pointing_up') {
        // Announce next step
        speak({ text: directionText });
      }
    });
  }, [setOnGestureConfirmed, triggerSOS, cancelSOS, sosActive, turns, exitLabel, distance, speak]);

  // Keyboard fallback
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 's') triggerSOS();
      if (key === 't' && sosActive) cancelSOS();
      if (key === 'p') {
        const msg = turns.length > 0
          ? `Turn ${turns[0].direction.toLowerCase()} in ${turns[0].distanceToNext} meters.`
          : `Continue to ${exitLabel}.`;
        speak({ text: msg });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [triggerSOS, cancelSOS, sosActive, turns, exitLabel, speak]);

  // Auto-announce turns
  useEffect(() => {
    if (turns.length > 0 && cameraActive) {
      const turn = turns[0];
      const msg = `Turn ${turn.direction.toLowerCase()} in ${turn.distanceToNext} meters.`;
      if (msg !== announced) {
        speak({ text: msg });
        setAnnounced(msg);
      }
    }
  }, [turns, cameraActive, speak, announced]);

  // Start unified camera (video for AR + gesture for MediaPipe)
  const startUnifiedCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Also start gesture recognizer on same stream
      setTimeout(() => startGestureCamera(), 300);
    } catch {
      setCameraActive(false);
    }
  };

  const stopUnifiedCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    stopGestureCamera();
    setCameraActive(false);
  };

  // Arrow rotation based on direction
  const arrowRotation = useMemo(() => {
    switch (currentDirection) {
      case 'left': return 'rotateY(-30deg) rotateZ(90deg)';
      case 'right': return 'rotateY(30deg) rotateZ(-90deg)';
      case 'up': return 'rotateX(15deg)';
      case 'down': return 'rotateX(-15deg) rotateZ(180deg)';
      default: return 'rotateX(15deg)';
    }
  }, [currentDirection]);

  const directionText = useMemo(() => {
    if (turns.length > 0) {
      const t = turns[0];
      const dirMap: Record<string, string> = {
        LEFT: '← TURN LEFT',
        RIGHT: 'TURN RIGHT →',
        UP: '↑ GO STRAIGHT',
        DOWN: '↓ GO BACK',
        STRAIGHT: '↑ GO STRAIGHT',
      };
      return `${dirMap[t.direction]} in ${t.distanceToNext}m`;
    }
    return `↑ HEAD TO ${exitLabel.toUpperCase()}`;
  }, [turns, exitLabel]);

  return (
    <>
      {/* === SOS FULL-SCREEN OVERLAY === */}
      <AnimatePresence>
        {showSOSFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: 'rgba(220, 38, 38, 0.95)' }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-center text-white"
            >
              <div className="text-8xl mb-6">🆘</div>
              <h1 className="text-4xl font-bold mb-2">SOS SENT</h1>
              <p className="text-xl opacity-90 mb-1">Emergency signal broadcast</p>
              <p className="text-sm opacity-70 mb-1">📍 Your location has been shared</p>
              <p className="text-sm opacity-70">🚨 Emergency response team notified</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-8 text-center text-white space-y-3"
            >
              <p className="text-sm">👍 Show thumbs up or press <kbd className="bg-white/30 px-2 py-0.5 rounded">T</kbd> to cancel</p>
              <div className="flex gap-3">
                <Button onClick={cancelSOS} variant="outline" className="bg-white/20 border-white text-white hover:bg-white/30">
                  Cancel SOS
                </Button>
                <Button onClick={() => window.open('tel:911')} className="bg-white text-red-600 hover:bg-white/90 font-bold">
                  📞 Call 911
                </Button>
              </div>
            </motion.div>

            {/* Pulsing border */}
            <motion.div
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 border-[8px] border-white pointer-events-none"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {/* === UNIFIED CAMERA VIEW === */}
        <Card className="overflow-hidden bg-black">
          <div className="relative aspect-[4/3] bg-gray-900" style={{ perspective: '800px' }}>
            {!cameraActive ? (
              // Camera off — show activation prompt
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4 p-6">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mb-2">
                  <Camera className="w-10 h-10 opacity-60" />
                </div>
                <h3 className="text-lg font-bold">AR Navigation + Gesture Control</h3>
                <p className="text-sm text-center text-gray-400 max-w-xs">
                  Camera provides AR exit guidance and detects emergency gestures — no touch needed
                </p>
                <Button onClick={startUnifiedCamera} size="lg" className="bg-blue-600 hover:bg-blue-700 px-8">
                  <Camera className="w-4 h-4 mr-2" />
                  Start AR Camera
                </Button>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">🧭 AR Navigation</Badge>
                  <Badge variant="secondary" className="text-xs">✊ Gesture SOS</Badge>
                  <Badge variant="secondary" className="text-xs">🔊 Voice Guide</Badge>
                </div>
              </div>
            ) : (
              <>
                {/* Live camera feed */}
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  playsInline
                  muted
                />

                {/* Gesture landmark canvas overlay (from MediaPipe) */}
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  style={{ transform: 'scaleX(-1)' }}
                />

                {/* ===== AR OVERLAY LAYER ===== */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">

                  {/* Floating 3D arrow */}
                  <motion.div
                    animate={{ y: [0, -15, 0], opacity: [0.9, 1, 0.9] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ transform: arrowRotation, transformStyle: 'preserve-3d' }}
                    className="mb-4"
                  >
                    <svg
                      width="100" height="100" viewBox="0 0 120 120"
                      fill="none" xmlns="http://www.w3.org/2000/svg"
                      style={{ filter: 'drop-shadow(0 0 30px rgba(0, 200, 255, 0.7))' }}
                    >
                      <defs>
                        <linearGradient id="arrowGrad" x1="60" y1="110" x2="60" y2="10">
                          <stop offset="0%" stopColor="#00c8ff" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#00c8ff" stopOpacity="1" />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>
                      <rect x="48" y="50" width="24" height="60" rx="4" fill="url(#arrowGrad)" filter="url(#glow)" />
                      <polygon points="60,5 20,55 45,55 45,50 75,50 75,55 100,55" fill="url(#arrowGrad)" filter="url(#glow)" />
                      <rect x="55" y="60" width="10" height="40" rx="2" fill="rgba(255,255,255,0.5)" />
                    </svg>
                  </motion.div>

                  {/* Direction text */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-black/60 backdrop-blur-md text-white px-6 py-3 rounded-2xl border border-cyan-400/50"
                    style={{ boxShadow: '0 0 30px rgba(0, 200, 255, 0.3)' }}
                  >
                    <p className="text-lg font-bold text-center text-cyan-300">{directionText}</p>
                  </motion.div>

                  {/* Distance + exit badge */}
                  <motion.div
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="mt-3 bg-green-500/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2"
                    style={{ boxShadow: '0 0 20px rgba(76, 175, 80, 0.5)' }}
                  >
                    <Shield className="w-4 h-4" />
                    {exitLabel}: {distance.toFixed(1)}m
                  </motion.div>
                </div>

                {/* ===== GESTURE STATUS HUD (bottom-left) ===== */}
                <div className="absolute bottom-3 left-3 pointer-events-none">
                  <AnimatePresence mode="wait">
                    {currentGesture !== 'none' ? (
                      <motion.div
                        key={currentGesture}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className={`px-3 py-2 rounded-xl backdrop-blur-md text-white text-sm font-medium flex items-center gap-2 ${currentGesture === 'closed_fist'
                            ? 'bg-red-600/80 border border-red-400'
                            : 'bg-black/60 border border-white/20'
                          }`}
                      >
                        <span className="text-lg">{gestureLabels[currentGesture].emoji}</span>
                        <div>
                          <p className="text-xs font-bold">{gestureLabels[currentGesture].label}</p>
                          <p className="text-[10px] opacity-70">{Math.round(confidence * 100)}%</p>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="ready"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm text-white/60 text-xs flex items-center gap-2"
                      >
                        <Hand className="w-3 h-3" />
                        Gesture Ready
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ===== CONFIRMATION PROGRESS BAR (bottom) ===== */}
                {confirmProgress > 0 && confirmProgress < 1 && (
                  <div className="absolute bottom-0 left-0 right-0 h-1.5">
                    <motion.div
                      className={`h-full ${currentGesture === 'closed_fist' ? 'bg-red-500' : 'bg-cyan-400'}`}
                      animate={{ width: `${confirmProgress * 100}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                )}

                {/* ===== SOS ACTIVE INDICATOR (top-right) ===== */}
                {sosActive && (
                  <motion.div
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-bold pointer-events-none flex items-center gap-1.5"
                  >
                    🆘 SOS ACTIVE
                  </motion.div>
                )}

                {/* Scanner corner brackets */}
                <div className="absolute inset-4 pointer-events-none">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-cyan-400/60 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-cyan-400/60 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-cyan-400/60 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-cyan-400/60 rounded-br-lg" />
                </div>

                {/* Scanning line */}
                <motion.div
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30 pointer-events-none"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                />

                {/* Camera off button */}
                <button
                  onClick={stopUnifiedCamera}
                  className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs hover:bg-black/70 transition-colors pointer-events-auto"
                >
                  ✕ Close
                </button>
              </>
            )}
          </div>
        </Card>

        {/* === TURN-BY-TURN + GESTURE QUICK GUIDE === */}
        <div className="grid grid-cols-2 gap-3">
          {/* Upcoming turns */}
          {turns.length > 0 && (
            <Card className="p-3 bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
              <div className="flex items-center gap-1.5 mb-2">
                <Navigation className="w-3 h-3 text-cyan-600" />
                <p className="text-xs font-semibold text-cyan-900">Turns</p>
              </div>
              <div className="space-y-1.5">
                {turns.slice(0, 3).map((turn, i) => (
                  <div key={turn.atNodeId + i} className="flex items-center gap-2 text-xs">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-cyan-500 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>{i + 1}</span>
                    <span>
                      {turn.direction === 'LEFT' ? '⬅️' :
                        turn.direction === 'RIGHT' ? '➡️' :
                          turn.direction === 'UP' ? '⬆️' : '⬇️'}
                    </span>
                    <span className={i === 0 ? 'font-bold text-cyan-900' : 'text-gray-500'}>
                      {turn.distanceToNext}m
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Gesture quick ref */}
          <Card className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Hand className="w-3 h-3 text-purple-600" />
              <p className="text-xs font-semibold text-purple-900">Gestures</p>
            </div>
            <div className="space-y-1 text-[11px] text-purple-800">
              <div>✊ Fist = <strong className="text-red-600">SOS 911</strong></div>
              <div>👍 Thumb = Cancel SOS</div>
              <div>✋ Palm = Repeat</div>
              <div>☝️ Point = Next Step</div>
            </div>
          </Card>
        </div>

        {/* Keyboard shortcuts (small) */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 justify-center">
          <Keyboard className="w-3 h-3" />
          <span><kbd className="bg-gray-200 text-gray-600 px-1 rounded">S</kbd> SOS</span>
          <span><kbd className="bg-gray-200 text-gray-600 px-1 rounded">T</kbd> Cancel</span>
          <span><kbd className="bg-gray-200 text-gray-600 px-1 rounded">P</kbd> Repeat</span>
        </div>

        {/* Voice button */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => speak({ text: `Continue to ${exitLabel}. Distance: ${distance.toFixed(0)} meters. ${directionText}.` })}
        >
          <Volume2 className="w-4 h-4 mr-2" />
          Announce Direction
        </Button>
      </div>
    </>
  );
}

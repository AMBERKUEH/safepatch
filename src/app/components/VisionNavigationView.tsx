import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Shield, AlertTriangle, Map as MapIcon, Volume2, Hand } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useVoiceGuidance } from '../hooks/useVoiceGuidance';
import { useGestureRecognition } from '../hooks/useGestureRecognition';
import { useSocket } from '../hooks/useSocket';
import { findGraphPath } from '../utils/pathfinding';
import { playEmergencyAlarm } from '../utils/emergencySound';
import { startSOSVibrationLoop, stopSOSVibrationLoop } from '../utils/hapticFeedback';
import { logSOSEvent } from '../services/firebase';

// --- API Types ---
interface FloorNode {
  nodeId: string;
  x: number;
  y: number;
  z: number;
  type: 'junction' | 'room' | 'exit' | 'stairs' | 'doorway';
  label?: string;
}

interface FloorEdge {
  edgeId: string;
  from: string;
  to: string;
  length: number;
  baseCost: number;
}

interface SensorData {
  sensorId: string;
  x: number;
  y: number;
  value: number; // > 0.7 = hazard
}

interface FloorPlanResponse {
  nodes: FloorNode[];
  edges: FloorEdge[];
  walls: { x1: number; y1: number; x2: number; y2: number }[];
}

interface VisionNavigationViewProps {
  userPos: { x: number; y: number };
  currentRoute: any;
  graph: FloorPlanResponse;
  sensors: SensorData[];
  heading: number;
  onHeadingChange: (heading: number) => void;
}

/**
 * SafePath AR — API Driven Vision Navigation
 */
export function VisionNavigationView({
  userPos,
  currentRoute,
  graph,
  sensors,
  heading,
  onHeadingChange
}: VisionNavigationViewProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [showSOSOverlay, setShowSOSOverlay] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const arCanvasRef = useRef<HTMLCanvasElement>(null);
  const miniMapRef = useRef<HTMLCanvasElement>(null);

  const { speak } = useVoiceGuidance();
  const { socket, connected } = useSocket();
  const {
    currentGesture,
    confirmProgress,
    confidence,
    isReady: isGestureReady,
    canvasRef: gestureCanvasRef,
    startDetectionOn,
    stopDetection,
    setOnGestureConfirmed
  } = useGestureRecognition();

  // --- 4. Gesture SOS Integration ---
  const triggerSOS = useCallback(() => {
    setSosActive(true);
    setShowSOSOverlay(true);
    playEmergencyAlarm(3000);
    startSOSVibrationLoop();

    if (socket) {
      socket.emit('sos_triggered', {
        userId: socket.id,
        x: userPos.x,
        y: userPos.y,
        floor: 0,
        ts: Date.now()
      });
    }

    // Real Firebase Logging
    logSOSEvent({
      userId: socket?.id || 'unknown',
      type: 'VISION_GESTURE_SOS',
      location: { x: userPos.x, y: userPos.y },
      status: 'active'
    });

    speak({ text: "Emergency SOS triggered. 911 dispatch notified." });
  }, [socket, userPos, speak]);

  useEffect(() => {
    setOnGestureConfirmed((gesture) => {
      if (gesture === 'closed_fist') {
        triggerSOS();
      } else if (gesture === 'thumbs_up' && sosActive) {
        setSosActive(false);
        setShowSOSOverlay(false);
        stopSOSVibrationLoop();
      }
    });
  }, [setOnGestureConfirmed, triggerSOS, sosActive]);

  // --- 5. AR Rendering (Arrows & HUD) ---
  useEffect(() => {
    if (!cameraActive || !currentRoute || !arCanvasRef.current) return;

    const ctx = arCanvasRef.current.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    const render = () => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

      // Compute direction from ACTUAL userPos to the next waypoint in path
      const nextNode = currentRoute.path.length > 1 ? currentRoute.path[1] : currentRoute.path[0];

      if (nextNode) {
        const dx = nextNode.x - userPos.x;
        const dy = nextNode.y - userPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Only draw if we aren't "on" the node
        if (dist > 10) {
          // Calculate angle relative to the world
          const worldAngle = Math.atan2(dy, dx);

          // Adjust for user's heading (simulated camera orientation)
          // heading is in degrees, convert to radians
          const headingRad = (heading * Math.PI) / 180;
          const relativeAngle = worldAngle - headingRad;

          const centerX = ctx.canvas.width / 2;
          const centerY = ctx.canvas.height / 2 + 100;
          const scale = Math.max(0.6, Math.min(1.4, 150 / dist));

          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(relativeAngle + Math.PI / 2); // Rotate the arrow element
          ctx.scale(scale, scale);

          // Arrow shadow/glow
          ctx.shadowBlur = 20;
          ctx.shadowColor = 'rgba(0, 247, 255, 0.8)';

          // Draw Arrow Head (Triangle)
          ctx.beginPath();
          ctx.moveTo(0, -50);
          ctx.lineTo(25, 0);
          ctx.lineTo(-25, 0);
          ctx.closePath();
          ctx.fillStyle = '#00f7ff';
          ctx.fill();

          // Draw Arrow Shaft
          ctx.beginPath();
          ctx.rect(-12, 0, 24, 35);
          ctx.fillStyle = '#00f7ff';
          ctx.fill();

          ctx.restore();
        } else if (currentRoute.path.length === 1 && nextNode.type === 'exit') {
          // Arrived at exit!
          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 30px Inter, system-ui';
          ctx.textAlign = 'center';
          ctx.fillText('EXIT ARRIVED', ctx.canvas.width / 2, ctx.canvas.height / 2);
        }
      }

      frameId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(frameId);
  }, [cameraActive, currentRoute, userPos, heading]);

  // --- 6. Mini-Map Rendering (Low Visibility Helper) ---
  useEffect(() => {
    if (!graph || !miniMapRef.current) return;
    const ctx = miniMapRef.current.getContext('2d');
    if (!ctx) return;

    const scale = 0.25;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw Walls
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    graph.walls.forEach(w => {
      ctx.beginPath();
      ctx.moveTo(w.x1 * scale, w.y1 * scale);
      ctx.lineTo(w.x2 * scale, w.y2 * scale);
      ctx.stroke();
    });

    // Draw Hazard Zones
    sensors.forEach(s => {
      if (s.value > 0.7) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.arc(s.x * scale, s.y * scale, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Route
    if (currentRoute) {
      ctx.strokeStyle = '#00f7ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      currentRoute.path.forEach((n: any, i: number) => {
        if (i === 0) ctx.moveTo(n.x * scale, n.y * scale);
        else ctx.lineTo(n.x * scale, n.y * scale);
      });
      ctx.stroke();
    }

    // Draw User (with heading indicator)
    ctx.save();
    ctx.translate(userPos.x * scale, userPos.y * scale);
    ctx.rotate((heading * Math.PI) / 180);

    // User dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Heading line
    ctx.strokeStyle = '#00f7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -10);
    ctx.stroke();

    ctx.restore();

  }, [graph, sensors, currentRoute, userPos, heading]);

  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
      });
      console.log('Camera started:', s.getVideoTracks()[0].getSettings());
      setStream(s);
      setCameraActive(true);
    } catch (err) {
      console.error('Camera fail:', err);
    }
  };

  useEffect(() => {
    if (cameraActive && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().then(() => {
        startDetectionOn(videoRef.current!);
      }).catch(err => console.error("Video play failed:", err));
    }
  }, [cameraActive, stream, startDetectionOn]);

  const stopCamera = () => {
    stopDetection();
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  return (
    <div className="relative h-[calc(100vh-80px)] overflow-hidden bg-black flex flex-col items-center justify-center">
      {/* SOS Overlay */}
      <AnimatePresence>
        {showSOSOverlay && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600/90 text-white text-center p-6"
          >
            <AlertTriangle className="w-24 h-24 mb-4 animate-pulse" />
            <h1 className="text-4xl font-bold mb-2">911 SOS TRIGGERED</h1>
            <p className="text-xl mb-6">Emergency services have been notified of your location.</p>
            <div className="space-y-4">
              <Button onClick={() => setShowSOSOverlay(false)} variant="outline" className="text-white border-white">
                Dismiss Overlay
              </Button>
              <p className="text-sm opacity-70">Show 👍 Thumbs Up to Mark as Safe</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!cameraActive ? (
        <div className="text-center space-y-6 max-w-sm px-6">
          <div className="w-24 h-24 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Camera className="w-12 h-12 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">SafePath AR</h2>
          <p className="text-gray-400 text-sm">
            AI-driven emergency evacuation. Real-time hazard detection and gesture-based emergency alerts.
          </p>
          <Button onClick={startCamera} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
            Access System Camera
          </Button>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-500">
            <Badge variant="outline" className="border-gray-800">API Pathfinding</Badge>
            <Badge variant="outline" className="border-gray-800">Gesture SOS</Badge>
            <Badge variant="outline" className="border-gray-800">AR Arrows</Badge>
            <Badge variant="outline" className="border-gray-800">Live Sensors</Badge>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full">
          {/* Camera Feed */}
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
          />

          {/* AR Arrow Layer */}
          <canvas
            ref={arCanvasRef}
            width={640} height={480}
            className="absolute inset-0 w-full h-full pointer-events-none"
          />

          {/* Gesture Landmark Layer */}
          <canvas
            ref={gestureCanvasRef}
            width={640} height={480}
            className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
          />

          {cameraActive && (
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20 pointer-events-auto">
              <Button
                onClick={async () => {
                  stopCamera();
                  await startCamera();
                }}
                className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] h-8"
              >
                Reset Camera
              </Button>
              <Badge variant="secondary" className="bg-black/40 text-white/70 border-white/10 text-[10px]">
                Vision Engine: {isGestureReady ? 'Active' : 'Initializing...'}
              </Badge>
            </div>
          )}

          {/* HUD Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent flex justify-between items-start pointer-events-none">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-white font-bold text-lg">SafePath AR Active</span>
              </div>
              <p className="text-xs text-gray-300">Target: {currentRoute?.exitUsed || 'Calculating Exit...'}</p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge variant="destructive" className="bg-red-500 animate-pulse">LIVE SENSORS</Badge>
              {connected && <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">Network Connected</Badge>}
            </div>
          </div>

          {/* Virtual Heading Control HUD */}
          <div className="absolute top-24 left-4 w-48 p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 pointer-events-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/60 font-medium tracking-wider uppercase">Virtual Turning</span>
              <span className="text-[10px] text-blue-400 font-bold">{heading}°</span>
            </div>
            <input
              type="range"
              min="0" max="360"
              value={heading}
              onChange={(e) => onHeadingChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <p className="text-[8px] text-gray-400 mt-2 leading-tight">
              Drag to turn the camera virtually. Arrow reflects view rotation.
            </p>
          </div>

          {/* Mini-Map Overlay (Low Visibility Help) */}
          <Card className="absolute top-20 right-4 w-40 h-40 bg-black/40 backdrop-blur-md border-white/10 p-1 pointer-events-none overflow-hidden">
            <div className="absolute top-1 left-2 flex items-center gap-1">
              <MapIcon className="w-3 h-3 text-white/60" />
              <span className="text-[10px] text-white/60 font-medium">Digital Mapping</span>
            </div>
            <canvas ref={miniMapRef} width={150} height={100} className="w-full h-full mt-2" />
          </Card>

          {/* Gesture Confirmation Indicator */}
          {confirmProgress > 0 && confirmProgress < 1 && (
            <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-48 h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all duration-100 ${currentGesture === 'closed_fist' ? 'bg-red-500' : 'bg-blue-500'}`}
                style={{ width: `${confirmProgress * 100}%` }}
              />
            </div>
          )}

          {/* Bottom HUD */}
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-[10px] uppercase tracking-wider font-bold">Detected Pose</p>
                <div className="flex items-center gap-2 text-white">
                  <Hand className="w-4 h-4" />
                  <span className="font-medium">{currentGesture === 'none' ? 'Ready for Gesture' : currentGesture.replace('_', ' ')}</span>
                  {confidence > 0 && <span className="text-xs opacity-50">({Math.round(confidence * 100)}%)</span>}
                </div>
              </div>
              <Button onClick={stopCamera} variant="outline" className="text-white border-white/20 bg-white/5 backdrop-blur-sm pointer-events-auto">
                Stop System
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2 pointer-events-auto">
              <Button className="bg-red-600 hover:bg-red-700 text-xs h-8" onClick={triggerSOS}>
                Manual SOS
              </Button>
              <Button variant="outline" className="bg-white/10 text-white text-xs h-8" onClick={() => speak({ text: "Current path is safe. Follow the AR arrows forward." })}>
                <Volume2 className="w-3 h-3 mr-2" /> Voice Assist
              </Button>
            </div>
          </div>

          {/* Scanner Line Effect */}
          <motion.div
            animate={{ top: ['20%', '80%', '20%'] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute left-0 right-0 h-[1px] bg-blue-500/30 shadow-[0_0_15px_blue] pointer-events-none"
          />
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { GestureRecognizer, FilesetResolver, DrawingUtils } from '@mediapipe/tasks-vision';

export interface GestureResult {
  name: string;
  confidence: number;
}

export type GestureType = 'thumbs_up' | 'open_palm' | 'closed_fist' | 'pointing_up' | 'victory' | 'none';

const gestureCommands: Record<string, GestureType> = {
  'Thumb_Up': 'thumbs_up',
  'Open_Palm': 'open_palm',
  'Closed_Fist': 'closed_fist',
  'Pointing_Up': 'pointing_up',
  'Victory': 'victory',
};

const CONFIRM_FRAMES = 10; // 10 consecutive frames to confirm a gesture

export function useGestureRecognition() {
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const [confirmedGesture, setConfirmedGesture] = useState<GestureType>('none');
  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false); // MediaPipe loaded
  const [confidence, setConfidence] = useState(0);
  const [confirmProgress, setConfirmProgress] = useState(0);

  // Internal video ref (used when gesture control manages its own camera)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gestureBufferRef = useRef<GestureType[]>([]);
  const onGestureConfirmedRef = useRef<((gesture: GestureType) => void) | null>(null);

  const setOnGestureConfirmed = useCallback((callback: (gesture: GestureType) => void) => {
    onGestureConfirmedRef.current = callback;
  }, []);

  // Load MediaPipe model once on mount
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (mounted) {
          recognizerRef.current = gestureRecognizer;
          setIsReady(true);
          console.log('✅ MediaPipe Gesture Recognizer loaded successfully');
        }
      } catch (error) {
        console.error('❌ Failed to initialize gesture recognizer:', error);
      }
    }
    init();
    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // ─── Core gesture detection loop ───────────────────────────────────────────
  const runDetectionLoop = useCallback((video: HTMLVideoElement) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const canvas = canvasRef.current;

    const detect = () => {
      if (!recognizerRef.current || !video || video.readyState < 2) {
        if (video && video.readyState < 2) {
          console.warn('Waiting for video readyState...', video.readyState);
        }
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const results = recognizerRef.current.recognizeForVideo(video, performance.now());

        // Draw hand landmarks on canvas overlay
        if (canvas) {
          // Match canvas size to video display size
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (results.landmarks && results.landmarks.length > 0) {
              const drawingUtils = new DrawingUtils(ctx);
              for (const landmarks of results.landmarks) {
                drawingUtils.drawConnectors(
                  landmarks,
                  GestureRecognizer.HAND_CONNECTIONS,
                  { color: '#00FF00', lineWidth: 2 }
                );
                drawingUtils.drawLandmarks(landmarks, {
                  color: '#FF0000',
                  lineWidth: 1,
                  radius: 3,
                });
              }
            }
          }
        }

        // Gesture confirmation buffer
        if (results.gestures && results.gestures.length > 0) {
          const detected = results.gestures[0][0];
          const gestureName = gestureCommands[detected.categoryName] || 'none';

          if (detected.score > 0.7 && gestureName !== 'none') {
            setCurrentGesture(gestureName);
            setConfidence(detected.score);

            gestureBufferRef.current.push(gestureName);
            if (gestureBufferRef.current.length > CONFIRM_FRAMES) {
              gestureBufferRef.current.shift();
            }

            const sameCount = gestureBufferRef.current.filter((g) => g === gestureName).length;
            setConfirmProgress(sameCount / CONFIRM_FRAMES);

            const allSame =
              gestureBufferRef.current.length >= CONFIRM_FRAMES &&
              gestureBufferRef.current.every((g) => g === gestureName);

            if (allSame) {
              setConfirmedGesture(gestureName);
              gestureBufferRef.current = [];
              setConfirmProgress(0);
              onGestureConfirmedRef.current?.(gestureName);
            }
          } else {
            gestureBufferRef.current = [];
            setCurrentGesture('none');
            setConfidence(0);
            setConfirmProgress(0);
          }
        } else {
          gestureBufferRef.current = [];
          setCurrentGesture('none');
          setConfidence(0);
          setConfirmProgress(0);
        }
      } catch (_) {
        // Ignore per-frame errors
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
    setIsActive(true);
  }, []);

  // ─── Mode A: External video — attach gesture detection to existing stream ──
  // Call this when VisionNavigationView already has a camera running
  const startDetectionOn = useCallback(
    (videoEl: HTMLVideoElement) => {
      if (!recognizerRef.current) {
        // Model not ready yet — wait and retry
        const wait = setInterval(() => {
          if (recognizerRef.current) {
            clearInterval(wait);
            runDetectionLoop(videoEl);
          }
        }, 500);
        return;
      }
      runDetectionLoop(videoEl);
    },
    [runDetectionLoop]
  );

  // ─── Mode B: Internal camera — hook manages its own stream ─────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        runDetectionLoop(videoRef.current);
      }
    } catch (error) {
      console.error('Failed to start gesture camera:', error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsActive(false);
    setCurrentGesture('none');
    setConfirmedGesture('none');
    setConfirmProgress(0);
    gestureBufferRef.current = [];
  };

  const stopDetection = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setIsActive(false);
    setCurrentGesture('none');
    setConfirmProgress(0);
    gestureBufferRef.current = [];
  }, []);

  return {
    currentGesture,
    confirmedGesture,
    isActive,
    isReady,
    confidence,
    confirmProgress,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
    startDetectionOn,
    stopDetection,
    setOnGestureConfirmed,
  };
}

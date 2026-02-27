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

const CONFIRM_FRAMES = 8; // 8 consecutive frames to confirm a gesture

export function useGestureRecognition() {
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const [confirmedGesture, setConfirmedGesture] = useState<GestureType>('none');
  const [isActive, setIsActive] = useState(false);
  const [isReady, setIsReady] = useState(false); // MediaPipe loaded
  const [lastError, setLastError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [confirmProgress, setConfirmProgress] = useState(0);

  // Internal video ref (used when gesture control manages its own camera)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const gestureBufferRef = useRef<GestureType[]>([]);
  const onGestureConfirmedRef = useRef<((gesture: GestureType) => void) | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const setOnGestureConfirmed = useCallback((callback: (gesture: GestureType) => void) => {
    onGestureConfirmedRef.current = callback;
  }, []);

  // ─── Load MediaPipe model on mount ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    async function init() {
      // Secure context check
      if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost') {
        const msg = 'MediaPipe requires HTTPS or localhost. Current origin is not secure.';
        console.error('❌', msg);
        if (mounted) setLastError(msg);
        return;
      }

      console.log(`[MediaPipe] Init started. Secure Context: ${window.isSecureContext}, Host: ${window.location.hostname}`);

      if (typeof WebAssembly === 'undefined') {
        const msg = 'WebAssembly is not supported by this browser. MediaPipe cannot run.';
        console.error('❌', msg);
        if (mounted) setLastError(msg);
        return;
      }

      try {
        console.log('[MediaPipe] Loading WASM fileset from jsdelivr (0.10.32)...');
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm'
        );
        console.log('[MediaPipe] WASM fileset loaded ✅');

        let recognizer: GestureRecognizer | null = null;
        for (const delegate of ['GPU', 'CPU'] as const) {
          try {
            console.log(`[MediaPipe] Trying GestureRecognizer.createFromOptions (${delegate})...`);
            recognizer = await GestureRecognizer.createFromOptions(vision, {
              baseOptions: {
                modelAssetPath:
                  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                delegate,
              },
              runningMode: 'VIDEO',
              numHands: 1,
            });
            console.log(`[MediaPipe] ✅ Gesture Recognizer READY (${delegate})`);
            break;
          } catch (delegateErr) {
            console.warn(`[MediaPipe] ⚠️ ${delegate} delegate failed:`, delegateErr);
            if (delegate === 'CPU') throw delegateErr;
          }
        }

        if (mounted && recognizer) {
          recognizerRef.current = recognizer;
          setIsReady(true);
          setLastError(null);
        }
      } catch (error) {
        let msg = 'Failed to load MediaPipe model';
        if (error instanceof Error) {
          msg = error.message;
        } else if (typeof error === 'string') {
          msg = error;
        } else if (error && typeof error === 'object' && ('isTrusted' in error || 'type' in error)) {
          msg = 'Security/Network Error: MediaPipe was blocked or failed to fetch. check browser console (F12) for CSP violations.';
        } else {
          try {
            msg = JSON.stringify(error);
          } catch {
            msg = String(error);
          }
        }

        console.error('[MediaPipe] ❌ Init failed:', msg, error);
        if (mounted) setLastError(msg);
      }
    }

    // Diagnostic listener for CSP violations
    const handleCSPViolation = (e: any) => {
      console.error('[MediaPipe] 🛡️ CSP Violation detected:', e.blockedURI, e.violatedDirective);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('securitypolicyviolation', handleCSPViolation);
    }

    init();
    return () => {
      mounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('securitypolicyviolation', handleCSPViolation);
      }
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // ─── Core gesture detection loop ───────────────────────────────────────────
  const runDetectionLoop = useCallback((video: HTMLVideoElement) => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    const canvas = canvasRef.current;
    let frameCount = 0;
    let lastLogTime = 0;

    const detect = () => {
      // Wait for recognizer to be ready
      if (!recognizerRef.current) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      // Wait for video to have data
      if (!video || video.readyState < 2) {
        if (frameCount === 0) {
          console.log('[MediaPipe] Waiting for video data...');
        }
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const now = performance.now();
        const results = recognizerRef.current.recognizeForVideo(video, now);

        // Log periodically to prove detection is running
        frameCount++;
        if (now - lastLogTime > 5000) {
          console.log(`[MediaPipe] Detection running — ${frameCount} frames processed`);
          lastLogTime = now;
          frameCount = 0;
        }

        // Draw hand landmarks on canvas overlay
        if (canvas) {
          // Match canvas size to video display size
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          } else {
            canvas.width = 640;
            canvas.height = 480;
          }
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

          if (detected.score > 0.5 && gestureName !== 'none') {
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
              console.log(`[MediaPipe] 🎯 CONFIRMED GESTURE: ${gestureName}`);
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
      } catch (err) {
        // Log per-frame errors but don't crash the loop
        console.warn('[MediaPipe] Frame error:', err);
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    console.log('[MediaPipe] 🎬 Starting detection loop on video element');
    detect();
    setIsActive(true);
  }, []);

  // ─── Mode A: External video — attach gesture detection to existing stream ──
  // Call this when VisionNavigationView already has a camera running
  const startDetectionOn = useCallback(
    (videoEl: HTMLVideoElement) => {
      if (!recognizerRef.current) {
        console.log('[MediaPipe] Model not ready yet, waiting...');
        const wait = setInterval(() => {
          if (recognizerRef.current) {
            clearInterval(wait);
            console.log('[MediaPipe] Model ready, starting detection on external video');
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
  const startCamera = useCallback(async () => {
    try {
      console.log('[MediaPipe] 📷 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      streamRef.current = stream;
      console.log('[MediaPipe] 📷 Camera stream obtained ✅');

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          console.log('[MediaPipe] 📷 Video metadata loaded, size:', video.videoWidth, 'x', video.videoHeight);
          video.play().then(() => {
            console.log('[MediaPipe] 📷 Video playing, readyState:', video.readyState);

            // Wait for model to be ready before starting the detection loop
            if (!recognizerRef.current) {
              console.log('[MediaPipe] ⏳ Waiting for model to finish loading before detection...');
              const waitForModel = setInterval(() => {
                if (recognizerRef.current) {
                  clearInterval(waitForModel);
                  console.log('[MediaPipe] Model loaded! Starting detection loop.');
                  runDetectionLoop(video);
                }
              }, 300);
            } else {
              runDetectionLoop(video);
            }
          });
        };
      } else {
        console.error('[MediaPipe] ❌ videoRef.current is null — video element not mounted yet');
        setLastError('Video element not ready. Try toggling the camera off and on.');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Camera access denied';
      console.error('[MediaPipe] ❌ Camera start failed:', msg, error);
      setLastError('Camera: ' + msg);
    }
  }, [runDetectionLoop]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      // This cast is safe because we set srcObject to a MediaStream
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
    console.log('[MediaPipe] Camera stopped');
  }, []);

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
    lastError,
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

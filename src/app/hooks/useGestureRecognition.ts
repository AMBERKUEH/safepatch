import { useEffect, useRef, useState } from 'react';
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

export function useGestureRecognition() {
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const [isActive, setIsActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeGestureRecognizer() {
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
        }
      } catch (error) {
        console.error('Failed to initialize gesture recognizer:', error);
      }
    }

    initializeGestureRecognizer();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);
        detectGestures();
      }
    } catch (error) {
      console.error('Failed to start camera:', error);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setIsActive(false);
    setCurrentGesture('none');
  };

  const detectGestures = () => {
    if (!videoRef.current || !recognizerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const detect = async () => {
      if (!recognizerRef.current || !video || video.readyState < 2) {
        animationFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      try {
        const results = recognizerRef.current.recognizeForVideo(video, performance.now());

        // Draw hand landmarks if canvas is available
        if (canvas && results.landmarks && results.landmarks.length > 0) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const drawingUtils = new DrawingUtils(ctx);
            
            for (const landmarks of results.landmarks) {
              drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                { color: '#00FF00', lineWidth: 2 }
              );
              drawingUtils.drawLandmarks(landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
            }
          }
        }

        // Process gestures
        if (results.gestures && results.gestures.length > 0) {
          const detectedGesture = results.gestures[0][0];
          const gestureName = gestureCommands[detectedGesture.categoryName] || 'none';
          
          if (detectedGesture.score > 0.7) {
            setCurrentGesture(gestureName);
          } else {
            setCurrentGesture('none');
          }
        } else {
          setCurrentGesture('none');
        }
      } catch (error) {
        console.error('Gesture detection error:', error);
      }

      animationFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  return {
    currentGesture,
    isActive,
    videoRef,
    canvasRef,
    startCamera,
    stopCamera,
  };
}

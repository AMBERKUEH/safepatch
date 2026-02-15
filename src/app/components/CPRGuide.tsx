import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Phone, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Progress } from './ui/progress';

interface CPRGuideProps {
  onComplete: () => void;
  onCancel: () => void;
}

const cprSteps = [
  {
    title: 'Check Responsiveness',
    description: 'Tap the person and shout "Are you okay?"',
    duration: 5,
  },
  {
    title: 'Call Emergency Services',
    description: 'Call 911 or ask someone else to call',
    duration: 3,
  },
  {
    title: 'Position Hands',
    description: 'Place heel of hand on center of chest, other hand on top',
    duration: 5,
  },
  {
    title: 'Begin Compressions',
    description: 'Push hard and fast, 2 inches deep, 100-120 per minute',
    duration: 30,
  },
  {
    title: 'Continue CPR',
    description: 'Continue until help arrives or person responds',
    duration: 0,
  },
];

export function CPRGuide({ onComplete, onCancel }: CPRGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [timer, setTimer] = useState(0);
  const [compressionCount, setCompressionCount] = useState(0);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    const step = cprSteps[currentStep];
    if (step.duration > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev >= step.duration) {
            if (currentStep < cprSteps.length - 1) {
              setCurrentStep((c) => c + 1);
              return 0;
            }
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentStep]);

  // Metronome for compressions
  useEffect(() => {
    if (currentStep === 3 && isCompressing) {
      const bpm = 110; // 110 beats per minute
      const interval = setInterval(() => {
        setCompressionCount((prev) => prev + 1);
        // Play click sound (optional)
      }, (60 / bpm) * 1000);

      return () => clearInterval(interval);
    }
  }, [currentStep, isCompressing]);

  const handleCompression = () => {
    setCompressionCount((prev) => prev + 1);
  };

  const step = cprSteps[currentStep];
  const progress = step.duration > 0 ? (timer / step.duration) * 100 : 0;

  return (
    <Card className="p-6 bg-white max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-3 rounded-full">
              <Heart className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold">CPR Guide</h2>
              <p className="text-sm text-gray-600">Follow these steps carefully</p>
            </div>
          </div>
          <Button onClick={onCancel} variant="outline" size="sm">
            Exit
          </Button>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Step {currentStep + 1} of {cprSteps.length}
            </span>
            {step.duration > 0 && (
              <span className="text-gray-600">
                {timer}s / {step.duration}s
              </span>
            )}
          </div>
          <Progress value={((currentStep + 1) / cprSteps.length) * 100} className="h-2" />
        </div>

        {/* Current Step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-red-50 rounded-lg p-6"
          >
            <div className="flex items-start gap-4">
              <div className="bg-red-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                {currentStep + 1}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 mb-2">{step.title}</h3>
                <p className="text-red-800">{step.description}</p>

                {/* Compression counter */}
                {currentStep === 3 && (
                  <div className="mt-4 space-y-3">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <p className="text-3xl font-bold text-red-600">{compressionCount}</p>
                      <p className="text-sm text-gray-600">Compressions</p>
                    </div>
                    <Button
                      onClick={handleCompression}
                      onTouchStart={handleCompression}
                      className="w-full h-20 text-lg"
                      variant={isCompressing ? 'destructive' : 'default'}
                    >
                      <Heart className="w-6 h-6 mr-2" />
                      Press for Each Compression
                    </Button>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                      <AlertCircle className="w-4 h-4" />
                      <span>Push 2 inches deep, 100-120 per minute</span>
                    </div>
                  </div>
                )}

                {/* Timer progress for current step */}
                {step.duration > 0 && (
                  <div className="mt-4">
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Emergency Call Button */}
        <div className="flex gap-3">
          <Button
            onClick={() => window.open('tel:911')}
            variant="destructive"
            className="flex-1"
            size="lg"
          >
            <Phone className="w-5 h-5 mr-2" />
            Call 911
          </Button>
          {currentStep === cprSteps.length - 1 && (
            <Button onClick={onComplete} variant="default" className="flex-1" size="lg">
              <CheckCircle className="w-5 h-5 mr-2" />
              Complete
            </Button>
          )}
        </div>

        {/* Tips */}
        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Important Tips
          </h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Keep arms straight, use body weight for compressions</li>
            <li>• Allow chest to fully recoil between compressions</li>
            <li>• Minimize interruptions in chest compressions</li>
            <li>• Continue until professional help arrives</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

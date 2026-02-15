import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Phone, AlertTriangle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { useSocket } from '../../hooks/useSocket';

const cprSteps = [
  { title: 'Check Responsiveness', desc: 'Tap shoulders and shout', duration: 5 },
  { title: 'Call Emergency', desc: 'Dial 911 immediately', duration: 3 },
  { title: 'Position Hands', desc: 'Center of chest, hands locked', duration: 5 },
  { title: 'Begin Compressions', desc: 'Push hard and fast, 100-120/min', duration: 30 },
];

export function EmergencyPage() {
  const [showCPR, setShowCPR] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [compressionCount, setCompressionCount] = useState(0);
  const { sendSOS } = useSocket();

  const emergencyOptions = [
    {
      title: 'CPR Guide',
      description: 'Step-by-step CPR instructions',
      icon: '❤️',
      color: 'from-red-500 to-pink-500',
      action: () => setShowCPR(true),
    },
    {
      title: 'Call 911',
      description: 'Emergency services',
      icon: '📞',
      color: 'from-blue-500 to-cyan-500',
      action: () => window.open('tel:911'),
    },
    {
      title: 'Send SOS',
      description: 'Alert all responders',
      icon: '🚨',
      color: 'from-orange-500 to-red-500',
      action: () => {
        sendSOS();
        alert('SOS sent to all emergency responders!');
      },
    },
    {
      title: 'First Aid',
      description: 'Basic medical guidance',
      icon: '🩹',
      color: 'from-green-500 to-emerald-500',
      action: () => alert('First aid guide coming soon!'),
    },
  ];

  if (showCPR) {
    return (
      <div className="min-h-full bg-gradient-to-br from-red-50 to-pink-50">
        {/* CPR Header */}
        <div className="bg-gradient-to-r from-red-600 to-pink-600 px-6 py-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCPR(false)}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">CPR Guide</h1>
                <p className="text-red-100 text-sm">Follow carefully</p>
              </div>
            </div>
            <Button
              onClick={() => window.open('tel:911')}
              size="sm"
              className="bg-white text-red-600 hover:bg-red-50"
            >
              <Phone className="w-4 h-4 mr-1" />
              911
            </Button>
          </div>

          <Card className="p-3 bg-white/10 backdrop-blur-md border-white/20">
            <div className="flex items-center justify-between text-sm">
              <span>Step {currentStep + 1} of {cprSteps.length}</span>
              <span>{cprSteps[currentStep].title}</span>
            </div>
            <Progress value={((currentStep + 1) / cprSteps.length) * 100} className="mt-2 h-1.5" />
          </Card>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Step */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="p-6 bg-white border-2 border-red-200">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-pink-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {currentStep + 1}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {cprSteps[currentStep].title}
                    </h2>
                    <p className="text-gray-700">{cprSteps[currentStep].desc}</p>
                  </div>
                </div>

                {/* Compression Counter */}
                {currentStep === 3 && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-red-50 rounded-2xl p-6 text-center">
                      <p className="text-5xl font-bold text-red-600 mb-2">{compressionCount}</p>
                      <p className="text-sm text-red-900">Compressions</p>
                    </div>
                    <Button
                      onClick={() => setCompressionCount((c) => c + 1)}
                      className="w-full h-20 text-lg bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
                    >
                      <Heart className="w-6 h-6 mr-2" />
                      Press Each Compression
                    </Button>
                  </div>
                )}
              </Card>
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                onClick={() => setCurrentStep((s) => s - 1)}
                variant="outline"
                className="flex-1"
              >
                Previous
              </Button>
            )}
            {currentStep < cprSteps.length - 1 && (
              <Button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600"
              >
                Next Step
              </Button>
            )}
          </div>

          {/* Important Tips */}
          <Card className="p-5 bg-yellow-50 border-yellow-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-2">Important</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Push 2 inches deep on chest</li>
                  <li>• 100-120 compressions per minute</li>
                  <li>• Allow full chest recoil</li>
                  <li>• Continue until help arrives</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Emergency</h1>
            <p className="text-red-100 text-sm">Quick access to help</p>
          </div>
        </div>

        {/* Emergency Status */}
        <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm">System Active</span>
            </div>
            <span className="text-sm">Response Ready</span>
          </div>
        </Card>
      </div>

      <div className="p-6 space-y-6">
        {/* Emergency Alert */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-500 text-white p-5 rounded-2xl shadow-lg"
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <p className="font-bold">Emergency Mode Active</p>
              <p className="text-sm text-red-100">All features ready for immediate use</p>
            </div>
          </div>
        </motion.div>

        {/* Emergency Options */}
        <div>
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid gap-4">
            {emergencyOptions.map((option, index) => (
              <motion.div
                key={option.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  onClick={option.action}
                  className="p-5 hover:shadow-lg transition-all cursor-pointer active:scale-95"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${option.color} flex items-center justify-center text-4xl shadow-lg`}
                    >
                      {option.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{option.title}</h3>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Emergency Contacts */}
        <Card className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Emergency Contacts</h3>
          <div className="space-y-2">
            <button
              onClick={() => window.open('tel:911')}
              className="w-full p-3 bg-white rounded-xl flex items-center justify-between hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Emergency Services</p>
                  <p className="text-xs text-gray-600">911</p>
                </div>
              </div>
              <span className="text-blue-600 text-sm font-medium">Call</span>
            </button>
          </div>
        </Card>

        {/* Safety Tips */}
        <Card className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-2">Safety First</h3>
              <p className="text-sm text-green-800">
                Stay calm, assess the situation, and prioritize your safety. Help is always available.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

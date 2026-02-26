import React from 'react';
import { motion } from 'motion/react';
import { Shield, ArrowRight, Zap, Users, Activity } from 'lucide-react';
import { Card } from '../ui/card';

type Page = 'home' | 'navigation' | 'emergency' | 'dashboard' | 'mesh';

interface HomePageProps {
  onNavigate: (page: Page) => void;
  onOpenAssistant: () => void;
}

type FeatureAction = 'assistant';

interface Feature {
  title: string;
  description: string;
  icon: string;
  gradient: string;
  target?: Page;
  action?: FeatureAction;
}

export function HomePage({ onNavigate, onOpenAssistant }: HomePageProps) {

  const features: Feature[] = [
    {
      title: 'Smart Navigation',
      description: '2D + AR pathfinding with gesture SOS',
      icon: '🗺️',
      gradient: 'from-blue-500 to-cyan-500',
      target: 'navigation',
    },
    {
      title: 'Mesh Network',
      description: 'P2P emergency relay with nearby devices',
      icon: '📡',
      gradient: 'from-indigo-500 to-purple-500',
      target: 'mesh',
    },
    {
      title: 'AI Assistant',
      description: 'Calm guidance and emergency support',
      icon: '🤖',
      gradient: 'from-green-500 to-emerald-500',
      action: 'assistant',
    },
    {
      title: 'Emergency Aid',
      description: 'CPR instructions and medical guidance',
      icon: '❤️',
      gradient: 'from-red-500 to-orange-500',
      target: 'emergency',
    },
  ];

  const handleFeatureClick = (feature: Feature) => {
    if (feature.target) {
      onNavigate(feature.target);
    } else if (feature.action === 'assistant') {
      onOpenAssistant();
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      {/* Hero Section */}
      <div className="px-6 pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-white space-y-4"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold">SafePath AI</h1>
          <p className="text-blue-100 text-lg max-w-md mx-auto">
            Your intelligent companion for emergency evacuation
          </p>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-t-3xl px-6 pt-8 pb-32 min-h-[50vh]">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Features</h2>
          <span className="text-sm text-gray-500">Tap to explore</span>
        </div>

        <div className="grid gap-4">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
            >
              <Card
                onClick={() => handleFeatureClick(feature)}
                className="p-5 hover:shadow-lg transition-shadow cursor-pointer active:scale-95"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-3xl`}
                  >
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
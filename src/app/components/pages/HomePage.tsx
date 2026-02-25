import { motion } from 'motion/react';
import { Shield, ArrowRight, Zap, Users, Activity } from 'lucide-react';
import { Card } from '../ui/card';

type Props = {
  setCurrentPage: (page: 'home' | 'navigation' | 'gesture' | 'emergency' | 'dashboard' | 'ai') => void;
};

export function HomePage({ setCurrentPage }: Props) {
  // const navigate = useNavigate();
  const stats = [
    { label: 'Response Time', value: '< 2s', icon: Zap, color: 'text-yellow-500' },
    { label: 'Users Protected', value: '1.2K+', icon: Users, color: 'text-blue-500' },
    { label: 'Success Rate', value: '99.8%', icon: Activity, color: 'text-green-500' },
  ];

  const features = [
    {
      title: 'Smart Navigation',
      description: 'Real-time pathfinding to the nearest safe exit',
      icon: '🗺️',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Gesture Control',
      description: 'Hands-free control using AI hand tracking',
      icon: '👋',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: 'AI Assistant',
      description: 'Calm guidance and emergency support',
      icon: '🤖',
      gradient: 'from-green-500 to-emerald-500',
      page: 'ai',
    },
    {
      title: 'Emergency Aid',
      description: 'CPR instructions and medical guidance',
      icon: '❤️',
      gradient: 'from-red-500 to-orange-500',
    },
  ];

  const handleFeatureClick = (feature: any) => {
    if (feature.page) {
      setCurrentPage(feature.page);
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

      {/* Stats Cards */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20 text-center">
                <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-blue-100">{stat.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white rounded-t-3xl px-6 py-8 min-h-[50vh]">
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
                onClick={() => handleFeatureClick(feature)} // ⭐ CLICK HANDLER
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

        {/* Emergency Button */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <button className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-transform">
            🚨 Start Emergency Mode
          </button>
        </motion.div>
      </div>
    </div>
  );
}

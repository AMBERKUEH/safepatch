import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Phone, CheckCircle, ChevronRight } from 'lucide-react';
import { Card } from '../ui/card';
import { useSocket } from '../../hooks/useSocket';

import AIFirstAidModal from '../emergency/AIFirstAidModal';
import { SafeWalkPanel } from '../emergency/SafeWalkPanel';
import { SilentSOSOverlay } from '../emergency/SilentSOSOverlay';
import { FakeCallScreen } from '../emergency/FakeCallScreen';

type ActiveView = 'main' | 'firstaid' | 'safewalk' | 'silentsos' | 'fakecall';

// Urgency tiers determine visual weight + layout
const TIER_1 = [
  {
    id: 'sos',
    title: 'Send SOS',
    subtitle: 'Alert all responders instantly',
    icon: '🚨',
    urgency: 'critical', // red pulsing CTA
    action: 'sos',
  },
];

const TIER_2 = [
  {
    id: 'firstaid',
    title: 'AI First Aid',
    subtitle: 'Step-by-step guidance',
    icon: '🧠',
    urgency: 'high',
    action: 'firstaid' as ActiveView,
  },
  {
    id: 'silentsos',
    title: 'Silent SOS',
    subtitle: 'Discreet alert',
    icon: '🤫',
    urgency: 'high',
    action: 'silentsos' as ActiveView,
  },
];

const TIER_3 = [
  {
    id: 'safewalk',
    title: 'Safe Walk',
    subtitle: 'Live tracking',
    icon: '🛡️',
    urgency: 'medium',
    action: 'safewalk' as ActiveView,
  },
  {
    id: 'fakecall',
    title: 'Fake Call',
    subtitle: 'Escape a situation',
    icon: '📱',
    urgency: 'medium',
    action: 'fakecall' as ActiveView,
  },
];

export function EmergencyPage() {
  const [activeView, setActiveView] = useState<ActiveView>('main');
  const [sosTriggered, setSosTriggered] = useState(false);
  const { sendSOS } = useSocket();

  const handleSOS = () => {
    sendSOS();
    setSosTriggered(true);
    setTimeout(() => setSosTriggered(false), 4000);
  };

  const navigate = (action: string | ActiveView) => {
    if (action === 'sos') {
      handleSOS();
    } else {
      setActiveView(action as ActiveView);
    }
  };

  // ── Sub-views ──────────────────────────────────
  if (activeView === 'firstaid') return <AIFirstAidModal onClose={() => setActiveView('main')} />;
  if (activeView === 'safewalk') return <SafeWalkPanel onClose={() => setActiveView('main')} />;
  if (activeView === 'silentsos') return <SilentSOSOverlay onClose={() => setActiveView('main')} />;
  if (activeView === 'fakecall') return (
    <FakeCallScreen
      onClose={() => setActiveView('main')}
      onSecretSOS={() => sendSOS()}
    />
  );

  // ── Main View ──────────────────────────────────
  return (
    <div className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden">

      {/* ── Status Bar ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />
          <span className="text-xs font-medium text-gray-400 tracking-widest uppercase">System Active</span>
        </div>
        <div className="text-xs text-gray-500 font-mono">Response Ready</div>
      </div>

      {/* ── Hero Header ── */}
      <div className="px-5 pb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center flex-shrink-0 mt-1">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight leading-none">Emergency</h1>
            <p className="text-gray-400 text-sm mt-1">Tap the right action immediately</p>
          </div>
        </div>
      </div>

      <div className="px-5 pb-10 space-y-4">

        {/* ── TIER 1: Critical — SOS (full-width dominant button) ── */}
        <AnimatePresence mode="wait">
          {sosTriggered ? (
            <motion.div
              key="sos-sent"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full rounded-3xl bg-green-500 p-5 flex items-center gap-4 shadow-[0_0_40px_rgba(34,197,94,0.4)]"
            >
              <CheckCircle className="w-8 h-8 text-white flex-shrink-0" />
              <div>
                <p className="font-black text-lg">SOS Sent!</p>
                <p className="text-green-100 text-sm">Responders have been alerted</p>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="sos-btn"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSOS}
              className="w-full rounded-3xl bg-red-500 p-5 flex items-center justify-between
                         shadow-lg active:shadow-[0_0_20px_rgba(239,68,68,0.3)]
                         transition-shadow duration-150"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              }}
            >
              <div className="flex items-center gap-4">
                {/* Pulsing ring */}
                <div className="relative flex-shrink-0">
                  <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
                  <div className="relative w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl">
                    🚨
                  </div>
                </div>
                <div className="text-left">
                  <p className="font-black text-xl text-red-100 leading-none">Send SOS</p>
                  <p className="text-red-100 text-sm mt-1">Alert all emergency responders</p>
                </div>
              </div>
              <ChevronRight className="w-6 h-6 text-red-200 flex-shrink-0" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── TIER 2: High urgency — 2 equal cards ── */}
        <div className="grid grid-cols-2 gap-3">
          {TIER_2.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.05 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(item.action)}
              className="rounded-2xl bg-white border border-gray-200 p-4 text-left
                         hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150
                         active:bg-[#1f1f1f]"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <p className="font-bold text-sm leading-tight">{item.title}</p>
              <p className="text-gray-600 text-xs mt-1">{item.subtitle}</p>
            </motion.button>
          ))}
        </div>

        {/* ── Divider with label ── */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-500 tracking-widest uppercase font-medium">Also available</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* ── TIER 3: Medium urgency — compact row cards ── */}
        <div className="space-y-2">
          {TIER_3.map((item, i) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(item.action)}
              className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-3.5
                         flex items-center gap-4 text-left
                         hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150"
            >
              <span className="text-2xl flex-shrink-0">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-gray-500 text-xs">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </motion.button>
          ))}
        </div>

        {/* ── Emergency Call — always visible, bottom-anchored feel ── */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => window.open('tel:911')}
          className="w-full rounded-2xl border border-blue-200 bg-blue-50
                     px-4 py-4 flex items-center gap-4 text-left
                     hover:bg-blue-100 transition-colors duration-150 active:bg-blue-500/20"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-blue-900">Call 911</p>
            <p className="text-blue-600 text-xs">Emergency Services</p>
          </div>
          <span className="text-blue-400 text-sm font-semibold">Call</span>
        </motion.button>

        {/* ── Safety reminder — lowest priority, subtle ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-start gap-3 px-1 pt-1"
        >
          <CheckCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            Stay calm, assess the situation, and prioritize your safety. Help is always available.
          </p>
        </motion.div>

      </div>
    </div>
  );
}
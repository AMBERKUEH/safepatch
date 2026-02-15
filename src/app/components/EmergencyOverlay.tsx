import { motion } from 'motion/react';
import { AlertTriangle, Phone } from 'lucide-react';
import { Button } from './ui/button';

interface EmergencyOverlayProps {
  onDismiss: () => void;
  onCall911?: () => void;
}

export function EmergencyOverlay({ onDismiss, onCall911 }: EmergencyOverlayProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-6"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center"
      >
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">SOS sent</h2>
        <p className="text-gray-600 text-sm mb-6">
          Help is on the way. Responders have been alerted to your location.
        </p>
        <div className="space-y-3">
          {onCall911 && (
            <Button
              onClick={onCall911}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <Phone className="w-4 h-4 mr-2" />
              Call 911
            </Button>
          )}
          <Button onClick={onDismiss} variant="outline" className="w-full">
            Dismiss
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

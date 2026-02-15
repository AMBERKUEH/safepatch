import { motion } from 'motion/react';
import { Map, Camera } from 'lucide-react';

export type NavigationMode = 'MAPPED' | 'VISION';

interface ModeIndicatorProps {
  mode: NavigationMode;
  onToggle?: () => void;
}

export function ModeIndicator({ mode, onToggle }: ModeIndicatorProps) {
  const isMapped = mode === 'MAPPED';

  return (
    <motion.div
      key={mode}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
        isMapped ? 'bg-green-100 border border-green-300' : 'bg-blue-100 border border-blue-300'
      }`}
    >
      <div className="flex items-center gap-3">
        {isMapped ? (
          <Map className="w-5 h-5 text-green-700" />
        ) : (
          <Camera className="w-5 h-5 text-blue-700" />
        )}
        <div>
          <p className={`text-sm font-medium ${isMapped ? 'text-green-900' : 'text-blue-900'}`}>
            {isMapped
              ? '✅ Building recognized – optimal routing'
              : '🔍 Vision AI mode – point camera at exit signs'}
          </p>
          <p className={`text-xs ${isMapped ? 'text-green-700' : 'text-blue-700'}`}>
            {isMapped ? 'Using floor plan & pathfinding' : 'Exit sign detection active'}
          </p>
        </div>
      </div>
      {onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
            isMapped
              ? 'bg-green-200 text-green-800 hover:bg-green-300'
              : 'bg-blue-200 text-blue-800 hover:bg-blue-300'
          }`}
        >
          Switch to {isMapped ? 'Vision' : 'Map'}
        </button>
      )}
    </motion.div>
  );
}

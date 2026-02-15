import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Navigation as NavIcon, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { FloorPlan } from '../FloorPlan';
import { ModeIndicator } from '../ModeIndicator';
import { VisionNavigationView } from '../VisionNavigationView';
import { findPath, smoothPath, Point, Obstacle } from '../../utils/pathfinding';
import { useSocket } from '../../hooks/useSocket';
import type { NavigationMode } from '../ModeIndicator';

const BUILDING_WIDTH = 600;
const BUILDING_HEIGHT = 400;
const EXIT_POSITION: Point = { x: 550, y: 50 };

const OBSTACLES: Obstacle[] = [
  { x: 0, y: 0, width: 10, height: 400, type: 'wall' },
  { x: 0, y: 0, width: 600, height: 10, type: 'wall' },
  { x: 590, y: 0, width: 10, height: 400, type: 'wall' },
  { x: 0, y: 390, width: 600, height: 10, type: 'wall' },
  { x: 200, y: 100, width: 150, height: 10, type: 'wall' },
  { x: 200, y: 100, width: 10, height: 100, type: 'wall' },
  { x: 340, y: 100, width: 10, height: 100, type: 'wall' },
  { x: 400, y: 200, width: 10, height: 150, type: 'wall' },
  { x: 150, y: 250, width: 120, height: 10, type: 'wall' },
  { x: 250, y: 150, width: 80, height: 80, type: 'fire' },
];

export function NavigationPage() {
  const [navMode, setNavMode] = useState<NavigationMode>('MAPPED');
  const [userPosition, setUserPosition] = useState<Point>({ x: 100, y: 350 });
  const [path, setPath] = useState<Point[]>([]);
  const [distance, setDistance] = useState(0);
  const { sendPosition } = useSocket();

  useEffect(() => {
    sendPosition(userPosition);
  }, [userPosition, sendPosition]);

  useEffect(() => {
    const newPath = findPath(
      userPosition,
      EXIT_POSITION,
      BUILDING_WIDTH,
      BUILDING_HEIGHT,
      OBSTACLES,
      10
    );
    const smoothedPath = smoothPath(newPath);
    setPath(smoothedPath);

    // Calculate distance
    let totalDistance = 0;
    for (let i = 0; i < smoothedPath.length - 1; i++) {
      const dx = smoothedPath[i + 1].x - smoothedPath[i].x;
      const dy = smoothedPath[i + 1].y - smoothedPath[i].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    setDistance(totalDistance / 10);
  }, [userPosition]);

  const getDirection = () => {
    if (path.length < 2) return 'Calculating...';
    const next = path[1];
    const dx = next.x - userPosition.x;
    const dy = next.y - userPosition.y;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'Turn Right →' : 'Turn Left ←';
    } else {
      return dy > 0 ? 'Go Down ↓' : 'Go Up ↑';
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <NavIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Smart Navigation</h1>
            <p className="text-blue-100 text-sm">Real-time safe path</p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20">
            <p className="text-blue-100 text-xs mb-1">Distance</p>
            <p className="text-2xl font-bold">{distance.toFixed(1)}m</p>
          </Card>
          <Card className="p-4 bg-white/10 backdrop-blur-md border-white/20">
            <p className="text-blue-100 text-xs mb-1">Direction</p>
            <p className="text-lg font-bold truncate">{getDirection()}</p>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Mode indicator: Mapped vs Vision */}
        <ModeIndicator mode={navMode} onToggle={() => setNavMode((m) => (m === 'MAPPED' ? 'VISION' : 'MAPPED'))} />

        {/* Vision mode: camera + exit sign overlay */}
        <AnimatePresence mode="wait">
          {navMode === 'VISION' ? (
            <motion.div
              key="vision"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <VisionNavigationView />
            </motion.div>
          ) : (
            <motion.div
              key="mapped"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Alert */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500 text-white p-4 rounded-2xl shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-sm">Fire Detected</p>
                    <p className="text-xs text-red-100">Follow the blue path to safety</p>
                  </div>
                </div>
              </motion.div>

              {/* Map */}
              <Card className="p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Floor Plan</h2>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Live
                  </Badge>
                </div>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <FloorPlan
                    userPosition={userPosition}
                    exitPosition={EXIT_POSITION}
                    path={path}
                    obstacles={OBSTACLES}
                    onUserMove={setUserPosition}
                    width={BUILDING_WIDTH}
                    height={BUILDING_HEIGHT}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  💡 Tap anywhere to update your position
                </p>
              </Card>

              {/* Instructions */}
              <Card className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Next Step</h3>
                    <p className="text-sm text-blue-800">{getDirection()}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      Continue for {path.length > 1 ? '15' : '0'} meters
                    </p>
                  </div>
                </div>
              </Card>

              {/* Hazards */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Active Hazards</h3>
                <div className="space-y-2">
                  <Card className="p-4 bg-red-50 border-red-200">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🔥</span>
                      <div className="flex-1">
                        <p className="font-medium text-red-900">Fire Zone</p>
                        <p className="text-xs text-red-700">Location: Section B</p>
                      </div>
                      <Badge variant="destructive">Active</Badge>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

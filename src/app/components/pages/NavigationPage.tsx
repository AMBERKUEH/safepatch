import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigation as NavIcon, AlertTriangle, CheckCircle, Flame, Shield, Clock } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { FloorPlan } from '../FloorPlan';
import { ModeIndicator } from '../ModeIndicator';
import { VisionNavigationView } from '../VisionNavigationView';
import { findGraphPath, findNearestNode } from '../../utils/pathfinding';
import type { GraphPathResult } from '../../utils/pathfinding';
import { useSocket } from '../../hooks/useSocket';
import type { NavigationMode } from '../ModeIndicator';
import {
  DEFAULT_NODES,
  DEFAULT_EDGES,
  DEFAULT_HAZARDS,
  WALL_SEGMENTS,
} from '../../data/floorPlanGraph';
import type { FloorNode, HazardZone } from '../../data/floorPlanGraph';

const BUILDING_WIDTH = 600;
const BUILDING_HEIGHT = 400;
const EXIT_IDS = ['exit1', 'exit2'];
const RECOMPUTE_INTERVAL = 4000; // ms

export function NavigationPage() {
  const [navMode, setNavMode] = useState<NavigationMode>('MAPPED');
  const [userNodeId, setUserNodeId] = useState('start');
  const [hazards, setHazards] = useState<HazardZone[]>(DEFAULT_HAZARDS);
  const [routeResult, setRouteResult] = useState<GraphPathResult | null>(null);
  const { sendPosition, sendHazard, hazards: socketHazards } = useSocket();
  const lastRouteRef = useRef<string | null>(null);

  // Compute route
  const computeRoute = useCallback(() => {
    const result = findGraphPath(
      userNodeId,
      EXIT_IDS,
      DEFAULT_NODES,
      DEFAULT_EDGES,
      hazards
    );
    if (result) {
      const routeKey = result.path.map((n) => n.nodeId).join(',');
      // Only update if route changed significantly
      if (routeKey !== lastRouteRef.current) {
        lastRouteRef.current = routeKey;
        setRouteResult(result);
      }
    }
  }, [userNodeId, hazards]);

  // Recompute when user moves or hazards change
  useEffect(() => {
    computeRoute();
  }, [computeRoute]);

  // Periodic recompute (heartbeat)
  useEffect(() => {
    const interval = setInterval(computeRoute, RECOMPUTE_INTERVAL);
    return () => clearInterval(interval);
  }, [computeRoute]);

  // Sync socket hazards
  useEffect(() => {
    if (socketHazards && socketHazards.length > 0) {
      // Merge socket-received hazards with local hazards
      setHazards((prev) => {
        const merged = [...prev];
        // Add new socket hazards that aren't already present
        for (const sh of socketHazards) {
          const existing = merged.find(
            (h) => h.affectedNodes?.some((n) => (sh as unknown as FloorNode).nodeId === n)
          );
          if (!existing) {
            merged.push({
              hazardId: `socket-${Date.now()}-${Math.random()}`,
              type: (sh.type as HazardZone['type']) || 'fire',
              severity: 0.6,
              affectedNodes: [],
              propagationRate: 0.05,
              timestamp: Date.now(),
            });
          }
        }
        return merged;
      });
    }
  }, [socketHazards]);

  // Handle user moving to a different node
  const handleNodeClick = (nodeId: string) => {
    setUserNodeId(nodeId);
    const node = DEFAULT_NODES.find((n) => n.nodeId === nodeId);
    if (node) {
      sendPosition({ x: node.x, y: node.y });
    }
  };

  // Handle adding a fire hazard via right-click
  const handleAddHazard = (nodeId: string) => {
    const node = DEFAULT_NODES.find((n) => n.nodeId === nodeId);
    if (!node) return;

    const newHazard: HazardZone = {
      hazardId: `user-${Date.now()}`,
      type: 'fire',
      severity: 0.6,
      affectedNodes: [nodeId],
      propagationRate: 0.05,
      timestamp: Date.now(),
    };

    setHazards((prev) => [...prev, newHazard]);
    sendHazard({ x: node.x, y: node.y, type: 'fire' });
  };

  // Simulate hazard propagation (fire spreading)
  useEffect(() => {
    const interval = setInterval(() => {
      setHazards((prev) =>
        prev.map((h) => {
          // Slowly increase severity
          const newSeverity = Math.min(1, h.severity + h.propagationRate * 0.5);

          // Spread to adjacent nodes
          const newAffected = [...h.affectedNodes];
          for (const nId of h.affectedNodes) {
            const node = DEFAULT_NODES.find((n) => n.nodeId === nId);
            if (!node) continue;
            // Find neighbors within 120px
            for (const other of DEFAULT_NODES) {
              if (newAffected.includes(other.nodeId)) continue;
              const dist = Math.sqrt((other.x - node.x) ** 2 + (other.y - node.y) ** 2);
              if (dist < 120 && Math.random() < h.propagationRate) {
                newAffected.push(other.nodeId);
              }
            }
          }

          return { ...h, severity: newSeverity, affectedNodes: newAffected };
        })
      );
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const pathNodes = routeResult?.path || [];
  const distance = routeResult
    ? routeResult.path.reduce((sum, n, i) => {
      if (i === 0) return 0;
      const prev = routeResult.path[i - 1];
      return sum + Math.sqrt((n.x - prev.x) ** 2 + (n.y - prev.y) ** 2) / 10;
    }, 0)
    : 0;

  const getDirection = () => {
    if (!routeResult || routeResult.turns.length === 0) {
      if (pathNodes.length >= 2) {
        const next = pathNodes[1];
        const curr = DEFAULT_NODES.find((n) => n.nodeId === userNodeId);
        if (curr) {
          const dx = next.x - curr.x;
          const dy = next.y - curr.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'Go Right →' : 'Go Left ←';
          }
          return dy > 0 ? 'Go Down ↓' : 'Go Up ↑';
        }
      }
      return 'Head to exit';
    }
    const turn = routeResult.turns[0];
    const dirMap = { LEFT: '← Turn Left', RIGHT: 'Turn Right →', UP: 'Go Up ↑', DOWN: 'Go Down ↓', STRAIGHT: 'Straight →' };
    return `${dirMap[turn.direction]} in ${turn.distanceToNext}m`;
  };

  const exitLabel = routeResult
    ? DEFAULT_NODES.find((n) => n.nodeId === routeResult.exitUsed)?.label || 'Exit'
    : 'Calculating...';

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
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-white/10 backdrop-blur-md border-white/20">
            <p className="text-blue-100 text-xs mb-1">Distance</p>
            <p className="text-xl font-bold">{distance.toFixed(1)}m</p>
          </Card>
          <Card className="p-3 bg-white/10 backdrop-blur-md border-white/20">
            <p className="text-blue-100 text-xs mb-1">Direction</p>
            <p className="text-sm font-bold truncate">{getDirection()}</p>
          </Card>
          <Card className="p-3 bg-white/10 backdrop-blur-md border-white/20">
            <p className="text-blue-100 text-xs mb-1">Target</p>
            <p className="text-sm font-bold truncate">{exitLabel}</p>
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
              <VisionNavigationView
                pathNodes={pathNodes}
                turns={routeResult?.turns || []}
                distance={distance}
                exitLabel={exitLabel}
                safetyScore={routeResult?.safetyScore ?? 0}
              />
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
              {/* Safety Score */}
              {routeResult && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl shadow-lg ${routeResult.safetyScore > 0.3
                    ? 'bg-red-500 text-white'
                    : 'bg-green-500 text-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    {routeResult.safetyScore > 0.3 ? (
                      <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    ) : (
                      <Shield className="w-5 h-5 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">
                        {routeResult.safetyScore > 0.3 ? '⚠️ Hazards Near Route' : '✅ Safe Route Found'}
                      </p>
                      <p className="text-xs opacity-90">
                        Safety: {Math.round((1 - routeResult.safetyScore) * 100)}% · via {exitLabel}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Map */}
              <Card className="p-4 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-900">Floor Plan</h2>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      Live
                    </Badge>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      <Clock className="w-3 h-3 mr-1" />
                      {RECOMPUTE_INTERVAL / 1000}s
                    </Badge>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl overflow-hidden">
                  <FloorPlan
                    nodes={DEFAULT_NODES}
                    edges={DEFAULT_EDGES}
                    hazards={hazards}
                    walls={WALL_SEGMENTS}
                    pathNodes={pathNodes}
                    userNodeId={userNodeId}
                    exitNodeIds={EXIT_IDS}
                    onNodeClick={handleNodeClick}
                    onAddHazard={handleAddHazard}
                    width={BUILDING_WIDTH}
                    height={BUILDING_HEIGHT}
                  />
                </div>
              </Card>

              {/* Turn-by-turn instructions */}
              <Card className="p-5 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">Next Step</h3>
                    <p className="text-sm text-blue-800">{getDirection()}</p>
                    <p className="text-xs text-blue-600 mt-2">
                      {pathNodes.length > 1
                        ? `${pathNodes.length - 1} waypoints to ${exitLabel}`
                        : 'You are at the exit!'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Active Hazards List */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Active Hazards ({hazards.length})</h3>
                <div className="space-y-2">
                  {hazards.map((h) => (
                    <Card key={h.hazardId} className="p-4 bg-red-50 border-red-200">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {h.type === 'fire' ? '🔥' : h.type === 'smoke' ? '💨' : '⛔'}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium text-red-900 capitalize">{h.type} Zone</p>
                          <p className="text-xs text-red-700">
                            Severity: {Math.round(h.severity * 100)}% · {h.affectedNodes.length} node(s)
                          </p>
                        </div>
                        <Badge variant="destructive">Active</Badge>
                      </div>
                    </Card>
                  ))}
                  <button
                    onClick={() => {
                      const randomNode = DEFAULT_NODES.filter(
                        (n) => n.type === 'junction' && !hazards.some((h) => h.affectedNodes.includes(n.nodeId))
                      );
                      if (randomNode.length > 0) {
                        const node = randomNode[Math.floor(Math.random() * randomNode.length)];
                        handleAddHazard(node.nodeId);
                      }
                    }}
                    className="w-full p-3 border-2 border-dashed border-red-300 rounded-xl text-red-600 text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Flame className="w-4 h-4" />
                    Simulate New Hazard
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

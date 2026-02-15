import { motion } from 'motion/react';
import { Users, MapPin, Flame, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Point, Obstacle } from '../utils/pathfinding';

interface User {
  id: string;
  name: string;
  position: Point;
  status: 'safe' | 'evacuating' | 'sos' | 'offline';
  distanceToExit: number;
}

interface ResponderDashboardProps {
  users: User[];
  hazards: Obstacle[];
  buildingArea: { width: number; height: number };
}

export function ResponderDashboard({ users, hazards, buildingArea }: ResponderDashboardProps) {
  const safeCount = users.filter((u) => u.status === 'safe').length;
  const evacuatingCount = users.filter((u) => u.status === 'evacuating').length;
  const sosCount = users.filter((u) => u.status === 'sos').length;
  const offlineCount = users.filter((u) => u.status === 'offline').length;

  const criticalHazards = hazards.filter((h) => h.type === 'fire' || h.type === 'smoke').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Responder Dashboard</h1>
        <p className="text-gray-600">Real-time emergency monitoring and coordination</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
            <Users className="w-8 h-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Evacuating</p>
              <p className="text-2xl font-bold text-yellow-600">{evacuatingCount}</p>
            </div>
            <Activity className="w-8 h-8 text-yellow-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">SOS Signals</p>
              <p className="text-2xl font-bold text-red-600">{sosCount}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Safe</p>
              <p className="text-2xl font-bold text-green-600">{safeCount}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* User List */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5" />
            <h2 className="text-lg font-bold">Active Users</h2>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {users.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        user.status === 'safe'
                          ? 'bg-green-500'
                          : user.status === 'evacuating'
                          ? 'bg-yellow-500 animate-pulse'
                          : user.status === 'sos'
                          ? 'bg-red-500 animate-pulse'
                          : 'bg-gray-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-600">
                        {user.distanceToExit.toFixed(0)}m to exit
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      user.status === 'safe'
                        ? 'default'
                        : user.status === 'sos'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {user.status.toUpperCase()}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Hazard List */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-bold">Active Hazards</h2>
            <Badge variant="destructive">{criticalHazards}</Badge>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {hazards.map((hazard, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-3 rounded-lg ${
                    hazard.type === 'fire'
                      ? 'bg-red-50 border border-red-200'
                      : hazard.type === 'smoke'
                      ? 'bg-gray-100 border border-gray-300'
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {hazard.type === 'fire' ? (
                        <Flame className="w-4 h-4 text-red-600" />
                      ) : hazard.type === 'smoke' ? (
                        <Activity className="w-4 h-4 text-gray-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      )}
                      <span className="font-medium capitalize">{hazard.type}</span>
                    </div>
                    <Badge
                      variant={
                        hazard.type === 'fire' ? 'destructive' : 'secondary'
                      }
                    >
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>
                      Location: ({hazard.x.toFixed(0)}, {hazard.y.toFixed(0)})
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Area: {hazard.width} × {hazard.height}
                  </div>
                </motion.div>
              ))}
              {hazards.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active hazards detected</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      {/* Building Overview */}
      <Card className="p-6">
        <h2 className="text-lg font-bold mb-4">Building Status</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900 mb-1">Building Area</p>
            <p className="text-xl font-bold text-blue-900">
              {buildingArea.width} × {buildingArea.height}
            </p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-900 mb-1">Evacuation Progress</p>
            <p className="text-xl font-bold text-yellow-900">
              {users.length > 0
                ? Math.round((safeCount / users.length) * 100)
                : 0}
              %
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-green-900 mb-1">Response Time</p>
            <p className="text-xl font-bold text-green-900">2:34</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

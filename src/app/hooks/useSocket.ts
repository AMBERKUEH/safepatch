import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Point, Obstacle } from '../utils/pathfinding';

export interface Occupant {
  id: string;
  name: string;
  position: Point;
  status: 'safe' | 'evacuating' | 'sos' | 'offline';
  distanceToExit: number;
  lastSeen?: number;
}

export interface HazardAlert {
  hazardId: string;
  type: string;
  severity: number;
  affectedNodes: string[];
  position?: { x: number; y: number };
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [occupants, setOccupants] = useState<Occupant[]>([]);
  const [hazards, setHazards] = useState<Obstacle[]>([]);
  const [hazardAlerts, setHazardAlerts] = useState<HazardAlert[]>([]);
  const [buildingArea, setBuildingArea] = useState({ width: 600, height: 400 });

  useEffect(() => {
    const url = SOCKET_URL || (window.location.port === '5173' ? 'http://localhost:3001' : window.location.origin);
    const s = io(url, { path: '/socket.io', transports: ['websocket', 'polling'] });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    s.on('init', (data: { occupants: Occupant[]; hazards: Obstacle[]; buildingArea: { width: number; height: number } }) => {
      setOccupants(data.occupants || []);
      setHazards(data.hazards || []);
      if (data.buildingArea) setBuildingArea(data.buildingArea);
    });
    s.on('occupants', (list: Occupant[]) => setOccupants(list || []));
    s.on('hazards', (list: Obstacle[]) => setHazards(list || []));
    s.on('hazard_alert', (alert: HazardAlert) => {
      setHazardAlerts((prev) => [...prev, alert]);
    });

    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.close();
    };
  }, []);

  const sendPosition = useCallback(
    (position: Point) => {
      socket?.emit('position', position);
    },
    [socket]
  );

  const sendSOS = useCallback(() => {
    socket?.emit('sos');
  }, [socket]);

  const sendSafe = useCallback(() => {
    socket?.emit('safe');
  }, [socket]);

  const sendHazard = useCallback(
    (hazard: { x: number; y: number; width?: number; height?: number; type?: Obstacle['type'] }) => {
      socket?.emit('hazard', hazard);
    },
    [socket]
  );

  return {
    connected,
    socket,
    occupants,
    hazards,
    hazardAlerts,
    buildingArea,
    sendPosition,
    sendSOS,
    sendSafe,
    sendHazard,
  };
}

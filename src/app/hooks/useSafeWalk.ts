// ──────────────────────────────────────────────────
// useSafeWalk — GPS tracking + session management
// ──────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Socket } from 'socket.io-client';

export interface SafeWalkSession {
    id: string;
    status: 'idle' | 'active' | 'alert';
    contacts: string[];
    duration: number;        // minutes
    startTime: number;
    timeRemaining: number;   // seconds
    lastLat: number;
    lastLng: number;
}

const LOCATION_INTERVAL = 5000;      // emit every 5s
const NO_MOVE_THRESHOLD = 60_000;    // 60s no movement → alert
const MIN_MOVE_DISTANCE = 5;         // meters

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useSafeWalk(socket: Socket | null) {
    const [session, setSession] = useState<SafeWalkSession>({
        id: '', status: 'idle', contacts: [], duration: 30, startTime: 0, timeRemaining: 0, lastLat: 0, lastLng: 0,
    });

    const watchIdRef = useRef<number | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastMoveTimeRef = useRef<number>(Date.now());
    const prevPosRef = useRef<{ lat: number; lng: number } | null>(null);

    // ─── Start session ─────────────────────────────
    const startSession = useCallback((contacts: string[], durationMinutes: number) => {
        const id = `sw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const startTime = Date.now();
        setSession({
            id, status: 'active', contacts, duration: durationMinutes,
            startTime, timeRemaining: durationMinutes * 60, lastLat: 0, lastLng: 0,
        });
        lastMoveTimeRef.current = startTime;
        prevPosRef.current = null;

        // Notify backend
        try {
            fetch('/api/safewalk/start', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, contacts, duration: durationMinutes, startTime }),
            }).catch(() => { });
        } catch { }

        // Start GPS watch
        if ('geolocation' in navigator) {
            watchIdRef.current = navigator.geolocation.watchPosition(
                (pos) => {
                    const { latitude: lat, longitude: lng } = pos.coords;
                    setSession(prev => ({ ...prev, lastLat: lat, lastLng: lng }));

                    // Movement detection
                    if (prevPosRef.current) {
                        const dist = haversineDistance(prevPosRef.current.lat, prevPosRef.current.lng, lat, lng);
                        if (dist > MIN_MOVE_DISTANCE) {
                            lastMoveTimeRef.current = Date.now();
                        }
                    }
                    prevPosRef.current = { lat, lng };

                    // Emit location via socket
                    socket?.emit('safewalk:location', { sessionId: id, lat, lng, timestamp: Date.now() });
                },
                (err) => console.warn('[SafeWalk] GPS error:', err.message),
                { enableHighAccuracy: true, maximumAge: 3000 }
            );
        }

        // Start countdown + movement check timer
        timerRef.current = setInterval(() => {
            setSession(prev => {
                const elapsed = Math.floor((Date.now() - prev.startTime) / 1000);
                const remaining = Math.max(0, prev.duration * 60 - elapsed);

                // Check no-movement
                const timeSinceMove = Date.now() - lastMoveTimeRef.current;
                if (timeSinceMove > NO_MOVE_THRESHOLD && prev.status === 'active') {
                    // Trigger alert
                    socket?.emit('safewalk:alert', { sessionId: prev.id, lat: prev.lastLat, lng: prev.lastLng, reason: 'no_movement' });
                    try {
                        fetch('/api/safewalk/alert', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ sessionId: prev.id, lat: prev.lastLat, lng: prev.lastLng, reason: 'no_movement' }),
                        }).catch(() => { });
                    } catch { }
                    return { ...prev, timeRemaining: remaining, status: 'alert' };
                }

                // Auto-stop when time runs out
                if (remaining <= 0 && prev.status === 'active') {
                    return { ...prev, timeRemaining: 0, status: 'idle' };
                }

                return { ...prev, timeRemaining: remaining };
            });
        }, 1000);
    }, [socket]);

    // ─── Stop session ──────────────────────────────
    const stopSession = useCallback(() => {
        if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        const sessionId = session.id;
        setSession(prev => ({ ...prev, status: 'idle', timeRemaining: 0 }));

        try {
            fetch('/api/safewalk/stop', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId }),
            }).catch(() => { });
        } catch { }
    }, [session.id]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return { session, startSession, stopSession };
}

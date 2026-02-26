// ──────────────────────────────────────────────────
// useMeshEngine — React hook for Offline Mesh Engine
// Auto-activates with socket, or falls back to Demo mode.
// ──────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { MeshMessage } from '../model/MeshMessage';
import { OfflineMeshEngine } from '../engine/OfflineMeshEngine';
import { DemoMeshEngine } from '../engine/DemoMeshEngine';

type AnyEngine = OfflineMeshEngine | DemoMeshEngine;

const SOCKET_TIMEOUT_MS = 3000;

export function useMeshEngine(socket: Socket | null) {
    const [peerCount, setPeerCount] = useState(0);
    const [lastSOS, setLastSOS] = useState<MeshMessage | null>(null);
    const [lastAckedMsgId, setLastAckedMsgId] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);

    const engineRef = useRef<AnyEngine | null>(null);

    useEffect(() => {
        let cancelled = false;

        // Shared event wiring for both engine types
        function wireEvents(engine: AnyEngine, demo: boolean) {
            const handlePeerChange = (e: Event) => {
                const detail = (e as CustomEvent<{ count: number }>).detail;
                setPeerCount(detail.count);
            };
            const handleSOSReceived = (e: Event) => {
                const detail = (e as CustomEvent<MeshMessage>).detail;
                setLastSOS(detail);
            };
            const handleAck = (e: Event) => {
                const detail = (e as CustomEvent<{ msgId: string }>).detail;
                setLastAckedMsgId(detail.msgId);
            };

            engine.addEventListener('peer_change', handlePeerChange);
            engine.addEventListener('sos_received', handleSOSReceived);
            engine.addEventListener('ack', handleAck);

            engineRef.current = engine;
            setIsDemoMode(demo);

            engine.start().then(() => {
                if (!cancelled) setIsActive(true);
            }).catch((err) => {
                console.error('[Mesh] Failed to start engine:', err);
            });

            return () => {
                engine.removeEventListener('peer_change', handlePeerChange);
                engine.removeEventListener('sos_received', handleSOSReceived);
                engine.removeEventListener('ack', handleAck);
                engine.stop();
                engineRef.current = null;
                setIsActive(false);
                setPeerCount(0);
                setIsDemoMode(false);
            };
        }

        // If we have a socket and it's connected, use the real engine
        if (socket && socket.connected) {
            return wireEvents(new OfflineMeshEngine({ socket }), false);
        }

        // If socket exists but not yet connected, wait a bit
        if (socket) {
            let cleanup: (() => void) | null = null;
            const timeout = setTimeout(() => {
                if (cancelled) return;
                if (socket.connected) {
                    cleanup = wireEvents(new OfflineMeshEngine({ socket }), false);
                } else {
                    // Timed out waiting — fall back to demo
                    console.log('[Mesh] Socket not connected after timeout — using Demo Mode');
                    cleanup = wireEvents(new DemoMeshEngine(), true);
                }
            }, SOCKET_TIMEOUT_MS);

            // Also listen for connect event
            const onConnect = () => {
                if (cancelled) return;
                clearTimeout(timeout);
                cleanup = wireEvents(new OfflineMeshEngine({ socket }), false);
            };
            socket.once('connect', onConnect);

            return () => {
                cancelled = true;
                clearTimeout(timeout);
                socket.off('connect', onConnect);
                cleanup?.();
            };
        }

        // No socket at all — use demo immediately
        return wireEvents(new DemoMeshEngine(), true);
    }, [socket]);

    const sendSOS = useCallback(
        (lat: number, lng: number, floor?: number): string | null => {
            if (!engineRef.current) return null;
            return engineRef.current.sendSOS(lat, lng, floor);
        },
        []
    );

    const relayHazard = useCallback(
        (hazardJson: string, floor?: number): void => {
            engineRef.current?.sendCustomMessage('AR_UPDATE', hazardJson, 8, floor);
        },
        []
    );

    const relayLocation = useCallback(
        (lat: number, lng: number, floor?: number): void => {
            const payload = JSON.stringify({ lat, lng });
            engineRef.current?.sendCustomMessage('LOCATION', payload, 3, floor);
        },
        []
    );

    return {
        peerCount,
        lastSOS,
        lastAckedMsgId,
        isActive,
        isDemoMode,
        sendSOS,
        relayHazard,
        relayLocation,
    };
}


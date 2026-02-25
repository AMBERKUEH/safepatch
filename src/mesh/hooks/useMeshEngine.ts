// ──────────────────────────────────────────────────
// useMeshEngine — React hook for Offline Mesh Engine
// Auto-activates when the socket is available.
// ──────────────────────────────────────────────────

import { useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { MeshMessage } from '../model/MeshMessage';
import { OfflineMeshEngine } from '../engine/OfflineMeshEngine';

export function useMeshEngine(socket: Socket | null) {
    const [peerCount, setPeerCount] = useState(0);
    const [lastSOS, setLastSOS] = useState<MeshMessage | null>(null);
    const [lastAckedMsgId, setLastAckedMsgId] = useState<string | null>(null);
    const [isActive, setIsActive] = useState(false);

    const engineRef = useRef<OfflineMeshEngine | null>(null);

    useEffect(() => {
        if (!socket) return;

        const engine = new OfflineMeshEngine({ socket });
        engineRef.current = engine;

        // Attach event listeners
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

        // Start the engine
        engine.start().then(() => {
            setIsActive(true);
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
        };
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
        sendSOS,
        relayHazard,
        relayLocation,
    };
}

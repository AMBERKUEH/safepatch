// ──────────────────────────────────────────────────────
// OfflineMeshEngine — core P2P relay engine
// Extends EventTarget for framework-agnostic event dispatch.
// ──────────────────────────────────────────────────────

import type { Socket } from 'socket.io-client';
import type { MeshMessage } from '../model/MeshMessage';
import { MeshMessageFactory } from '../model/MeshMessage';
import { MeshStore } from '../db/MeshStore';
import { WebRTCPeerManager } from './WebRTCPeerManager';

const SESSION_STORAGE_KEY = 'safepath_mesh_sender_id';
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_ROOM = 'safepath_mesh_default';

function generateSenderId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export class OfflineMeshEngine extends EventTarget {
    private socket: Socket;
    private roomId: string;
    private localSenderId: string;

    private store: MeshStore;
    private peerManager: WebRTCPeerManager | null = null;
    private cleanupTimer: ReturnType<typeof setInterval> | null = null;

    constructor(opts: { socket: Socket; roomId?: string; senderId?: string }) {
        super();
        this.socket = opts.socket;
        this.roomId = opts.roomId ?? DEFAULT_ROOM;
        this.store = new MeshStore();

        // Resolve senderId from param → sessionStorage → generate
        if (opts.senderId) {
            this.localSenderId = opts.senderId;
        } else {
            let stored: string | null = null;
            try {
                stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
            } catch {
                // SSR / private mode fallback
            }
            if (stored) {
                this.localSenderId = stored;
            } else {
                this.localSenderId = generateSenderId();
                try {
                    sessionStorage.setItem(SESSION_STORAGE_KEY, this.localSenderId);
                } catch {
                    // ignore
                }
            }
        }
    }

    // ─── Lifecycle ─────────────────────────────────

    async start(): Promise<void> {
        await this.store.open();

        this.peerManager = new WebRTCPeerManager(this.socket, this.localSenderId);

        this.peerManager.onmessage = (data: string, fromPeerId: string) => {
            this.handleIncoming(data, fromPeerId);
        };

        this.peerManager.onpeerchange = (count: number) => {
            this.dispatchEvent(new CustomEvent('peer_change', { detail: { count } }));
        };

        this.peerManager.joinRoom(this.roomId);

        // Periodic cleanup of expired messages
        this.cleanupTimer = setInterval(() => {
            this.store.deleteExpired().catch(() => { });
        }, CLEANUP_INTERVAL_MS);
    }

    stop(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        this.peerManager?.destroy();
        this.peerManager = null;
        this.store.close();
    }

    // ─── Sending ───────────────────────────────────

    sendSOS(lat: number, lng: number, floor: number = 0): string {
        const msg = MeshMessageFactory.sos(this.localSenderId, lat, lng, floor);
        this.broadcastAndStore(msg);
        return msg.msgId;
    }

    sendCustomMessage(
        type: MeshMessage['type'],
        payload: string,
        priority: number = 5,
        floor: number = 0
    ): string {
        const msg = MeshMessageFactory.create(type, this.localSenderId, payload, {
            priority,
            floor,
        });
        this.broadcastAndStore(msg);
        return msg.msgId;
    }

    getActivePeerCount(): number {
        return this.peerManager?.getPeerCount() ?? 0;
    }

    getLocalSenderId(): string {
        return this.localSenderId;
    }

    // ─── Outgoing helpers ──────────────────────────

    private async broadcastAndStore(msg: MeshMessage): Promise<void> {
        const json = JSON.stringify(msg);
        this.peerManager?.broadcast(json);
        try {
            await this.store.insert(msg);
        } catch {
            // ignore store errors on send
        }
    }

    // ─── Incoming pipeline ─────────────────────────

    private async handleIncoming(raw: string, fromPeerId: string): Promise<void> {
        // 1. Parse
        const msg = MeshMessageFactory.fromJSON(raw);
        if (!msg) return;

        // 2. Drop own messages
        if (msg.senderId === this.localSenderId) return;

        // 3. ACK handling
        if (msg.type === 'ACK') {
            try {
                const ackPayload = JSON.parse(msg.payload);
                if (ackPayload.ackFor) {
                    await this.store.markDelivered(ackPayload.ackFor);
                    this.dispatchEvent(
                        new CustomEvent('ack', { detail: { msgId: ackPayload.ackFor } })
                    );
                }
            } catch {
                // bad ack payload
            }
            return;
        }

        // 4. Dedup — check store
        const alreadySeen = await this.store.exists(msg.msgId);
        if (alreadySeen) return;

        // 5. Insert
        const inserted = await this.store.insert(msg);
        if (!inserted) return; // race condition dedup

        // 6. Emit events
        this.dispatchEvent(new CustomEvent('message', { detail: msg }));
        if (msg.type === 'SOS') {
            this.dispatchEvent(new CustomEvent('sos_received', { detail: msg }));
        }

        // 7. Send ACK back to the sender peer (not broadcast)
        const ack = MeshMessageFactory.ack(this.localSenderId, msg.msgId);
        this.peerManager?.sendTo(fromPeerId, JSON.stringify(ack));

        // 8. Relay if TTL > 0
        if (msg.ttl > 0) {
            this.scheduleRelay(msg, fromPeerId);
        }
    }

    // ─── Relay scheduling ──────────────────────────

    private scheduleRelay(msg: MeshMessage, fromPeerId: string): void {
        const priorityFactor = (11 - clamp(msg.priority, 1, 10)) / 10;
        const minDelay = 100 + priorityFactor * 100;
        const maxDelay = 150 + priorityFactor * 250;
        const jitter = minDelay + Math.random() * (maxDelay - minDelay);

        setTimeout(async () => {
            const relayed = MeshMessageFactory.decrementTtl(msg);
            const json = JSON.stringify(relayed);
            this.peerManager?.broadcast(json, fromPeerId);

            try {
                await this.store.incrementForwardCount(msg.msgId);
            } catch {
                // ignore
            }
        }, jitter);
    }
}

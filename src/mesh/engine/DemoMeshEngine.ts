// ──────────────────────────────────────────────────
// DemoMeshEngine — simulates P2P mesh locally
// Used when no Socket.io server is available.
// Same event interface as OfflineMeshEngine.
// ──────────────────────────────────────────────────

import { MeshMessageFactory } from '../model/MeshMessage';
import type { MeshMessage } from '../model/MeshMessage';
import { MeshStore } from '../db/MeshStore';

const DEMO_PEER_NAMES = ['Demo-Alpha', 'Demo-Bravo', 'Demo-Charlie'];

function randomDelay(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export class DemoMeshEngine extends EventTarget {
    private localSenderId: string;
    private store: MeshStore;
    private timers: ReturnType<typeof setTimeout>[] = [];
    private intervalTimers: ReturnType<typeof setInterval>[] = [];
    private _peerCount = 0;
    private _started = false;

    constructor() {
        super();
        this.localSenderId =
            typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'demo-' + Math.random().toString(36).slice(2, 10);
        this.store = new MeshStore();
    }

    // ─── Lifecycle ─────────────────────────────────

    async start(): Promise<void> {
        if (this._started) return;
        this._started = true;

        try {
            await this.store.open();
        } catch {
            // IndexedDB may not be available in all contexts
        }

        console.log('[Mesh] 🟡 Demo Mode — no server detected');

        // Simulate peers joining over time
        this.schedulePeerJoin(1, randomDelay(1000, 2000));
        this.schedulePeerJoin(2, randomDelay(4000, 6000));

        // Occasionally toggle peer count to simulate real-world churn
        const churnInterval = setInterval(() => {
            if (!this._started) return;
            const delta = Math.random() > 0.5 ? 1 : -1;
            this._peerCount = Math.max(1, Math.min(3, this._peerCount + delta));
            this.dispatchEvent(
                new CustomEvent('peer_change', { detail: { count: this._peerCount } })
            );
        }, randomDelay(15000, 25000));
        this.intervalTimers.push(churnInterval);

        // Simulate receiving an SOS from a virtual peer after some time
        const sosTimer = setTimeout(() => {
            if (!this._started) return;
            const virtualSender = 'demo-peer-' + Math.random().toString(36).slice(2, 8);
            const msg = MeshMessageFactory.sos(virtualSender, 3.1390, 101.6869, 1);
            this.dispatchEvent(new CustomEvent('message', { detail: msg }));
            this.dispatchEvent(new CustomEvent('sos_received', { detail: msg }));
        }, randomDelay(10000, 15000));
        this.timers.push(sosTimer);
    }

    stop(): void {
        this._started = false;
        this.timers.forEach(clearTimeout);
        this.intervalTimers.forEach(clearInterval);
        this.timers = [];
        this.intervalTimers = [];
        this._peerCount = 0;
        this.store.close();
    }

    // ─── Sending ───────────────────────────────────

    sendSOS(lat: number, lng: number, floor: number = 0): string {
        const msg = MeshMessageFactory.sos(this.localSenderId, lat, lng, floor);
        this.storeMessage(msg);

        // Simulate an ACK after a short delay
        const ackDelay = randomDelay(800, 2000);
        const ackTimer = setTimeout(() => {
            if (!this._started) return;
            this.dispatchEvent(
                new CustomEvent('ack', { detail: { msgId: msg.msgId } })
            );
            console.log('[Mesh Demo] ✅ ACK received for SOS:', msg.msgId.slice(-6));
        }, ackDelay);
        this.timers.push(ackTimer);

        console.log('[Mesh Demo] 🆘 SOS broadcast:', msg.msgId.slice(-6));
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
        this.storeMessage(msg);

        // Simulate relay ACK
        const ackTimer = setTimeout(() => {
            if (!this._started) return;
            this.dispatchEvent(
                new CustomEvent('ack', { detail: { msgId: msg.msgId } })
            );
        }, randomDelay(500, 1500));
        this.timers.push(ackTimer);

        console.log(`[Mesh Demo] 📡 ${type} broadcast:`, msg.msgId.slice(-6));
        return msg.msgId;
    }

    getActivePeerCount(): number {
        return this._peerCount;
    }

    getLocalSenderId(): string {
        return this.localSenderId;
    }

    // ─── Helpers ───────────────────────────────────

    private schedulePeerJoin(count: number, delay: number): void {
        const timer = setTimeout(() => {
            if (!this._started) return;
            this._peerCount = count;
            this.dispatchEvent(
                new CustomEvent('peer_change', { detail: { count } })
            );
            console.log(`[Mesh Demo] 👥 ${count} peer(s) connected`);
        }, delay);
        this.timers.push(timer);
    }

    private async storeMessage(msg: MeshMessage): Promise<void> {
        try {
            await this.store.insert(msg);
        } catch {
            // ignore store errors in demo
        }
    }
}

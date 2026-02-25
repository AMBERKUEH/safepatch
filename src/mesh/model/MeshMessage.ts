// ──────────────────────────────────────────────
// MeshMessage — data model for P2P mesh relay
// ──────────────────────────────────────────────

export interface MeshMessage {
    msgId: string;        // UUID v4, generated client-side
    type: 'SOS' | 'LOCATION' | 'AR_UPDATE' | 'ACK';
    senderId: string;     // Ephemeral ID from sessionStorage, regenerated each tab
    timestamp: number;    // Date.now()
    ttl: number;          // Default 6, decremented each hop
    priority: number;     // 1–10
    payload: string;      // JSON string, max 512 bytes
    floor: number;        // Building floor number
}

function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export const MeshMessageFactory = {
    /**
     * Create an SOS message — highest priority, full TTL.
     */
    sos(senderId: string, lat: number, lng: number, floor: number = 0): MeshMessage {
        return {
            msgId: generateUUID(),
            type: 'SOS',
            senderId,
            timestamp: Date.now(),
            ttl: 6,
            priority: 10,
            payload: JSON.stringify({ lat, lng }),
            floor,
        };
    },

    /**
     * Create an ACK message for a received message.
     */
    ack(senderId: string, originalMsgId: string): MeshMessage {
        return {
            msgId: generateUUID(),
            type: 'ACK',
            senderId,
            timestamp: Date.now(),
            ttl: 1,
            priority: 9,
            payload: JSON.stringify({ ackFor: originalMsgId }),
            floor: 0,
        };
    },

    /**
     * Generic factory with optional overrides.
     */
    create(
        type: MeshMessage['type'],
        senderId: string,
        payload: string,
        options: { priority?: number; ttl?: number; floor?: number } = {}
    ): MeshMessage {
        return {
            msgId: generateUUID(),
            type,
            senderId,
            timestamp: Date.now(),
            ttl: options.ttl ?? 6,
            priority: options.priority ?? 5,
            payload,
            floor: options.floor ?? 0,
        };
    },

    /**
     * Returns a copy with ttl decremented by 1.
     */
    decrementTtl(msg: MeshMessage): MeshMessage {
        return { ...msg, ttl: msg.ttl - 1 };
    },

    /**
     * Parse a raw JSON string into a MeshMessage, returning null on failure.
     */
    fromJSON(raw: string): MeshMessage | null {
        try {
            const parsed = JSON.parse(raw);
            if (
                typeof parsed.msgId === 'string' &&
                typeof parsed.type === 'string' &&
                typeof parsed.senderId === 'string' &&
                typeof parsed.timestamp === 'number' &&
                typeof parsed.ttl === 'number' &&
                typeof parsed.priority === 'number' &&
                typeof parsed.payload === 'string' &&
                typeof parsed.floor === 'number'
            ) {
                return parsed as MeshMessage;
            }
            return null;
        } catch {
            return null;
        }
    },

    /**
     * Validate a MeshMessage: payload ≤ 512 bytes, priority 1–10, ttl ≥ 0.
     */
    isValid(msg: MeshMessage): boolean {
        if (!msg) return false;
        const payloadBytes = new TextEncoder().encode(msg.payload).length;
        if (payloadBytes > 512) return false;
        if (msg.priority < 1 || msg.priority > 10) return false;
        if (msg.ttl < 0) return false;
        return true;
    },
};

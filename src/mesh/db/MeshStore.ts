// ──────────────────────────────────────────────
// MeshStore — IndexedDB store-and-forward layer
// ──────────────────────────────────────────────

import type { MeshMessage } from '../model/MeshMessage';

const DB_NAME = 'safepath_mesh';
const STORE_NAME = 'mesh_messages';
const DB_VERSION = 1;
const EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

interface MeshRecord {
    msgId: string;
    rawJson: string;
    receivedAt: number;
    forwardedCount: number;
    delivered: boolean;
    priority: number;
    messageType: string;
}

export class MeshStore {
    private db: IDBDatabase | null = null;

    /**
     * Open (or create) the IndexedDB database and object store.
     */
    async open(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'msgId' });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    /**
     * Insert a message record. Returns false if the msgId already exists (dedup).
     */
    async insert(message: MeshMessage): Promise<boolean> {
        if (!this.db) throw new Error('MeshStore not open');

        // Check for duplicate first
        const alreadyExists = await this.exists(message.msgId);
        if (alreadyExists) return false;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const record: MeshRecord = {
                msgId: message.msgId,
                rawJson: JSON.stringify(message),
                receivedAt: Date.now(),
                forwardedCount: 0,
                delivered: false,
                priority: message.priority,
                messageType: message.type,
            };

            const req = store.add(record);
            req.onsuccess = () => resolve(true);
            req.onerror = () => {
                // ConstraintError means duplicate key — treat as dedup
                if (req.error?.name === 'ConstraintError') {
                    resolve(false);
                } else {
                    reject(req.error);
                }
            };
        });
    }

    /**
     * Check whether a msgId already exists in the store.
     */
    async exists(msgId: string): Promise<boolean> {
        if (!this.db) throw new Error('MeshStore not open');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getKey(msgId);
            req.onsuccess = () => resolve(req.result !== undefined);
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Mark a message as delivered.
     */
    async markDelivered(msgId: string): Promise<void> {
        if (!this.db) throw new Error('MeshStore not open');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(msgId);

            req.onsuccess = () => {
                const record = req.result as MeshRecord | undefined;
                if (record) {
                    record.delivered = true;
                    store.put(record);
                }
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Increment the forward count for a message.
     */
    async incrementForwardCount(msgId: string): Promise<void> {
        if (!this.db) throw new Error('MeshStore not open');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(msgId);

            req.onsuccess = () => {
                const record = req.result as MeshRecord | undefined;
                if (record) {
                    record.forwardedCount += 1;
                    store.put(record);
                }
                resolve();
            };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Delete records older than 15 minutes. Returns the count deleted.
     */
    async deleteExpired(): Promise<number> {
        if (!this.db) throw new Error('MeshStore not open');

        return new Promise((resolve, reject) => {
            const cutoff = Date.now() - EXPIRY_MS;
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.openCursor();
            let deleted = 0;

            req.onsuccess = () => {
                const cursor = req.result;
                if (cursor) {
                    const record = cursor.value as MeshRecord;
                    if (record.receivedAt < cutoff) {
                        cursor.delete();
                        deleted++;
                    }
                    cursor.continue();
                } else {
                    resolve(deleted);
                }
            };
            req.onerror = () => reject(req.error);
        });
    }

    /**
     * Close the database connection.
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

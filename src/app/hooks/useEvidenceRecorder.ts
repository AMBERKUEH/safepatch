// ──────────────────────────────────────────────────
// useEvidenceRecorder — audio/video recording + encryption
// Uses MediaRecorder + Web Crypto API + IndexedDB offline storage
// ──────────────────────────────────────────────────

import { useState, useRef, useCallback } from 'react';

const DB_NAME = 'safepath_evidence';
const STORE_NAME = 'recordings';

interface RecordingMeta {
    id: string;
    timestamp: number;
    lat: number;
    lng: number;
    encryptionKeyBase64: string; // exported AES key (base64)
    uploaded: boolean;
}

async function openEvidenceDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function storeRecordingLocally(meta: RecordingMeta, encryptedBlob: Blob): Promise<void> {
    const db = await openEvidenceDB();
    const arrayBuf = await encryptedBlob.arrayBuffer();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put({ ...meta, data: arrayBuf });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

async function encryptBlob(blob: Blob): Promise<{ encrypted: Blob; keyBase64: string }> {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plainBuf = await blob.arrayBuffer();
    const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBuf);

    // Prepend IV to ciphertext
    const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), iv.length);

    const exportedKey = await crypto.subtle.exportKey('raw', key);
    const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));

    return { encrypted: new Blob([combined]), keyBase64 };
}

export function useEvidenceRecorder() {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingId, setRecordingId] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async (): Promise<string | null> => {
        try {
            // Request audio (+ video if available)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false }).catch(() => null);
            if (!stream) {
                console.warn('[Evidence] No media access granted');
                return null;
            }

            const id = `rec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            chunksRef.current = [];

            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };
            recorder.start(1000); // capture in 1s chunks

            mediaRecorderRef.current = recorder;
            setIsRecording(true);
            setRecordingId(id);
            return id;
        } catch (err) {
            console.error('[Evidence] Failed to start recording:', err);
            return null;
        }
    }, []);

    const stopRecording = useCallback(async (lat: number = 0, lng: number = 0): Promise<RecordingMeta | null> => {
        const recorder = mediaRecorderRef.current;
        if (!recorder || recorder.state === 'inactive') return null;

        return new Promise((resolve) => {
            recorder.onstop = async () => {
                // Stop all tracks
                recorder.stream.getTracks().forEach(t => t.stop());

                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                chunksRef.current = [];

                // Encrypt
                const { encrypted, keyBase64 } = await encryptBlob(blob);

                const meta: RecordingMeta = {
                    id: recordingId || `rec-${Date.now()}`,
                    timestamp: Date.now(),
                    lat, lng,
                    encryptionKeyBase64: keyBase64,
                    uploaded: false,
                };

                // Try upload, fallback to IndexedDB
                const uploaded = await tryUpload(meta, encrypted);
                if (!uploaded) {
                    await storeRecordingLocally(meta, encrypted);
                    console.log('[Evidence] Stored locally (offline)');
                }

                setIsRecording(false);
                setRecordingId(null);
                mediaRecorderRef.current = null;
                resolve({ ...meta, uploaded });
            };

            recorder.stop();
        });
    }, [recordingId]);

    return { isRecording, recordingId, startRecording, stopRecording };
}

async function tryUpload(meta: RecordingMeta, encrypted: Blob): Promise<boolean> {
    try {
        if (!navigator.onLine) return false;

        const formData = new FormData();
        formData.append('file', encrypted, `${meta.id}.enc`);
        formData.append('meta', JSON.stringify(meta));

        const res = await fetch('/api/sos/recording', { method: 'POST', body: formData });
        return res.ok;
    } catch {
        return false;
    }
}

// ──────────────────────────────────────────────────
// Silent SOS API — alerts + recording uploads
// POST /api/sos          — alert
// POST /api/sos/recording — encrypted file upload
// GET  /api/sos/recordings — list recordings
// ──────────────────────────────────────────────────

import { Router } from 'express';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const silentSOSRouter = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = join(__dirname, '..', 'uploads', 'recordings');

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
    mkdirSync(UPLOAD_DIR, { recursive: true });
}

/*
  Data Model:
  SOSRecording {
    id: string,
    userId: string,
    timestamp: number,
    location: { lat, lng },
    fileUrl: string,
    encryptionKey: string (base64 AES key),
    uploaded: boolean,
  }
*/

// In-memory store (replace with DB in production)
const sosAlerts = [];
const recordings = [];

// ─── SOS Alert ───────────────────────────────────
silentSOSRouter.post('/', (req, res) => {
    const { type, timestamp, lat, lng, userId, contacts } = req.body;
    const alert = {
        id: `sos-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: type || 'silent',
        userId: userId || 'anonymous',
        timestamp: timestamp || Date.now(),
        location: { lat: lat || 0, lng: lng || 0 },
        contacts: contacts || [],
        createdAt: Date.now(),
    };
    sosAlerts.push(alert);
    console.log(`[SOS] 🚨 ${alert.type} alert from ${alert.userId} at (${alert.location.lat}, ${alert.location.lng})`);
    // TODO: Send push/SMS notifications to contacts
    res.json({ success: true, alertId: alert.id });
});

// ─── Recording Upload ────────────────────────────
// NOTE: In production, use multer middleware for file uploads.
// This is a simplified version that reads the raw body.
silentSOSRouter.post('/recording', (req, res) => {
    // For a proper implementation, use multer:
    // const upload = multer({ dest: UPLOAD_DIR });
    // For now, accept JSON with base64-encoded data
    const { meta, data } = req.body || {};

    if (!meta) {
        return res.status(400).json({ error: 'Missing recording metadata' });
    }

    const parsedMeta = typeof meta === 'string' ? JSON.parse(meta) : meta;
    const filePath = join(UPLOAD_DIR, `${parsedMeta.id}.enc`);

    // If data is provided as base64, write to disk
    if (data) {
        try {
            const buffer = Buffer.from(data, 'base64');
            writeFileSync(filePath, buffer);
        } catch (err) {
            console.error('[SOS] Failed to write recording:', err);
        }
    }

    const recording = {
        id: parsedMeta.id,
        userId: parsedMeta.userId || 'anonymous',
        timestamp: parsedMeta.timestamp || Date.now(),
        location: { lat: parsedMeta.lat || 0, lng: parsedMeta.lng || 0 },
        fileUrl: `/uploads/recordings/${parsedMeta.id}.enc`,
        encryptionKey: parsedMeta.encryptionKeyBase64 || '',
        uploaded: true,
    };
    recordings.push(recording);
    console.log(`[SOS] Recording uploaded: ${recording.id}`);
    res.json({ success: true, recordingId: recording.id, fileUrl: recording.fileUrl });
});

// ─── List Recordings ─────────────────────────────
silentSOSRouter.get('/recordings', (_req, res) => {
    res.json(recordings);
});

// ─── Socket.io registration ─────────────────────
export function registerSOSSocket(io) {
    io.on('connection', (socket) => {
        socket.on('sos:alert', (data) => {
            const { type, timestamp, lat, lng } = data;
            console.log(`[SOS] Socket alert: ${type} at (${lat}, ${lng})`);
            // Broadcast to all connected clients (contacts)
            socket.broadcast.emit('sos:incoming', { type, timestamp, lat, lng, from: socket.id });
        });
    });
}

export { silentSOSRouter };

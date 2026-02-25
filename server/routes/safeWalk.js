// ──────────────────────────────────────────────────
// Safe Walk API — session CRUD + location streaming
// POST /api/safewalk/start
// POST /api/safewalk/stop
// POST /api/safewalk/alert
// GET  /api/safewalk/session/:id
// ──────────────────────────────────────────────────

import { Router } from 'express';

const safeWalkRouter = Router();

/*
  Data Model:
  SafeWalkSession {
    id: string,
    userId: string,
    contacts: string[],
    startTime: number,
    duration: number (minutes),
    locations: Array<{ lat, lng, timestamp }>,
    status: 'active' | 'alert' | 'completed',
  }
*/

// In-memory store (replace with DB in production)
const activeSessions = new Map();

safeWalkRouter.post('/start', (req, res) => {
    const { id, contacts, duration, startTime, userId } = req.body;
    const session = {
        id: id || `sw-${Date.now()}`,
        userId: userId || 'anonymous',
        contacts: contacts || [],
        startTime: startTime || Date.now(),
        duration: duration || 30,
        locations: [],
        status: 'active',
    };
    activeSessions.set(session.id, session);
    console.log(`[SafeWalk] Session started: ${session.id} — contacts: ${session.contacts.join(', ')}`);
    res.json({ success: true, sessionId: session.id });
});

safeWalkRouter.post('/stop', (req, res) => {
    const { sessionId } = req.body;
    const session = activeSessions.get(sessionId);
    if (session) {
        session.status = 'completed';
        console.log(`[SafeWalk] Session stopped: ${sessionId}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

safeWalkRouter.post('/alert', (req, res) => {
    const { sessionId, lat, lng, reason } = req.body;
    const session = activeSessions.get(sessionId);
    if (session) {
        session.status = 'alert';
        console.log(`[SafeWalk] ⚠️ ALERT for session ${sessionId}: ${reason} at (${lat}, ${lng})`);
        // TODO: Send push notifications / SMS to contacts
        res.json({ success: true, alerted: true });
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

safeWalkRouter.get('/session/:id', (req, res) => {
    const session = activeSessions.get(req.params.id);
    if (session) {
        res.json(session);
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
});

// ─── Socket.io registration (called from server/index.js) ──
export function registerSafeWalkSocket(io) {
    io.on('connection', (socket) => {
        socket.on('safewalk:location', (data) => {
            const { sessionId, lat, lng, timestamp } = data;
            const session = activeSessions.get(sessionId);
            if (session) {
                session.locations.push({ lat, lng, timestamp });
                // Broadcast to contacts (in production, send to specific rooms)
                socket.broadcast.emit('safewalk:location_update', { sessionId, lat, lng, timestamp });
            }
        });

        socket.on('safewalk:alert', (data) => {
            const { sessionId, lat, lng, reason } = data;
            console.log(`[SafeWalk] Socket alert: ${sessionId} — ${reason}`);
            // Broadcast emergency alert
            io.emit('safewalk:emergency', { sessionId, lat, lng, reason, timestamp: Date.now() });
        });
    });
}

export { safeWalkRouter };

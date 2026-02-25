// ──────────────────────────────────────────────────
// First Aid Session Logging API
// POST /api/first-aid/session
// ──────────────────────────────────────────────────

import { Router } from 'express';

const firstAidRouter = Router();

// In-memory store (replace with DB in production)
const sessions = [];

firstAidRouter.post('/session', (req, res) => {
    const { type, startedAt, steps } = req.body;
    const session = {
        id: `fa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        startedAt: startedAt || Date.now(),
        steps: steps || [],
        createdAt: Date.now(),
    };
    sessions.push(session);
    console.log(`[FirstAid] Session logged: ${session.id} (${type})`);
    res.json({ success: true, sessionId: session.id });
});

firstAidRouter.get('/sessions', (_req, res) => {
    res.json(sessions);
});

export { firstAidRouter };

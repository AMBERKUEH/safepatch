import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { aiRouter } from './routes/ai.js';

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json());
app.use('/api/ai', aiRouter);

// In-memory state for demo (replace with DB in production)
const occupants = new Map(); // socketId -> { id, name, position, status, distanceToExit, lastSeen }
const hazards = [
  { x: 250, y: 150, width: 80, height: 80, type: 'fire' },
  { x: 0, y: 0, width: 10, height: 400, type: 'wall' },
  { x: 590, y: 0, width: 10, height: 400, type: 'wall' },
];

const EXIT = { x: 550, y: 50 };
function distanceToExit(position) {
  return Math.sqrt(Math.pow(EXIT.x - position.x, 2) + Math.pow(EXIT.y - position.y, 2)) / 10;
}

io.on('connection', (socket) => {
  const userId = `user-${socket.id.slice(0, 8)}`;
  occupants.set(socket.id, {
    id: socket.id,
    name: `Occupant ${occupants.size + 1}`,
    position: { x: 100, y: 350 },
    status: 'evacuating',
    distanceToExit: 45,
    lastSeen: Date.now(),
  });

  socket.emit('init', {
    occupants: Array.from(occupants.values()),
    hazards,
    buildingArea: { width: 600, height: 400 },
  });

  socket.broadcast.emit('occupants', Array.from(occupants.values()));

  socket.on('position', (position) => {
    const o = occupants.get(socket.id);
    if (o) {
      o.position = position;
      o.distanceToExit = distanceToExit(position);
      o.lastSeen = Date.now();
      o.status = o.status === 'sos' ? 'sos' : 'evacuating';
      occupants.set(socket.id, o);
      io.emit('occupants', Array.from(occupants.values()));
    }
  });

  socket.on('sos', () => {
    const o = occupants.get(socket.id);
    if (o) {
      o.status = 'sos';
      o.lastSeen = Date.now();
      occupants.set(socket.id, o);
      io.emit('occupants', Array.from(occupants.values()));
      io.emit('sos_alert', { userId: o.id, name: o.name, position: o.position });
    }
  });

  socket.on('safe', () => {
    const o = occupants.get(socket.id);
    if (o) {
      o.status = 'safe';
      o.lastSeen = Date.now();
      occupants.set(socket.id, o);
      io.emit('occupants', Array.from(occupants.values()));
    }
  });

  socket.on('hazard', (hazard) => {
    if (hazard && typeof hazard.x === 'number' && typeof hazard.y === 'number') {
      hazards.push({
        x: hazard.x,
        y: hazard.y,
        width: hazard.width || 50,
        height: hazard.height || 50,
        type: hazard.type || 'blocked',
      });
      io.emit('hazards', hazards);
    }
  });

  socket.on('disconnect', () => {
    const o = occupants.get(socket.id);
    if (o) {
      o.status = 'offline';
      o.lastSeen = Date.now();
      // Keep in map briefly so dashboard shows "offline", then remove
      setTimeout(() => {
        occupants.delete(socket.id);
        io.emit('occupants', Array.from(occupants.values()));
      }, 5000);
    } else {
      occupants.delete(socket.id);
      io.emit('occupants', Array.from(occupants.values()));
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`SafePath server: http://localhost:${PORT}`);
  console.log(`Socket.io ready for client connections`);
});

// After mounting the router
console.log('AI Router mounted at /api');

// Print all routes
// Add this debugging code
console.log('\n--- Routes inside AI Router ---');
if (aiRouter.stack) {
  aiRouter.stack.forEach((layer) => {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
      console.log(`${methods} ${layer.route.path}`);
    }
  });
}

console.log("Loaded Gemini key:", process.env.GEMINI_API_KEY?.slice(0, 8));
console.log("Gemini Key Length:", process.env.GEMINI_API_KEY?.length);
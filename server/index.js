import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { aiRouter } from './routes/ai.js';
import { registerMeshSignaling } from './meshSignaling.js';

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
app.get('/api/floor-plan', (req, res) => {
  // Normally this would come from a database. For the demo, we use the graph nodes/edges.
  // We'll import these or define them here for the server to serve.
  res.json({
    nodes: [
      { nodeId: 'exit1', x: 550, y: 50, z: 0, type: 'exit', label: 'Main Exit' },
      { nodeId: 'exit2', x: 50, y: 350, z: 0, type: 'exit', label: 'Emergency Exit' },
      { nodeId: 'n1', x: 100, y: 50, z: 0, type: 'junction' },
      { nodeId: 'n2', x: 300, y: 50, z: 0, type: 'junction' },
      { nodeId: 'n3', x: 300, y: 150, z: 0, type: 'junction' },
      { nodeId: 'n4', x: 100, y: 150, z: 0, type: 'junction' },
      { nodeId: 'r1', x: 150, y: 120, z: 0, type: 'room', label: 'Office A' },
      { nodeId: 'r2', x: 350, y: 120, z: 0, type: 'room', label: 'Office B' },
      { nodeId: 'start', x: 300, y: 300, z: 0, type: 'junction', label: 'Main Hall' },
    ],
    edges: [
      { edgeId: 'e1', from: 'n1', to: 'exit1', length: 45, baseCost: 45 },
      { edgeId: 'e2', from: 'n1', to: 'n2', length: 20, baseCost: 20 },
      { edgeId: 'e3', from: 'n2', to: 'n3', length: 10, baseCost: 10 },
      { edgeId: 'e4', from: 'n3', to: 'n4', length: 20, baseCost: 20 },
      { edgeId: 'e5', from: 'n3', to: 'start', length: 15, baseCost: 15 },
      { edgeId: 'e6', from: 'n4', to: 'exit2', length: 25, baseCost: 25 },
    ],
    walls: [
      { x1: 10, y1: 10, x2: 590, y2: 10 },
      { x1: 590, y1: 10, x2: 590, y2: 390 },
      { x1: 590, y1: 390, x2: 10, y2: 390 },
      { x1: 10, y1: 390, x2: 10, y2: 10 },
    ]
  });
});

app.get('/api/sensors', (req, res) => {
  // Simulate smoke sensors
  res.json([
    { sensorId: 's1', x: 200, y: 150, value: 0.8 }, // Fire near n4/r1
    { sensorId: 's2', x: 400, y: 300, value: 0.2 },
  ]);
});

// Register Offline Mesh Engine signaling
registerMeshSignaling(io);

const occupants = new Map();
const hazards = [];

io.on('connection', (socket) => {
  const userId = `user-${socket.id.slice(0, 8)}`;
  occupants.set(socket.id, {
    id: socket.id,
    name: `Occupant ${occupants.size + 1}`,
    position: { x: 300, y: 300 },
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

  socket.on('position_update', (data) => {
    // data: { userId, x, y }
    const o = occupants.get(socket.id);
    if (o) {
      o.position = { x: data.x, y: data.y };
      o.lastSeen = Date.now();
      occupants.set(socket.id, o);
      io.emit('occupants', Array.from(occupants.values()));
    }
  });

  socket.on('sos_triggered', (data) => {
    // data: { userId, x, y, floor, ts }
    console.log(`[SOS] ${data.userId} triggered at (${data.x}, ${data.y})`);
    const o = occupants.get(socket.id);
    if (o) {
      o.status = 'sos';
      o.position = { x: data.x, y: data.y };
      occupants.set(socket.id, o);
      io.emit('occupants', Array.from(occupants.values()));
      io.emit('sos_alert', {
        userId: data.userId,
        position: { x: data.x, y: data.y },
        timestamp: data.ts
      });
    }
  });

  socket.on('disconnect', () => {
    occupants.delete(socket.id);
    io.emit('occupants', Array.from(occupants.values()));
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`SafePath server: http://localhost:${PORT}`);
});


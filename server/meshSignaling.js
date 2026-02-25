// ──────────────────────────────────────────────────
// meshSignaling — Socket.io signaling relay for WebRTC mesh
// ──────────────────────────────────────────────────

/**
 * Register mesh signaling handlers on the Socket.io server.
 * @param {import('socket.io').Server} io
 */
export function registerMeshSignaling(io) {
    /** @type {Map<string, Set<string>>} */
    const rooms = new Map();

    /** @type {Map<string, { roomId: string, peerId: string }>} */
    const socketPeers = new Map();

    io.on('connection', (socket) => {
        // ─── mesh:join ───────────────────────────────
        socket.on('mesh:join', ({ roomId, peerId }) => {
            if (!roomId || !peerId) return;

            // Track this socket's mesh identity
            socketPeers.set(socket.id, { roomId, peerId });

            // Add peer to room set
            if (!rooms.has(roomId)) {
                rooms.set(roomId, new Set());
            }
            rooms.get(roomId).add(peerId);

            // Join the Socket.io room for broadcast
            socket.join(roomId);

            // Notify others in the room
            socket.to(roomId).emit('mesh:peer_joined', { peerId });
        });

        // ─── mesh:offer ──────────────────────────────
        socket.on('mesh:offer', ({ to, offer }) => {
            const info = socketPeers.get(socket.id);
            if (!info) return;
            socket.to(info.roomId).emit('mesh:offer', { from: info.peerId, offer });
        });

        // ─── mesh:answer ─────────────────────────────
        socket.on('mesh:answer', ({ to, answer }) => {
            const info = socketPeers.get(socket.id);
            if (!info) return;
            socket.to(info.roomId).emit('mesh:answer', { from: info.peerId, answer });
        });

        // ─── mesh:ice ────────────────────────────────
        socket.on('mesh:ice', ({ to, candidate }) => {
            const info = socketPeers.get(socket.id);
            if (!info) return;
            socket.to(info.roomId).emit('mesh:ice', { from: info.peerId, candidate });
        });

        // ─── disconnect ──────────────────────────────
        socket.on('disconnect', () => {
            const info = socketPeers.get(socket.id);
            if (!info) return;

            const { roomId, peerId } = info;

            const peerSet = rooms.get(roomId);
            if (peerSet) {
                peerSet.delete(peerId);
                if (peerSet.size === 0) {
                    rooms.delete(roomId);
                }
            }

            socket.to(roomId).emit('mesh:peer_left', { peerId });
            socketPeers.delete(socket.id);
        });
    });
}

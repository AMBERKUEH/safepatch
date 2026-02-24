// ──────────────────────────────────────────────────
// WebRTCPeerManager — peer discovery & DataChannel lifecycle
// Uses Socket.io for signaling only.
// ──────────────────────────────────────────────────

import type { Socket } from 'socket.io-client';

const ICE_SERVERS: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

const DATA_CHANNEL_CONFIG: RTCDataChannelInit = {
    ordered: false,
    maxRetransmits: 2,
};

const RETRY_DELAY_MS = 100;

interface PeerEntry {
    connection: RTCPeerConnection;
    channel: RTCDataChannel | null;
}

export class WebRTCPeerManager {
    private socket: Socket;
    private peerId: string;
    private peers: Map<string, PeerEntry> = new Map();

    /** Called when a DataChannel message is received from any peer. */
    public onmessage: ((data: string, fromPeerId: string) => void) | null = null;

    /** Called when the connected peer count changes. */
    public onpeerchange: ((count: number) => void) | null = null;

    constructor(socket: Socket, peerId: string) {
        this.socket = socket;
        this.peerId = peerId;
        this.attachSignalingListeners();
    }

    // ─── Signaling listeners ───────────────────────

    private attachSignalingListeners(): void {
        this.socket.on('mesh:peer_joined', (data: { peerId: string }) => {
            if (data.peerId === this.peerId) return;
            this.createConnection(data.peerId, true);
        });

        this.socket.on('mesh:offer', async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
            if (data.from === this.peerId) return;
            await this.handleOffer(data.from, data.offer);
        });

        this.socket.on('mesh:answer', async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
            const peer = this.peers.get(data.from);
            if (peer) {
                try {
                    await peer.connection.setRemoteDescription(
                        new RTCSessionDescription(data.answer)
                    );
                } catch (e) {
                    console.warn('[Mesh] Failed to set remote answer:', e);
                }
            }
        });

        this.socket.on('mesh:ice', async (data: { from: string; candidate: RTCIceCandidateInit }) => {
            const peer = this.peers.get(data.from);
            if (peer) {
                try {
                    await peer.connection.addIceCandidate(new RTCIceCandidate(data.candidate));
                } catch (e) {
                    console.warn('[Mesh] Failed to add ICE candidate:', e);
                }
            }
        });

        this.socket.on('mesh:peer_left', (data: { peerId: string }) => {
            this.removePeer(data.peerId);
        });
    }

    // ─── Connection lifecycle ──────────────────────

    private createConnection(remotePeerId: string, isOfferer: boolean): void {
        if (this.peers.has(remotePeerId)) return;

        const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        const entry: PeerEntry = { connection, channel: null };
        this.peers.set(remotePeerId, entry);

        // ICE candidate relay
        connection.onicecandidate = (ev) => {
            if (ev.candidate) {
                this.socket.emit('mesh:ice', { to: remotePeerId, candidate: ev.candidate.toJSON() });
            }
        };

        connection.onconnectionstatechange = () => {
            if (
                connection.connectionState === 'disconnected' ||
                connection.connectionState === 'failed' ||
                connection.connectionState === 'closed'
            ) {
                this.removePeer(remotePeerId);
            }
        };

        if (isOfferer) {
            // Create DataChannel as offerer
            const channel = connection.createDataChannel('mesh', DATA_CHANNEL_CONFIG);
            this.setupChannel(channel, remotePeerId, entry);

            connection.createOffer().then((offer) => {
                connection.setLocalDescription(offer);
                this.socket.emit('mesh:offer', { to: remotePeerId, offer });
            });
        } else {
            // Wait for DataChannel from offerer
            connection.ondatachannel = (ev) => {
                this.setupChannel(ev.channel, remotePeerId, entry);
            };
        }
    }

    private async handleOffer(
        fromPeerId: string,
        offer: RTCSessionDescriptionInit
    ): Promise<void> {
        // Create as answerer
        this.createConnection(fromPeerId, false);

        const peer = this.peers.get(fromPeerId);
        if (!peer) return;

        try {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await peer.connection.createAnswer();
            await peer.connection.setLocalDescription(answer);
            this.socket.emit('mesh:answer', { to: fromPeerId, answer });
        } catch (e) {
            console.warn('[Mesh] Error handling offer:', e);
        }
    }

    private setupChannel(
        channel: RTCDataChannel,
        remotePeerId: string,
        entry: PeerEntry
    ): void {
        entry.channel = channel;

        channel.onopen = () => {
            this.onpeerchange?.(this.getPeerCount());
        };

        channel.onclose = () => {
            this.onpeerchange?.(this.getPeerCount());
        };

        channel.onmessage = (ev) => {
            if (typeof ev.data === 'string') {
                this.onmessage?.(ev.data, remotePeerId);
            }
        };
    }

    private removePeer(remotePeerId: string): void {
        const peer = this.peers.get(remotePeerId);
        if (!peer) return;
        try {
            peer.channel?.close();
            peer.connection.close();
        } catch {
            // ignore
        }
        this.peers.delete(remotePeerId);
        this.onpeerchange?.(this.getPeerCount());
    }

    // ─── Public API ────────────────────────────────

    /**
     * Send data to all open DataChannels, optionally excluding one peer.
     */
    broadcast(data: string, exclude?: string): void {
        for (const [peerId, entry] of this.peers) {
            if (peerId === exclude) continue;
            this.trySend(entry, data, peerId);
        }
    }

    /**
     * Send data to a specific peer.
     */
    sendTo(peerId: string, data: string): void {
        const entry = this.peers.get(peerId);
        if (entry) {
            this.trySend(entry, data, peerId);
        }
    }

    private trySend(entry: PeerEntry, data: string, peerId: string): void {
        const ch = entry.channel;
        if (!ch || ch.readyState !== 'open') return;

        try {
            ch.send(data);
        } catch {
            // Retry once after RETRY_DELAY_MS
            setTimeout(() => {
                try {
                    if (ch.readyState === 'open') {
                        ch.send(data);
                    }
                } catch {
                    console.warn(`[Mesh] Retry send failed to peer ${peerId}`);
                }
            }, RETRY_DELAY_MS);
        }
    }

    /**
     * Number of peers with an open DataChannel.
     */
    getPeerCount(): number {
        let count = 0;
        for (const entry of this.peers.values()) {
            if (entry.channel?.readyState === 'open') count++;
        }
        return count;
    }

    /**
     * Join a mesh room by emitting the signaling event.
     */
    joinRoom(roomId: string): void {
        this.socket.emit('mesh:join', { roomId, peerId: this.peerId });
    }

    /**
     * Tear down everything — close all connections, remove listeners.
     */
    destroy(): void {
        for (const [, entry] of this.peers) {
            try {
                entry.channel?.close();
                entry.connection.close();
            } catch {
                // ignore
            }
        }
        this.peers.clear();

        this.socket.off('mesh:peer_joined');
        this.socket.off('mesh:offer');
        this.socket.off('mesh:answer');
        this.socket.off('mesh:ice');
        this.socket.off('mesh:peer_left');

        this.onmessage = null;
        this.onpeerchange = null;
    }
}

import React from 'react';
import { motion } from 'motion/react';
import { Share2, Wifi, WifiOff, AlertTriangle, CheckCircle, Info, Database } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import type { MeshMessage } from '../../../mesh/model/MeshMessage';

interface MeshNetworkPageProps {
    peerCount: number;
    lastSOS: MeshMessage | null;
    lastAckedMsgId: string | null;
    isActive: boolean;
    onSendSOS: () => void;
    onRelayHazard: () => void;
}

export function MeshNetworkPage({
    peerCount,
    lastSOS,
    lastAckedMsgId,
    isActive,
    onSendSOS,
    onRelayHazard,
}: MeshNetworkPageProps) {
    return (
        <div className="min-h-full bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="bg-white border-b px-6 py-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-blue-600' : 'bg-slate-200'}`}>
                        <Share2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Offline Mesh Network</h1>
                        <p className="text-slate-500 text-xs">P2P Emergency Relay System</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                {/* Connection Status Card */}
                <Card className="p-5 border-none shadow-md overflow-hidden relative">
                    <div className={`absolute top-0 right-0 p-4 ${isActive ? 'text-green-500' : 'text-slate-400'}`}>
                        {isActive ? <Wifi className="w-8 h-8" /> : <WifiOff className="w-8 h-8" />}
                    </div>

                    <div className="relative z-10">
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Status</h2>
                        <div className="flex items-end gap-2 mb-1">
                            <span className="text-4xl font-bold text-slate-900">{peerCount}</span>
                            <span className="text-slate-500 mb-1 font-medium">Active Peers</span>
                        </div>
                        <p className="text-xs text-slate-400">
                            {isActive
                                ? 'Relay engine is monitoring P2P channels.'
                                : 'Waiting for network connection...'}
                        </p>
                    </div>

                    <div className="mt-6 flex gap-2">
                        <Badge variant={isActive ? 'default' : 'secondary'} className={isActive ? 'bg-green-600' : ''}>
                            {isActive ? 'Engine Active' : 'Offline'}
                        </Badge>
                        {peerCount > 0 && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                                P2P Ready
                            </Badge>
                        )}
                    </div>
                </Card>

                {/* SOS Alert Section */}
                {lastSOS && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <Card className="p-5 border-red-200 bg-red-50 shadow-sm border-2">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shrink-0 animate-pulse">
                                    <AlertTriangle className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="font-bold text-red-900">SOS RECEIVED</h3>
                                        <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded uppercase">Mesh Relay</span>
                                    </div>
                                    <p className="text-sm text-red-800 mb-2">
                                        Emergency signal detected from device <span className="font-mono text-xs opacity-70">...{lastSOS.senderId.slice(-6)}</span>
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="text-[10px] text-red-700">
                                            <p className="font-bold">FLOOR</p>
                                            <p>{lastSOS.floor}</p>
                                        </div>
                                        <div className="text-[10px] text-red-700">
                                            <p className="font-bold">TIME</p>
                                            <p>{new Date(lastSOS.timestamp).toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                )}

                {/* Controls Section */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Mesh Controls</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <Button
                            className="h-24 flex flex-col gap-2 bg-red-600 hover:bg-red-700"
                            onClick={onSendSOS}
                        >
                            <AlertTriangle className="w-6 h-6" />
                            <div className="text-center text-xs">
                                <p className="font-bold">Manual SOS</p>
                                <p className="opacity-70 text-[10px]">Broadcast to Mesh</p>
                            </div>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex flex-col gap-2 border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={onRelayHazard}
                        >
                            <Database className="w-6 h-6" />
                            <div className="text-center text-xs">
                                <p className="font-bold">Hazard Relay</p>
                                <p className="opacity-70 text-[10px]">P2P Sensor Update</p>
                            </div>
                        </Button>
                    </div>
                </div>

                {/* Info Section */}
                <Card className="p-4 bg-slate-800 text-white border-none shadow-lg">
                    <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-blue-400" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400">P2P Architecture</h3>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-80">
                        The Offline Mesh Engine uses WebRTC DataChannels to build a decentralized network.
                        Once you connect to a peer via the initial handshake, your devices talk directly.
                        No cloud or internet required for emergency relay.
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-3 h-3 text-green-400" />
                            <span className="text-[10px] text-slate-400">Store & Forward Active</span>
                        </div>
                        {lastAckedMsgId && (
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-3 h-3 text-blue-400" />
                                <span className="text-[10px] text-blue-400">ACK Confirmed</span>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}

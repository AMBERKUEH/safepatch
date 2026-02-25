import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    X, AlertTriangle, Mic, Lock, Upload, WifiOff,
    Wifi, Clock, Trash2, Share2, ChevronRight, Shield, ArrowLeft,
    CheckCircle, HardDrive, MapPin
} from 'lucide-react';
import { useEvidenceRecorder } from '../../hooks/useEvidenceRecorder';
import { useSocket } from '../../hooks/useSocket';

interface SilentSOSOverlayProps {
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface EvidenceRecord {
    id: string;
    timestamp: number;
    durationSec: number;
    sizeKb: number;
    encrypted: boolean;
    status: 'local' | 'uploading' | 'uploaded' | 'failed';
    lat?: number;
    lng?: number;
    sharedWith: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// FAKE CALCULATOR — discreet cover screen
// ─────────────────────────────────────────────────────────────────────────────
function FakeCalculatorScreen({
    onSecretDismiss,
    isRecording,
}: {
    onSecretDismiss: () => void;
    isRecording: boolean;
}) {
    const [display, setDisplay] = useState('0');
    const tapCountRef = useRef(0);
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleButtonPress = useCallback((val: string) => {
        setDisplay(prev => {
            if (val === 'C') return '0';
            if (val === '=') {
                try {
                    const sanitized = prev.replace(/[^0-9+\-*/.() ]/g, '');
                    const result = new Function(`"use strict"; return (${sanitized})`)();
                    return String(result);
                } catch { return 'Error'; }
            }
            if (prev === '0' && val !== '.') return val;
            return prev + val;
        });
    }, []);

    const handleDisplayTap = useCallback(() => {
        tapCountRef.current += 1;
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 600);
        if (tapCountRef.current >= 3) {
            tapCountRef.current = 0;
            onSecretDismiss();
        }
    }, [onSecretDismiss]);

    const buttons = ['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', 'C', '0', '.', '+'];

    return (
        <div className="fixed inset-0 z-[9999] bg-gray-900 flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Display */}
            <div className="flex-1 flex items-end p-6 relative" onClick={handleDisplayTap}>
                <p className="text-white text-5xl font-light text-right w-full font-mono truncate">{display}</p>

                {/*
          ── LEGAL DISCLOSURE ──────────────────────────────────────────
          Visible ONLY to the person holding the phone (top-left corner,
          low contrast against dark bg, invisible to bystanders at arm's
          length but readable up close). Satisfies recording disclosure
          laws without alerting an aggressor.
          ────────────────────────────────────────────────────────────── */}
                {isRecording && (
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/40">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-mono text-red-400/70 tracking-widest">REC</span>
                        <Lock className="w-2.5 h-2.5 text-red-400/50" />
                    </div>
                )}
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-4 gap-[1px] bg-gray-700">
                {buttons.map(b => (
                    <button
                        key={b}
                        onClick={() => handleButtonPress(b === '×' ? '*' : b === '÷' ? '/' : b)}
                        className={`p-5 text-xl font-medium transition-colors active:brightness-75 ${['+', '-', '×', '÷'].includes(b) ? 'bg-orange-500 text-white' :
                            b === 'C' ? 'bg-gray-500 text-white' : 'bg-gray-800 text-white'
                            }`}
                    >
                        {b}
                    </button>
                ))}
                <button
                    onClick={() => handleButtonPress('=')}
                    className="col-span-4 p-5 text-xl font-medium bg-orange-500 text-white active:brightness-75"
                >
                    =
                </button>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECORDINGS STORAGE PANEL
// ─────────────────────────────────────────────────────────────────────────────
function RecordingsPanel({ onClose }: { onClose: () => void }) {
    const [records, setRecords] = useState<EvidenceRecord[]>([]);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Load from localStorage (in prod: IndexedDB)
    useEffect(() => {
        const raw = localStorage.getItem('sos_evidence_records');
        if (raw) {
            try { setRecords(JSON.parse(raw)); } catch { }
        }
        // Fake 2 demo records if empty
        else {
            const demo: EvidenceRecord[] = [
                {
                    id: 'ev_001',
                    timestamp: Date.now() - 1000 * 60 * 37,
                    durationSec: 142,
                    sizeKb: 4820,
                    encrypted: true,
                    status: 'uploaded',
                    lat: 3.1390,
                    lng: 101.6869,
                    sharedWith: ['Sarah (Guardian)', 'Emergency Contact 1'],
                },
                {
                    id: 'ev_002',
                    timestamp: Date.now() - 1000 * 60 * 60 * 3,
                    durationSec: 68,
                    sizeKb: 2310,
                    encrypted: true,
                    status: 'local',
                    sharedWith: [],
                },
            ];
            setRecords(demo);
        }

        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const uploadRecord = (id: string) => {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'uploading' } : r));
        // Simulate upload
        setTimeout(() => {
            setRecords(prev => prev.map(r => r.id === id ? { ...r, status: 'uploaded' } : r));
        }, 2200);
    };

    const deleteRecord = (id: string) => {
        setRecords(prev => prev.filter(r => r.id !== id));
    };

    const shareRecord = (id: string) => {
        // In production: generate signed URL, send to emergency contacts
        alert('Share link copied. In production this sends an encrypted access link to your emergency contacts.');
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleString('en-MY', { dateStyle: 'medium', timeStyle: 'short' });
    };

    const formatDuration = (sec: number) => `${Math.floor(sec / 60)}m ${sec % 60}s`;
    const formatSize = (kb: number) => kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;

    const statusConfig = {
        local: { label: 'Local only', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', Icon: WifiOff },
        uploading: { label: 'Uploading…', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', Icon: Upload },
        uploaded: { label: 'Encrypted & uploaded', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', Icon: Lock },
        failed: { label: 'Upload failed', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', Icon: AlertTriangle },
    };

    return (
        <div className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden pb-24">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />
                    <span className="text-xs font-medium text-gray-400 tracking-widest uppercase">Evidence Vault</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400">
                    {isOnline ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                    {isOnline ? 'Online' : 'Offline'}
                </div>
            </div>

            {/* Header */}
            <div className="px-5 pb-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-1 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight leading-none">Recordings</h1>
                        <p className="text-gray-400 text-sm mt-1">Encrypted evidence storage</p>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-4">
                {/* Encryption notice */}
                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 flex items-start gap-3">
                    <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-sm text-green-900">End-to-end encrypted</p>
                        <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                            All recordings are AES-256 encrypted on your device before upload. Only you and your designated emergency contacts can decrypt them.
                        </p>
                    </div>
                </div>

                {/* Offline warning */}
                {!isOnline && (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-center gap-3"
                    >
                        <WifiOff className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <p className="text-xs font-medium text-amber-800 leading-relaxed">
                            You're offline. Recordings are saved locally and will upload automatically when you reconnect.
                        </p>
                    </motion.div>
                )}

                {/* Storage usage */}
                <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <HardDrive className="w-4 h-4 text-gray-400" />
                            <p className="text-sm font-semibold text-gray-700">Local Storage</p>
                        </div>
                        <p className="text-xs text-gray-400 font-mono">
                            {formatSize(records.reduce((a, r) => a + r.sizeKb, 0))} used
                        </p>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{ width: `${Math.min((records.reduce((a, r) => a + r.sizeKb, 0) / 50000) * 100, 100)}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">of 50 MB local limit</p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">
                        {records.length} Recording{records.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Empty state */}
                {records.length === 0 && (
                    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-10 flex flex-col items-center gap-3 text-center">
                        <Shield className="w-10 h-10 text-gray-200" />
                        <p className="font-semibold text-gray-500 text-sm">No recordings yet</p>
                        <p className="text-xs text-gray-400">Evidence is automatically recorded when SOS is triggered.</p>
                    </div>
                )}

                {/* Records list */}
                <AnimatePresence>
                    {records.map((rec, i) => {
                        const s = statusConfig[rec.status];
                        return (
                            <motion.div
                                key={rec.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="rounded-2xl bg-white border border-gray-200 overflow-hidden"
                            >
                                {/* Record header */}
                                <div className="px-4 pt-4 pb-3 flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                                        <Mic className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-sm text-gray-900">{formatTime(rec.timestamp)}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {formatDuration(rec.durationSec)}
                                            </span>
                                            <span className="text-xs text-gray-400">{formatSize(rec.sizeKb)}</span>
                                            {rec.encrypted && (
                                                <span className="text-xs text-green-600 flex items-center gap-1">
                                                    <Lock className="w-3 h-3" /> Encrypted
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div className={`mx-4 mb-3 px-3 py-2 rounded-xl border flex items-center gap-2 ${s.bg} ${s.border}`}>
                                    <s.Icon className={`w-3.5 h-3.5 ${s.color} flex-shrink-0`} />
                                    <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
                                    {rec.status === 'uploading' && (
                                        <div className="ml-auto flex gap-0.5">
                                            {[0, 1, 2].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                                    className="w-1 h-1 rounded-full bg-blue-500"
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Location */}
                                {rec.lat && rec.lng && (
                                    <div className="mx-4 mb-3 flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                        <p className="text-xs text-gray-500 font-mono">{rec.lat.toFixed(4)}, {rec.lng.toFixed(4)}</p>
                                    </div>
                                )}

                                {/* Shared with */}
                                {rec.sharedWith.length > 0 && (
                                    <div className="mx-4 mb-3 flex items-start gap-2">
                                        <Share2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-gray-500">{rec.sharedWith.join(', ')}</p>
                                    </div>
                                )}

                                {/* Divider */}
                                <div className="h-px bg-gray-100 mx-4" />

                                {/* Actions */}
                                <div className="flex">
                                    {rec.status === 'local' && isOnline && (
                                        <button
                                            onClick={() => uploadRecord(rec.id)}
                                            className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                            <Upload className="w-3.5 h-3.5" /> Upload now
                                        </button>
                                    )}
                                    {rec.status === 'uploaded' && (
                                        <button
                                            onClick={() => shareRecord(rec.id)}
                                            className="flex-1 py-3 flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                            <Share2 className="w-3.5 h-3.5" /> Share access
                                        </button>
                                    )}
                                    <div className="w-px bg-gray-100" />
                                    <button
                                        onClick={() => deleteRecord(rec.id)}
                                        className="px-6 py-3 flex items-center gap-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {/* Legal notice */}
                <div className="flex items-start gap-3 px-1 pt-1">
                    <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Recording laws vary by jurisdiction. You are responsible for ensuring compliance with local recording consent laws. Evidence is captured for personal safety purposes only.
                    </p>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — SilentSOSOverlay
// ─────────────────────────────────────────────────────────────────────────────
export function SilentSOSOverlay({ onClose }: SilentSOSOverlayProps) {
    const [phase, setPhase] = useState<'countdown' | 'active' | 'dismissed' | 'recordings'>('countdown');
    const [countdown, setCountdown] = useState(5);
    const { socket } = useSocket();
    const { isRecording, startRecording, stopRecording } = useEvidenceRecorder();
    const positionRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });

    // Countdown
    useEffect(() => {
        if (phase !== 'countdown') return;
        if (countdown <= 0) { setPhase('active'); return; }
        const t = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [phase, countdown]);

    // Activate SOS + recording
    useEffect(() => {
        if (phase !== 'active') return;
        navigator.geolocation?.getCurrentPosition(
            pos => { positionRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
            () => { }
        );
        const sosData = { type: 'silent', timestamp: Date.now(), lat: positionRef.current.lat, lng: positionRef.current.lng };
        socket?.emit('sos:alert', sosData);
        fetch('/api/sos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sosData) }).catch(() => { });
        startRecording();
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleDismiss = useCallback(async () => {
        if (isRecording) await stopRecording(positionRef.current.lat, positionRef.current.lng);
        setPhase('dismissed');
        onClose();
    }, [isRecording, stopRecording, onClose]);

    const handleCancel = useCallback(() => {
        setPhase('dismissed');
        onClose();
    }, [onClose]);

    // ── Countdown screen ──────────────────────────────────────────────────────
    if (phase === 'countdown') {
        return (
            <div className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden pb-24">
                {/* Status Bar */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse block" />
                        <span className="text-xs font-medium text-gray-400 tracking-widest uppercase">Activating</span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">Silent Mode</div>
                </div>

                {/* Header */}
                <div className="px-5 pb-6">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0 mt-1">
                            <AlertTriangle className="w-7 h-7 text-amber-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight leading-none">Silent SOS</h1>
                            <p className="text-gray-400 text-sm mt-1">Activating in {countdown} seconds</p>
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-4">
                    {/* Countdown ring */}
                    <div className="rounded-2xl bg-white border border-gray-200 p-8 flex flex-col items-center gap-4">
                        <div className="relative w-28 h-28">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="44" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                                <circle
                                    cx="50" cy="50" r="44" fill="none"
                                    stroke="#f59e0b" strokeWidth="8"
                                    strokeDasharray={`${(countdown / 5) * 276.5} 276.5`}
                                    strokeLinecap="round"
                                    className="transition-all duration-1000"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-5xl font-black text-amber-500">{countdown}</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="font-bold text-gray-900">SOS activating…</p>
                            <p className="text-gray-500 text-sm mt-1 leading-relaxed">
                                A fake calculator will appear.<br />
                                <strong>Triple-tap the display</strong> to safely dismiss.
                            </p>
                        </div>
                    </div>

                    {/* What happens next */}
                    {[
                        { icon: '🚨', label: 'SOS sent to your emergency contacts with live location' },
                        { icon: '🎙️', label: 'Audio recording starts automatically and is encrypted' },
                        { icon: '🔒', label: 'Fake calculator screen hides the app from view' },
                    ].map((item, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="rounded-2xl bg-white border border-gray-200 px-4 py-3.5 flex items-center gap-4"
                        >
                            <span className="text-2xl flex-shrink-0">{item.icon}</span>
                            <p className="text-sm font-medium text-gray-700 flex-1">{item.label}</p>
                        </motion.div>
                    ))}

                    {/* Recording disclosure */}
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
                        <Mic className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-blue-800 leading-relaxed">
                            <strong>Recording disclosure:</strong> This app will record audio while Silent SOS is active. A discreet indicator is visible on your screen. Recordings are encrypted and stored privately.
                        </p>
                    </div>

                    {/* Cancel */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCancel}
                        className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-4 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors duration-150"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            <X className="w-5 h-5 text-gray-500" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm text-gray-800">Cancel</p>
                            <p className="text-gray-400 text-xs">No SOS will be sent</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </motion.button>

                    {/* View recordings */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPhase('recordings' as any)}
                        className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-3.5 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors duration-150"
                    >
                        <Shield className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <p className="text-sm font-semibold text-gray-600 flex-1">View past recordings</p>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </motion.button>
                </div>
            </div>
        );
    }

    // ── Active: show fake calculator ─────────────────────────────────────────
    if (phase === 'active') {
        return <FakeCalculatorScreen onSecretDismiss={handleDismiss} isRecording={isRecording} />;
    }

    // ── Recordings panel ─────────────────────────────────────────────────────
    if (phase === ('recordings' as any)) {
        return <RecordingsPanel onClose={() => setPhase('countdown')} />;
    }

    return null;
}
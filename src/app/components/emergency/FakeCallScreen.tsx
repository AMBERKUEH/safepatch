import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Phone, PhoneOff, Volume2, VolumeX, MessageSquare,
    ChevronRight, ArrowLeft, Plus, Check, Trash2,
    User, AlertTriangle, Clock, Edit3,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Caller {
    id: string;
    name: string;
    number: string;
    relation: string;
    emoji: string; // avatar fallback
}

interface FakeCallScreenProps {
    onClose: () => void;
    onSecretSOS?: () => void;
    initialCaller?: Caller;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESET CALLERS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CALLERS: Caller[] = [
    { id: 'c1', name: 'Mom', number: '+601112345678', relation: 'Mobile', emoji: '👩' },
    { id: 'c2', name: 'Dad', number: '+601198765432', relation: 'Mobile', emoji: '👨' },
    { id: 'c3', name: 'Sarah', number: '+601167890123', relation: 'Mobile', emoji: '👩‍🦱' },
    { id: 'c4', name: 'Work', number: '+60312345678', relation: 'Office', emoji: '🏢' },
    { id: 'c5', name: 'Dr. Rahman', number: '+601123456789', relation: 'Mobile', emoji: '👨‍⚕️' },
];

const DURATIONS = [
    { label: '15s', value: 15 },
    { label: '30s', value: 30 },
    { label: '1m', value: 60 },
    { label: '2m', value: 120 },
];

// ─────────────────────────────────────────────────────────────────────────────
// AUDIO HELPER — synthetic ringtone via Web Audio API
// ─────────────────────────────────────────────────────────────────────────────
function useRingtone(active: boolean) {
    const ctxRef = useRef<AudioContext | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!active) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            try { ctxRef.current?.close(); } catch { }
            ctxRef.current = null;
            return;
        }

        try {
            const ctx = new AudioContext();
            ctxRef.current = ctx;

            // iPhone-style dual-tone ring: 480Hz + 620Hz, 2s on / 4s off pattern
            let phase = false;
            const ring = () => {
                if (!ctx || ctx.state === 'closed') return;
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                const gain = ctx.createGain();
                osc1.frequency.value = 480;
                osc2.frequency.value = 620;
                osc1.connect(gain);
                osc2.connect(gain);
                gain.connect(ctx.destination);
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.8);
                osc1.start(ctx.currentTime);
                osc2.start(ctx.currentTime);
                osc1.stop(ctx.currentTime + 2);
                osc2.stop(ctx.currentTime + 2);
            };

            ring();
            intervalRef.current = setInterval(() => {
                phase = !phase;
                if (!phase) ring();
            }, phase ? 4000 : 2000);
        } catch { }

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            try { ctxRef.current?.close(); } catch { };
        };
    }, [active]);
}

// ─────────────────────────────────────────────────────────────────────────────
// AVATAR CIRCLE
// ─────────────────────────────────────────────────────────────────────────────
function CallerAvatar({
    caller,
    size = 'lg',
    pulsing = false,
    onTap,
}: {
    caller: Caller;
    size?: 'sm' | 'md' | 'lg';
    pulsing?: boolean;
    onTap?: () => void;
}) {
    const dim = size === 'lg' ? 'w-28 h-28' : size === 'md' ? 'w-14 h-14' : 'w-10 h-10';
    const textSize = size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-2xl' : 'text-base';

    return (
        <div className="relative" onClick={onTap}>
            {pulsing && (
                <>
                    <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '1.5s' }} />
                    <span className="absolute -inset-3 rounded-full bg-white/5 animate-ping" style={{ animationDuration: '2s', animationDelay: '0.3s' }} />
                </>
            )}
            <motion.div
                animate={pulsing ? { scale: [1, 1.06, 1] } : {}}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className={`${dim} rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center relative z-10 border border-white/20`}
            >
                <span className={textSize}>{caller.emoji}</span>
            </motion.div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CALL SCREEN — the actual fake incoming call UI
// ─────────────────────────────────────────────────────────────────────────────
function CallScreen({
    caller,
    autoDismissSeconds,
    ringEnabled,
    onClose,
    onSecretSOS,
}: {
    caller: Caller;
    autoDismissSeconds: number;
    ringEnabled: boolean;
    onClose: () => void;
    onSecretSOS?: () => void;
}) {
    const [state, setState] = useState<'ringing' | 'connected' | 'ended'>('ringing');
    const [elapsed, setElapsed] = useState(0);
    const [muted, setMuted] = useState(false);
    const [sosSent, setSosSent] = useState(false);

    // Secret SOS: triple-tap avatar
    const tapCount = useRef(0);
    const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useRingtone(state === 'ringing' && ringEnabled);

    // Auto-dismiss while ringing
    useEffect(() => {
        if (state !== 'ringing') return;
        const t = setTimeout(() => {
            setState('ended');
            setTimeout(onClose, 1200);
        }, autoDismissSeconds * 1000);
        return () => clearTimeout(t);
    }, [state, autoDismissSeconds, onClose]);

    // Call timer
    useEffect(() => {
        if (state !== 'connected') return;
        const id = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(id);
    }, [state]);

    const fmt = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    const accept = () => setState('connected');
    const decline = () => { setState('ended'); setTimeout(onClose, 900); };
    const hangup = () => { setState('ended'); setTimeout(onClose, 900); };

    const handleSecretTap = useCallback(() => {
        tapCount.current += 1;
        if (tapTimer.current) clearTimeout(tapTimer.current);
        tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 800);
        if (tapCount.current >= 3 && onSecretSOS && !sosSent) {
            tapCount.current = 0;
            setSosSent(true);
            onSecretSOS();
        }
    }, [onSecretSOS, sosSent]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-between overflow-hidden"
            style={{
                background: 'linear-gradient(175deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%)',
            }}
        >
            {/* Soft radial glow behind avatar */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 60% 45% at 50% 38%, rgba(99,179,255,0.12) 0%, transparent 70%)',
                }}
            />

            {/* Status row */}
            <div className="w-full px-6 pt-12 text-center z-10">
                <AnimatePresence mode="wait">
                    {state === 'ringing' && (
                        <motion.div key="ring-label"
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                        >
                            <motion.p
                                animate={{ opacity: [0.6, 1, 0.6] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-xs font-bold text-green-400 tracking-[0.25em] uppercase mb-1"
                            >
                                Incoming Call
                            </motion.p>
                        </motion.div>
                    )}
                    {state === 'connected' && (
                        <motion.p key="timer"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm font-mono text-green-400 tracking-widest"
                        >
                            {fmt(elapsed)}
                        </motion.p>
                    )}
                    {state === 'ended' && (
                        <motion.p key="ended"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-red-400 tracking-widest font-medium"
                        >
                            Call Ended
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Caller info */}
            <div className="flex flex-col items-center z-10 -mt-8">
                <CallerAvatar
                    caller={caller}
                    size="lg"
                    pulsing={state === 'ringing'}
                    onTap={handleSecretTap}
                />
                <h1 className="text-3xl font-black text-white mt-6 mb-1 tracking-tight">{caller.name}</h1>
                <p className="text-white/50 text-sm">{caller.number}</p>
                <p className="text-white/35 text-xs mt-0.5">{caller.relation}</p>

                {/* Secret SOS confirmation — subtle */}
                <AnimatePresence>
                    {sosSent && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="mt-4 flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-xl px-4 py-2"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            <p className="text-xs text-red-300 font-medium">SOS activated silently</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="w-full px-10 pb-16 z-10">
                <AnimatePresence mode="wait">

                    {/* RINGING STATE */}
                    {state === 'ringing' && (
                        <motion.div
                            key="ringing"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 12 }}
                            className="flex items-end justify-between"
                        >
                            {/* Decline */}
                            <div className="flex flex-col items-center gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={decline}
                                    className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg"
                                    style={{ boxShadow: '0 4px 24px rgba(239,68,68,0.45)' }}
                                >
                                    <PhoneOff className="w-7 h-7 text-white" />
                                </motion.button>
                                <p className="text-white/50 text-xs">Decline</p>
                            </div>

                            {/* Message (decoy action) */}
                            <div className="flex flex-col items-center gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={decline}
                                    className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center"
                                >
                                    <MessageSquare className="w-5 h-5 text-white/70" />
                                </motion.button>
                                <p className="text-white/40 text-xs">Message</p>
                            </div>

                            {/* Accept */}
                            <div className="flex flex-col items-center gap-2">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    animate={{ scale: [1, 1.12, 1] }}
                                    transition={{ duration: 1.2, repeat: Infinity }}
                                    onClick={accept}
                                    className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
                                    style={{ boxShadow: '0 4px 24px rgba(34,197,94,0.45)' }}
                                >
                                    <Phone className="w-7 h-7 text-white" />
                                </motion.button>
                                <p className="text-white/50 text-xs">Accept</p>
                            </div>
                        </motion.div>
                    )}

                    {/* CONNECTED STATE */}
                    {state === 'connected' && (
                        <motion.div
                            key="connected"
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-6"
                        >
                            {/* Secondary controls */}
                            <div className="flex justify-center gap-8">
                                <div className="flex flex-col items-center gap-2">
                                    <button
                                        onClick={() => setMuted(m => !m)}
                                        className={`w-14 h-14 rounded-full flex items-center justify-center border transition-colors ${muted ? 'bg-white/20 border-white/30' : 'bg-white/10 border-white/15'
                                            }`}
                                    >
                                        {muted
                                            ? <VolumeX className="w-5 h-5 text-white" />
                                            : <Volume2 className="w-5 h-5 text-white/70" />
                                        }
                                    </button>
                                    <p className="text-white/40 text-xs">{muted ? 'Unmute' : 'Mute'}</p>
                                </div>
                            </div>

                            {/* Hang up */}
                            <div className="flex justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <motion.button
                                        whileTap={{ scale: 0.9 }}
                                        onClick={hangup}
                                        className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center"
                                        style={{ boxShadow: '0 4px 24px rgba(239,68,68,0.45)' }}
                                    >
                                        <PhoneOff className="w-7 h-7 text-white" />
                                    </motion.button>
                                    <p className="text-white/50 text-xs">End Call</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// SETUP SCREEN — caller picker + options, matches EmergencyPage light theme
// ─────────────────────────────────────────────────────────────────────────────
export function FakeCallScreen({ onClose, onSecretSOS, initialCaller }: FakeCallScreenProps) {
    const [view, setView] = useState<'setup' | 'call'>('setup');
    const [callers, setCallers] = useState<Caller[]>(DEFAULT_CALLERS);
    const [selected, setSelected] = useState<Caller>(initialCaller ?? DEFAULT_CALLERS[0]);
    const [autoDismiss, setAutoDismiss] = useState(30);
    const [ringEnabled, setRingEnabled] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newNumber, setNewNumber] = useState('');
    const [newEmoji, setNewEmoji] = useState('👤');
    const [delay, setDelay] = useState(0); // seconds before call appears
    const [delayCountdown, setDelayCountdown] = useState<number | null>(null);

    // Delayed call launch
    const startCall = useCallback(() => {
        if (delay === 0) {
            setView('call');
            return;
        }
        setDelayCountdown(delay);
    }, [delay]);

    useEffect(() => {
        if (delayCountdown === null) return;
        if (delayCountdown <= 0) {
            setDelayCountdown(null);
            setView('call');
            return;
        }
        const t = setTimeout(() => setDelayCountdown(c => (c ?? 1) - 1), 1000);
        return () => clearTimeout(t);
    }, [delayCountdown]);

    const addCaller = useCallback(() => {
        if (!newName.trim() || !newNumber.trim()) return;
        const c: Caller = {
            id: `custom_${Date.now()}`,
            name: newName.trim(),
            number: newNumber.trim(),
            relation: 'Mobile',
            emoji: newEmoji,
        };
        setCallers(prev => [...prev, c]);
        setSelected(c);
        setNewName('');
        setNewNumber('');
        setNewEmoji('👤');
        setShowAddForm(false);
    }, [newName, newNumber, newEmoji]);

    const deleteCaller = useCallback((id: string) => {
        setCallers(prev => {
            const next = prev.filter(c => c.id !== id);
            if (selected.id === id) setSelected(next[0]);
            return next;
        });
    }, [selected]);

    // ── ACTIVE CALL ──────────────────────────────────────────────────────────
    if (view === 'call') {
        return (
            <CallScreen
                caller={selected}
                autoDismissSeconds={autoDismiss}
                ringEnabled={ringEnabled}
                onClose={onClose}
                onSecretSOS={onSecretSOS}
            />
        );
    }

    // ── DELAY COUNTDOWN ──────────────────────────────────────────────────────
    if (delayCountdown !== null) {
        return (
            <div className="min-h-full bg-gray-50 flex flex-col items-center justify-center text-center px-8">
                <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-28 h-28 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-6 shadow-sm"
                >
                    <span className="text-5xl font-black text-gray-800">{delayCountdown}</span>
                </motion.div>
                <p className="text-lg font-black text-gray-900">Call arriving in…</p>
                <p className="text-gray-400 text-sm mt-1">{selected.name} will call you shortly</p>
                <button
                    onClick={() => setDelayCountdown(null)}
                    className="mt-8 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                    Cancel
                </button>
            </div>
        );
    }

    // ── SETUP VIEW ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden pb-24">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />
                    <span className="text-xs font-medium text-gray-400 tracking-widest uppercase">Fake Call</span>
                </div>
                <div className="text-xs text-gray-400 font-mono">Setup</div>
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
                        <h1 className="text-3xl font-black tracking-tight leading-none">Fake Call</h1>
                        <p className="text-gray-400 text-sm mt-1">Simulate an incoming call to exit a situation</p>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-4">
                {/* How it works */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
                    <Phone className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs font-medium text-blue-800 leading-relaxed">
                        Simulates a realistic incoming call. <strong>Triple-tap the caller photo</strong> during the call to silently trigger SOS if needed.
                    </p>
                </div>

                {/* ── CALLER SELECTION ── */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Caller</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Preview of selected */}
                    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 flex items-center gap-4 mb-3">
                        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-3xl flex-shrink-0">
                            {selected.emoji}
                        </div>
                        <div className="flex-1">
                            <p className="font-black text-lg text-gray-900 leading-tight">{selected.name}</p>
                            <p className="text-gray-400 text-xs">{selected.number} · {selected.relation}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    </div>

                    {/* Caller list */}
                    <div className="space-y-2">
                        {callers.map((caller, i) => {
                            const isSelected = selected.id === caller.id;
                            return (
                                <motion.div
                                    key={caller.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.03 }}
                                    className={`rounded-2xl border px-4 py-3 flex items-center gap-3 transition-colors duration-150 ${isSelected
                                            ? 'bg-blue-50 border-blue-300'
                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <button
                                        className="flex items-center gap-3 flex-1 text-left"
                                        onClick={() => setSelected(caller)}
                                    >
                                        <span className="text-2xl">{caller.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{caller.name}</p>
                                            <p className="text-xs text-gray-400">{caller.number}</p>
                                        </div>
                                        {isSelected && (
                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </button>
                                    {/* Delete (only custom contacts or if > 1 left) */}
                                    {callers.length > 1 && (
                                        <button
                                            onClick={() => deleteCaller(caller.id)}
                                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors flex-shrink-0"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-gray-300 hover:text-red-400 transition-colors" />
                                        </button>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Add custom caller */}
                    <AnimatePresence>
                        {showAddForm ? (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 rounded-2xl bg-white border border-gray-200 p-4 space-y-3 overflow-hidden"
                            >
                                <p className="text-xs font-bold text-gray-700 tracking-wide uppercase">Custom Caller</p>
                                {/* Emoji picker row */}
                                <div>
                                    <p className="text-xs text-gray-400 mb-2">Avatar emoji</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {['👩', '👨', '👧', '👦', '👩‍🦱', '👨‍🦳', '🧑', '👩‍⚕️', '🏢', '👮', '🤝'].map(e => (
                                            <button
                                                key={e}
                                                onClick={() => setNewEmoji(e)}
                                                className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-colors ${newEmoji === e ? 'bg-blue-100 border border-blue-300' : 'bg-gray-100 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {e}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Caller name"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                                />
                                <input
                                    type="tel"
                                    placeholder="Phone number"
                                    value={newNumber}
                                    onChange={e => setNewNumber(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addCaller()}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setShowAddForm(false)}
                                        className="py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
                                    >Cancel</button>
                                    <button
                                        onClick={addCaller}
                                        disabled={!newName.trim() || !newNumber.trim()}
                                        className="py-3 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-40"
                                    >Add Caller</button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowAddForm(true)}
                                className="mt-2 w-full rounded-2xl bg-white border border-dashed border-gray-300 px-4 py-3.5 flex items-center gap-3 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors duration-150"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Plus className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-500">Add custom caller</p>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* ── DURATION ── */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Auto-dismiss After</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {DURATIONS.map(d => (
                            <motion.button
                                key={d.value}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setAutoDismiss(d.value)}
                                className={`rounded-2xl border py-3.5 text-sm font-bold transition-colors duration-150 ${autoDismiss === d.value
                                        ? 'bg-blue-500 border-blue-500 text-white'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                            >
                                {d.label}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* ── DELAY BEFORE CALL ── */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Call Delay</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {[{ label: 'Now', value: 0 }, { label: '5s', value: 5 }, { label: '10s', value: 10 }, { label: '30s', value: 30 }].map(d => (
                            <motion.button
                                key={d.value}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDelay(d.value)}
                                className={`rounded-2xl border py-3.5 text-sm font-bold transition-colors duration-150 ${delay === d.value
                                        ? 'bg-violet-500 border-violet-500 text-white'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-violet-300 hover:bg-violet-50'
                                    }`}
                            >
                                {d.label}
                            </motion.button>
                        ))}
                    </div>
                    {delay > 0 && (
                        <p className="text-xs text-gray-400 mt-2 text-center">
                            Put your phone away — the call will arrive in {delay}s
                        </p>
                    )}
                </div>

                {/* ── TOGGLES ── */}
                <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                    {/* Ring sound */}
                    <div className="px-4 py-4 flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                            {ringEnabled ? <Volume2 className="w-4 h-4 text-gray-600" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">Ringing Sound</p>
                            <p className="text-xs text-gray-400">Play synthetic ringtone</p>
                        </div>
                        <button
                            onClick={() => setRingEnabled(r => !r)}
                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${ringEnabled ? 'bg-blue-500' : 'bg-gray-200'}`}
                        >
                            <motion.div
                                animate={{ x: ringEnabled ? 24 : 2 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                            />
                        </button>
                    </div>

                    <div className="h-px bg-gray-100 mx-4" />

                    {/* SOS integration note */}
                    <div className="px-4 py-3 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            <strong className="text-gray-700">Secret SOS:</strong> Triple-tap the caller avatar during the call to silently trigger SOS without revealing it.
                        </p>
                    </div>
                </div>

                {/* ── TRIGGER BUTTON ── */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={startCall}
                    className="w-full rounded-3xl p-5 flex items-center justify-between text-white"
                    style={{
                        background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                        boxShadow: '0 4px 24px rgba(124,58,237,0.35)',
                    }}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                            <Phone className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-xl leading-none">
                                {delay > 0 ? `Call in ${delay}s` : 'Trigger Fake Call'}
                            </p>
                            <p className="text-violet-200 text-sm mt-1">
                                {selected.name} · {autoDismiss}s duration
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-violet-200 flex-shrink-0" />
                </motion.button>

                {/* Safety tip */}
                <div className="flex items-start gap-3 px-1 pt-1">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Stay calm, assess the situation, and prioritize your safety. Help is always available.
                    </p>
                </div>
            </div>
        </div>
    );
}
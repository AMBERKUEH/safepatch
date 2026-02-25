import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    ArrowLeft, MapPin, Clock, Users, Shield, AlertTriangle,
    Play, Square, Plus, X, ChevronRight, CheckCircle,
    Phone, UserCircle, Wifi, WifiOff, Navigation, Bell,
} from 'lucide-react';
import { useSafeWalk } from '../../hooks/useSafeWalk';
import { useSocket } from '../../hooks/useSocket';

interface SafeWalkPanelProps {
    onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface Contact {
    id: string;
    name: string;
    phone: string;
    avatar?: string; // initials fallback
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Preset contacts (in production: pull from device contacts / backend)
const PRESET_CONTACTS: Contact[] = [
    { id: 'c1', name: 'Sarah (Sister)', phone: '+601112345678' },
    { id: 'c2', name: 'Dad', phone: '+601198765432' },
    { id: 'c3', name: 'Amir (Friend)', phone: '+601167890123' },
];

const DURATION_OPTIONS = [
    { label: '15m', value: 15 },
    { label: '30m', value: 30 },
    { label: '1h', value: 60 },
    { label: '2h', value: 120 },
];

// ─────────────────────────────────────────────────────────────────────────────
// CONTACT AVATAR
// ─────────────────────────────────────────────────────────────────────────────
function ContactAvatar({ contact, size = 'md' }: { contact: Contact; size?: 'sm' | 'md' }) {
    const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
    const colors = ['bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-green-100 text-green-700', 'bg-rose-100 text-rose-700'];
    const color = colors[contact.id.charCodeAt(1) % colors.length];
    return (
        <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold flex-shrink-0`}>
            {getInitials(contact.name)}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVE SESSION STATUS CARD — exported so EmergencyPage can embed it
// ─────────────────────────────────────────────────────────────────────────────
export function SafeWalkStatusCard({
    timeRemaining,
    duration,
    status,
    contacts,
    onOpen,
    onStop,
}: {
    timeRemaining: number;
    duration: number;
    status: 'active' | 'alert';
    contacts: Contact[];
    onOpen: () => void;
    onStop: () => void;
}) {
    const progress = (timeRemaining / (duration * 60)) * 100;
    const isAlert = status === 'alert';

    return (
        <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border overflow-hidden ${isAlert ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'}`}
        >
            {/* Alert banner */}
            {isAlert && (
                <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="bg-red-500 px-4 py-2 flex items-center gap-2"
                >
                    <AlertTriangle className="w-4 h-4 text-white flex-shrink-0" />
                    <p className="text-xs font-bold text-white">No movement detected — Alert sent to contacts!</p>
                </motion.div>
            )}

            <div className="px-4 py-3">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full animate-pulse ${isAlert ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <p className={`text-xs font-bold tracking-widest uppercase ${isAlert ? 'text-red-600' : 'text-blue-600'}`}>
                            Safe Walk {isAlert ? '· ALERT' : 'Active'}
                        </p>
                    </div>
                    <button onClick={onOpen} className={`text-xs font-semibold ${isAlert ? 'text-red-600' : 'text-blue-600'}`}>
                        Details →
                    </button>
                </div>

                {/* Timer + progress */}
                <div className="flex items-center gap-3 mb-2">
                    <p className={`text-3xl font-black font-mono ${isAlert ? 'text-red-700' : 'text-blue-900'}`}>
                        {formatTime(timeRemaining)}
                    </p>
                    <div className="flex-1 flex flex-col gap-1.5">
                        <div className="w-full h-2 bg-white/70 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full rounded-full ${isAlert ? 'bg-red-400' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <p className={`text-xs ${isAlert ? 'text-red-500' : 'text-blue-500'}`}>
                            {contacts.length} guardian{contacts.length !== 1 ? 's' : ''} watching
                        </p>
                    </div>
                </div>

                {/* Contact avatars row */}
                <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                        {contacts.slice(0, 4).map(c => (
                            <ContactAvatar key={c.id} contact={c} size="sm" />
                        ))}
                        {contacts.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-xs text-gray-500 font-bold">
                                +{contacts.length - 4}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onStop}
                        className="px-4 py-1.5 rounded-xl bg-white border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors"
                    >
                        Stop
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PANEL
// ─────────────────────────────────────────────────────────────────────────────
export function SafeWalkPanel({ onClose }: SafeWalkPanelProps) {
    const { socket } = useSocket();
    const { session, startSession, stopSession } = useSafeWalk(socket);

    // Contact selection
    const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
    const [customName, setCustomName] = useState('');
    const [customPhone, setCustomPhone] = useState('');
    const [showCustomForm, setShowCustomForm] = useState(false);
    const [duration, setDuration] = useState(30);
    const [isOnline] = useState(navigator.onLine);

    const toggleContact = useCallback((contact: Contact) => {
        setSelectedContacts(prev =>
            prev.find(c => c.id === contact.id)
                ? prev.filter(c => c.id !== contact.id)
                : [...prev, contact]
        );
    }, []);

    const addCustomContact = useCallback(() => {
        if (!customName.trim() || !customPhone.trim()) return;
        const newContact: Contact = {
            id: `custom_${Date.now()}`,
            name: customName.trim(),
            phone: customPhone.trim(),
        };
        setSelectedContacts(prev => [...prev, newContact]);
        setCustomName('');
        setCustomPhone('');
        setShowCustomForm(false);
    }, [customName, customPhone]);

    const removeSelected = useCallback((id: string) => {
        setSelectedContacts(prev => prev.filter(c => c.id !== id));
    }, []);

    const handleStart = useCallback(() => {
        if (selectedContacts.length === 0) return;
        startSession(selectedContacts.map(c => c.name), duration);
    }, [selectedContacts, duration, startSession]);

    // ── ACTIVE SESSION VIEW ───────────────────────────────────────────────────
    if (session.status === 'active' || session.status === 'alert') {
        const isAlert = session.status === 'alert';
        const progress = (session.timeRemaining / (session.duration * 60)) * 100;
        const activeContacts: Contact[] = selectedContacts.length > 0
            ? selectedContacts
            : PRESET_CONTACTS.slice(0, 2); // fallback for demo

        return (
            <div className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden pb-24">
                {/* Status Bar */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full animate-pulse block ${isAlert ? 'bg-red-500' : 'bg-blue-500'}`} />
                        <span className="text-xs font-medium text-gray-400 tracking-widest uppercase">
                            Safe Walk {isAlert ? '· Alert' : 'Active'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400">
                        {isOnline ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-amber-500" />}
                        {isOnline ? 'Tracking' : 'Offline'}
                    </div>
                </div>

                {/* Hero Header */}
                <div className="px-5 pb-6">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-1 hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight leading-none">Safe Walk</h1>
                            <p className="text-gray-400 text-sm mt-1">
                                {activeContacts.length} guardian{activeContacts.length !== 1 ? 's' : ''} watching your route
                            </p>
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-4">
                    {/* Alert banner */}
                    <AnimatePresence>
                        {isAlert && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full rounded-2xl bg-red-500 p-5 flex items-center gap-4"
                                style={{ boxShadow: '0 0 30px rgba(239,68,68,0.3)' }}
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <AlertTriangle className="w-8 h-8 text-white" />
                                </motion.div>
                                <div>
                                    <p className="font-black text-white text-lg leading-none">No Movement Detected</p>
                                    <p className="text-red-100 text-sm mt-1">Emergency alert sent to all guardians</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Timer card */}
                    <div className="rounded-2xl bg-white border border-gray-200 p-6 text-center">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold mb-3">Time Remaining</p>
                        <p className={`text-6xl font-black font-mono tracking-tight ${isAlert ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatTime(session.timeRemaining)}
                        </p>
                        <div className="mt-5 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className={`h-full rounded-full transition-all duration-1000 ${isAlert ? 'bg-red-400' : 'bg-blue-500'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{Math.round(progress)}% remaining</p>
                    </div>

                    {/* Live GPS */}
                    <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3.5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0">
                            <Navigation className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-gray-400 font-medium">Live Location</p>
                            <p className="text-sm font-mono text-gray-800">
                                {session.lastLat
                                    ? `${session.lastLat.toFixed(5)}, ${session.lastLng?.toFixed(5)}`
                                    : 'Acquiring GPS…'}
                            </p>
                        </div>
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Guardians</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Active guardian cards */}
                    {activeContacts.map((contact, i) => (
                        <motion.div
                            key={contact.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="rounded-2xl bg-white border border-gray-200 px-4 py-3.5 flex items-center gap-4"
                        >
                            <ContactAvatar contact={contact} />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm text-gray-900">{contact.name}</p>
                                <p className="text-gray-400 text-xs">{contact.phone}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                <span className="text-xs text-green-600 font-medium">Notified</span>
                            </div>
                        </motion.div>
                    ))}

                    {/* What guardians see */}
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 flex items-start gap-3">
                        <Bell className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-medium text-blue-800 leading-relaxed">
                            Your guardians received a live tracking link. They can see your GPS location updating in real-time and will be alerted automatically if you stop moving for 60 seconds.
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Controls</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Stop button — styled like SOS CTA */}
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={stopSession}
                        className="w-full rounded-3xl p-5 flex items-center justify-between text-white"
                        style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 24px rgba(239,68,68,0.3)' }}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                                <Square className="w-6 h-6" />
                            </div>
                            <div className="text-left">
                                <p className="font-black text-xl leading-none">Stop Safe Walk</p>
                                <p className="text-red-100 text-sm mt-1">Notify guardians you've arrived safely</p>
                            </div>
                        </div>
                        <ChevronRight className="w-6 h-6 text-red-200 flex-shrink-0" />
                    </motion.button>

                    {/* Safety tip */}
                    <div className="flex items-start gap-3 px-1 pt-1">
                        <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            If you stop moving for 60 seconds, an emergency alert and your live tracking link will be sent to all guardians automatically.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── SETUP VIEW ────────────────────────────────────────────────────────────
    return (
        <div className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden pb-24">
            {/* Status Bar */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />
                    <span className="text-xs font-medium text-gray-400 tracking-widest uppercase">Safe Walk</span>
                </div>
                <div className="text-xs text-gray-400 font-mono">Setup</div>
            </div>

            {/* Hero Header */}
            <div className="px-5 pb-6">
                <div className="flex items-start gap-4">
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 mt-1 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black tracking-tight leading-none">Safe Walk</h1>
                        <p className="text-gray-400 text-sm mt-1">Select guardians and set your duration</p>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-4">
                {/* How it works */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold text-sm text-blue-900">Live guardian tracking</p>
                        <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                            Your trusted contacts receive a live tracking link. If you stop moving for 60 seconds, an emergency alert is sent automatically.
                        </p>
                    </div>
                </div>

                {/* ── TRUSTED CONTACTS SECTION ── */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Trusted Contacts</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Preset contact options */}
                    <div className="space-y-2">
                        {PRESET_CONTACTS.map((contact, i) => {
                            const isSelected = !!selectedContacts.find(c => c.id === contact.id);
                            return (
                                <motion.button
                                    key={contact.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => toggleContact(contact)}
                                    className={`w-full rounded-2xl border px-4 py-3.5 flex items-center gap-4 text-left transition-colors duration-150 ${isSelected
                                            ? 'bg-blue-50 border-blue-300'
                                            : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <ContactAvatar contact={contact} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>{contact.name}</p>
                                        <p className="text-gray-400 text-xs">{contact.phone}</p>
                                    </div>
                                    {/* Checkbox */}
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                        }`}>
                                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>

                    {/* Add custom contact */}
                    <AnimatePresence>
                        {showCustomForm ? (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 rounded-2xl bg-white border border-gray-200 p-4 space-y-3 overflow-hidden"
                            >
                                <p className="text-xs font-bold text-gray-700 tracking-wide uppercase">Add Custom Contact</p>
                                <input
                                    type="text"
                                    placeholder="Full name"
                                    value={customName}
                                    onChange={e => setCustomName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                                />
                                <input
                                    type="tel"
                                    placeholder="Phone number (e.g. +601112345678)"
                                    value={customPhone}
                                    onChange={e => setCustomPhone(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addCustomContact()}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-gray-50"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setShowCustomForm(false)}
                                        className="py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={addCustomContact}
                                        disabled={!customName.trim() || !customPhone.trim()}
                                        className="py-3 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 transition-colors disabled:opacity-40"
                                    >
                                        Add Contact
                                    </button>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.button
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setShowCustomForm(true)}
                                className="mt-2 w-full rounded-2xl bg-white border border-dashed border-gray-300 px-4 py-3.5 flex items-center gap-3 text-left hover:border-blue-300 hover:bg-blue-50/50 transition-colors duration-150"
                            >
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                    <Plus className="w-5 h-5 text-gray-400" />
                                </div>
                                <p className="text-sm font-semibold text-gray-500">Add a different contact</p>
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Selected contacts summary */}
                <AnimatePresence>
                    {selectedContacts.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="rounded-2xl bg-white border border-gray-200 px-4 py-4"
                        >
                            <div className="flex items-center gap-2 mb-3">
                                <Users className="w-4 h-4 text-blue-600" />
                                <p className="text-sm font-bold text-gray-900">
                                    {selectedContacts.length} Guardian{selectedContacts.length !== 1 ? 's' : ''} Selected
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedContacts.map(c => (
                                    <div key={c.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-1.5">
                                        <span className="text-xs font-semibold text-blue-800">{c.name}</span>
                                        <button onClick={() => removeSelected(c.id)}>
                                            <X className="w-3 h-3 text-blue-400 hover:text-red-500 transition-colors" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── DURATION SECTION ── */}
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Session Duration</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        {DURATION_OPTIONS.map(opt => (
                            <motion.button
                                key={opt.value}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setDuration(opt.value)}
                                className={`rounded-2xl border py-3.5 text-sm font-bold transition-colors duration-150 ${duration === opt.value
                                        ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                        : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                            >
                                {opt.label}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* ── WHAT CONTACTS RECEIVE ── */}
                <div className="rounded-2xl bg-white border border-gray-200 px-4 py-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">What your guardians receive</p>
                    {[
                        { icon: '📍', text: 'Live GPS tracking link, updated every 10 seconds' },
                        { icon: '⏱️', text: `Automatic alert if you stop moving for 60 seconds` },
                        { icon: '🔔', text: 'SMS/push notification when Safe Walk ends or alerts' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <span className="text-base flex-shrink-0">{item.icon}</span>
                            <p className="text-xs text-gray-600 leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>

                {/* ── START BUTTON ── */}
                <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleStart}
                    disabled={selectedContacts.length === 0}
                    className={`w-full rounded-3xl p-5 flex items-center justify-between text-white transition-all ${selectedContacts.length === 0
                            ? 'opacity-40 cursor-not-allowed bg-gray-400'
                            : ''
                        }`}
                    style={selectedContacts.length > 0 ? {
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        boxShadow: '0 4px 24px rgba(59,130,246,0.35)',
                    } : {}}
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                            <Play className="w-6 h-6" />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-xl leading-none">Start Safe Walk</p>
                            <p className="text-blue-100 text-sm mt-1">
                                {selectedContacts.length === 0
                                    ? 'Select at least one guardian'
                                    : `${selectedContacts.length} guardian${selectedContacts.length !== 1 ? 's' : ''} · ${duration} min`}
                            </p>
                        </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-blue-200 flex-shrink-0" />
                </motion.button>

                {/* Safety note */}
                <div className="flex items-start gap-3 px-1 pt-1">
                    <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Stay calm, assess the situation, and prioritize your safety. Help is always available.
                    </p>
                </div>
            </div>
        </div>
    );
}
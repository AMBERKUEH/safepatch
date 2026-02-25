import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
    ArrowLeft, Phone, CheckCircle, ChevronRight,
    Volume2, VolumeX, AlertTriangle, Play, Square,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface QuestionNode {
    q: string;
    yes: string;
    no: string;
    final?: undefined;
    steps?: undefined;
    isCPR?: undefined;
}

interface FinalNode {
    final: true;
    steps: string[];
    isCPR?: boolean;
    q?: undefined;
    yes?: undefined;
    no?: undefined;
}

type TreeNode = QuestionNode | FinalNode;

interface EmergencyConfig {
    label: string;
    icon: string;
    color: string;
    lightBg: string;
    lightBorder: string;
    lightText: string;
    warning: string;
    nodes: Record<string, TreeNode>;
}

// ─────────────────────────────────────────────────────────────────────────────
// DECISION TREE — fully offline
// ─────────────────────────────────────────────────────────────────────────────
const TREE: Record<string, EmergencyConfig> = {
    choking: {
        label: "Choking",
        icon: "🫁",
        color: "#ef4444",
        lightBg: "bg-red-50",
        lightBorder: "border-red-200",
        lightText: "text-red-700",
        warning: "Do NOT do a blind finger sweep — this can push the object deeper.",
        nodes: {
            start: { q: "Can the person cough or speak?", yes: "mild", no: "conscious_check" },
            mild: {
                final: true,
                steps: [
                    "Encourage them to keep coughing strongly.",
                    "Stay close and watch carefully.",
                    "Do NOT slap their back if they can still cough.",
                    "If coughing weakens or stops — call 911 immediately.",
                ],
            },
            conscious_check: { q: "Is the person still conscious?", yes: "heimlich", no: "cpr_choking" },
            heimlich: {
                final: true,
                steps: [
                    "Tell someone to call 911 NOW.",
                    "Stand behind the person, one foot forward for balance.",
                    "Make a fist — place thumb side just above their navel.",
                    "Grasp your fist with your other hand.",
                    "Thrust sharply inward and upward — hard and fast.",
                    "Repeat until the object is expelled or they lose consciousness.",
                    "If unconscious: lower to floor and start CPR.",
                ],
            },
            cpr_choking: {
                final: true,
                steps: [
                    "Call 911 immediately.",
                    "Lower the person carefully to the floor.",
                    "Start 30 chest compressions.",
                    "Before each rescue breath, look in mouth — remove object ONLY if visible.",
                    "Give 2 rescue breaths if trained.",
                    "Continue 30:2 until help arrives or object is expelled.",
                ],
            },
        },
    },

    bleeding: {
        label: "Heavy Bleeding",
        icon: "🩸",
        color: "#b91c1c",
        lightBg: "bg-red-50",
        lightBorder: "border-red-200",
        lightText: "text-red-700",
        warning: "Never remove a deeply embedded object from a wound.",
        nodes: {
            start: { q: "Is there an object embedded in the wound?", yes: "embedded", no: "pressure_check" },
            embedded: {
                final: true,
                steps: [
                    "Do NOT remove the object — it is helping control bleeding.",
                    "Build padding AROUND the object to support it.",
                    "Call 911 immediately.",
                    "Keep the person still and calm.",
                    "Watch for shock: pale skin, rapid weak pulse, confusion.",
                ],
            },
            pressure_check: { q: "Can you see the wound clearly (no major debris)?", yes: "direct_pressure", no: "cover_call" },
            cover_call: {
                final: true,
                steps: [
                    "Call 911 immediately.",
                    "Cover the wound with the cleanest material available.",
                    "Apply firm, steady pressure — do NOT remove cloth.",
                    "Elevate the limb above heart level if possible.",
                    "Maintain pressure until help arrives.",
                ],
            },
            direct_pressure: {
                final: true,
                steps: [
                    "Use gloves if available to protect yourself.",
                    "Press a clean cloth or dressing firmly on the wound.",
                    "Apply constant hard pressure for at least 10 minutes.",
                    "Do NOT lift the cloth — add more layers if blood soaks through.",
                    "Elevate the injured limb above heart level.",
                    "Apply tourniquet 2–3 inches ABOVE the wound ONLY if bleeding is uncontrollable.",
                    "Call 911 — severe bleeding is always an emergency.",
                ],
            },
        },
    },

    burn: {
        label: "Burn",
        icon: "🔥",
        color: "#ea580c",
        lightBg: "bg-orange-50",
        lightBorder: "border-orange-200",
        lightText: "text-orange-700",
        warning: "Never use ice, butter, or toothpaste on any burn.",
        nodes: {
            start: { q: "Is the skin charred, white, or leathery with no pain felt?", yes: "third_degree", no: "blister_check" },
            third_degree: {
                final: true,
                steps: [
                    "Call 911 immediately — this is a severe burn.",
                    "Do NOT run water over it.",
                    "Do NOT remove clothing stuck to the burn.",
                    "Cover loosely with a clean, dry bandage or cloth.",
                    "Elevate the burned area above heart level.",
                    "Watch for shock: pale skin, fast breathing, weakness.",
                    "No creams, ointments, or ice under any circumstances.",
                ],
            },
            blister_check: { q: "Are there blisters or is the skin wet or moist?", yes: "second_degree", no: "first_degree" },
            first_degree: {
                final: true,
                steps: [
                    "Cool under running cool water for 10–20 minutes.",
                    "Apply aloe vera or a soothing burn gel.",
                    "Cover loosely with a sterile bandage.",
                    "Take over-the-counter pain relief if needed.",
                    "Keep out of sun until fully healed.",
                ],
            },
            second_degree: {
                final: true,
                steps: [
                    "Cool under running cool water for 10–20 minutes.",
                    "Do NOT pop or drain blisters — they prevent infection.",
                    "Cover loosely with a sterile, non-stick bandage.",
                    "No ice, butter, or toothpaste.",
                    "If burn is larger than your palm — seek emergency care.",
                    "Burns on face, hands, feet, or joints: call 911.",
                ],
            },
        },
    },

    fracture: {
        label: "Fracture",
        icon: "🦴",
        color: "#475569",
        lightBg: "bg-slate-50",
        lightBorder: "border-slate-200",
        lightText: "text-slate-600",
        warning: "Never try to straighten or realign a broken bone.",
        nodes: {
            start: { q: "Is bone visible through the skin (open fracture)?", yes: "open_fracture", no: "location_check" },
            open_fracture: {
                final: true,
                steps: [
                    "Call 911 immediately.",
                    "Do NOT push the bone back or try to realign it.",
                    "Cover the wound with a clean, moist dressing.",
                    "Apply pressure AROUND (not on) the wound to control bleeding.",
                    "Immobilize the limb — do not move the person unnecessarily.",
                    "Keep them still and calm until paramedics arrive.",
                ],
            },
            location_check: { q: "Is the injury to the neck, spine, or pelvis?", yes: "spine", no: "limb_fracture" },
            spine: {
                final: true,
                steps: [
                    "Call 911 immediately — do NOT move the person.",
                    "Keep their head and neck completely still.",
                    "Do NOT attempt to move, sit, or roll them.",
                    "If they must be moved for safety, support head and neck in line with body.",
                    "Monitor breathing and consciousness until help arrives.",
                ],
            },
            limb_fracture: {
                final: true,
                steps: [
                    "Immobilize the limb in the position you found it.",
                    "Use a rigid object (board, magazine) as a splint.",
                    "Pad around the splint with soft material.",
                    "Apply ice WRAPPED in cloth — 20 minutes on, 20 minutes off.",
                    "Elevate if possible and comfortable.",
                    "Seek medical attention — an X-ray is needed.",
                ],
            },
        },
    },

    seizure: {
        label: "Seizure",
        icon: "⚡",
        color: "#7c3aed",
        lightBg: "bg-violet-50",
        lightBorder: "border-violet-200",
        lightText: "text-violet-700",
        warning: "Never put anything in a seizing person's mouth.",
        nodes: {
            start: { q: "Has the seizure lasted more than 5 minutes?", yes: "long_seizure", no: "during_seizure" },
            long_seizure: {
                final: true,
                steps: [
                    "Call 911 immediately — this is status epilepticus.",
                    "Keep the area clear of hard or sharp objects.",
                    "Do NOT hold them down.",
                    "Cushion their head with something soft.",
                    "Keep timing the seizure — report duration to 911.",
                    "Check airway is clear after the seizure stops.",
                ],
            },
            during_seizure: { q: "Are they in a safe location away from hazards?", yes: "monitor", no: "move_safe" },
            move_safe: {
                final: true,
                steps: [
                    "Gently move hard or sharp objects away from them.",
                    "Do NOT move the person unless in immediate danger.",
                    "Cushion their head.",
                    "Time the seizure — if it passes 5 minutes, call 911.",
                    "After seizure stops: recovery position — roll gently onto their side.",
                    "Stay and monitor breathing until fully conscious.",
                ],
            },
            monitor: {
                final: true,
                steps: [
                    "Time the seizure — note start and stop.",
                    "Put something soft under their head.",
                    "Do NOT restrain them or put anything in their mouth.",
                    "When seizure stops: roll gently onto their side (recovery position).",
                    "Check that they are breathing normally.",
                    "Reassure them calmly when they regain consciousness.",
                    "If this is their first seizure — seek medical advice.",
                ],
            },
        },
    },

    unconscious: {
        label: "Unconscious",
        icon: "😵",
        color: "#1d4ed8",
        lightBg: "bg-blue-50",
        lightBorder: "border-blue-200",
        lightText: "text-blue-700",
        warning: "Assume a spinal injury if cause is unknown — minimize all movement.",
        nodes: {
            start: { q: "Is the person breathing normally?", yes: "recovery_position", no: "cpr_start" },
            recovery_position: { q: "Is there any sign of neck or spinal injury?", yes: "spinal_concern", no: "roll_recovery" },
            spinal_concern: {
                final: true,
                steps: [
                    "Call 911 immediately.",
                    "Do NOT move their head or neck.",
                    "Open airway by gently lifting the chin — minimal head tilt.",
                    "Monitor breathing constantly.",
                    "Keep them warm with a blanket.",
                    "No food or drink.",
                ],
            },
            roll_recovery: {
                final: true,
                steps: [
                    "Call 911.",
                    "Recovery position: roll onto their side gently.",
                    "Bend the top leg at the knee to stabilize.",
                    "Place top hand under cheek to support head.",
                    "Tilt head back slightly to open airway.",
                    "Monitor breathing every minute.",
                    "Keep them warm and comfortable.",
                ],
            },
            cpr_start: {
                final: true,
                isCPR: true,
                steps: [
                    "Call 911 immediately or send someone to call.",
                    "Place heel of hand on center of chest (lower half of breastbone).",
                    "Interlock other hand on top, arms locked straight.",
                    "Push down at least 2 inches (5cm) — hard and fast.",
                    "Rate: 100–120 compressions per minute.",
                    "If trained: give 2 rescue breaths after every 30 compressions.",
                    "Use an AED if one is nearby — follow its voice prompts.",
                    "Do NOT stop until help arrives or person shows clear signs of life.",
                ],
            },
        },
    },

    cardiac: {
        label: "Cardiac Arrest",
        icon: "💔",
        color: "#9f1239",
        lightBg: "bg-rose-50",
        lightBorder: "border-rose-200",
        lightText: "text-rose-700",
        warning: "Every second counts — do not delay starting CPR.",
        nodes: {
            start: { q: "Is the person completely unresponsive with no normal breathing?", yes: "call_and_cpr", no: "check_again" },
            check_again: { q: "Are they breathing normally (not gasping or gurgling)?", yes: "stable", no: "call_and_cpr" },
            stable: {
                final: true,
                steps: [
                    "Call 911 — describe symptoms in detail.",
                    "Keep the person calm and still.",
                    "If unconscious but breathing: place in recovery position.",
                    "Monitor closely — be ready to start CPR if they stop breathing.",
                    "No food, drink, or medication unless prescribed.",
                ],
            },
            call_and_cpr: {
                final: true,
                isCPR: true,
                steps: [
                    "Call 911 NOW — or shout for someone else to call.",
                    "Place heel of hand on center of chest.",
                    "Interlock both hands, arms locked straight.",
                    "Push DOWN hard — at least 2 inches deep.",
                    "100–120 compressions per minute — fast and hard.",
                    "30 compressions, then 2 rescue breaths if trained.",
                    "Get an AED if nearby — turn it on and follow the prompts.",
                    "Keep going — do NOT stop until paramedics take over.",
                ],
            },
        },
    },
};

// ─────────────────────────────────────────────────────────────────────────────
// CPR METRONOME — matches light theme
// ─────────────────────────────────────────────────────────────────────────────
function CPRTimer() {
    const [running, setRunning] = useState(false);
    const [count, setCount] = useState(0);
    const [beat, setBeat] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const toggle = () => {
        if (running) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            setRunning(false);
            setCount(0);
            setBeat(false);
        } else {
            setRunning(true);
            setCount(0);
            intervalRef.current = setInterval(() => {
                setBeat(b => !b);
                setCount(c => (c + 1 >= 30 ? 0 : c + 1));
            }, Math.round(60000 / 110));
        }
    };

    useEffect(() => () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
    }, []);

    return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold text-red-400 tracking-widest uppercase mb-3">
                CPR Metronome — 110 bpm
            </p>
            <div className="flex items-center gap-4 mb-4">
                <motion.div
                    animate={running ? { scale: beat ? 1.3 : 1 } : { scale: 1 }}
                    transition={{ duration: 0.1 }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${running ? "bg-red-500 shadow-md" : "bg-red-100"}`}
                >
                    ❤️
                </motion.div>
                <div className="flex-1">
                    <div className="flex gap-1 mb-2">
                        {Array.from({ length: 30 }).map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 h-2 rounded-full transition-colors duration-75 ${running && i < count ? "bg-red-400" : "bg-red-200"}`}
                            />
                        ))}
                    </div>
                    <p className={`text-xs font-bold ${running ? "text-red-600" : "text-red-300"}`}>
                        {running ? `Compression ${count} / 30` : "Tap Start to begin"}
                    </p>
                </div>
            </div>
            <button
                onClick={toggle}
                className={`w-full py-3 rounded-xl font-black text-sm tracking-wide transition-colors ${running
                    ? "bg-red-100 text-red-500 hover:bg-red-200"
                    : "bg-red-500 text-white hover:bg-red-600"
                    }`}
            >
                {running ? "■ Stop Metronome" : "▶ Start CPR Metronome"}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICE READ-ALOUD HOOK — Start / Stop control
// ─────────────────────────────────────────────────────────────────────────────
function useVoiceReadAloud() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    const startSpeaking = useCallback((text: string) => {
        if (!("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 0.88;
        u.onend = () => setIsSpeaking(false);
        u.onerror = () => setIsSpeaking(false);
        utteranceRef.current = u;
        setIsSpeaking(true);
        window.speechSynthesis.speak(u);
    }, []);

    const stopSpeaking = useCallback(() => {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => () => {
        if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    }, []);

    return { isSpeaking, startSpeaking, stopSpeaking };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED LAYOUT WRAPPER — mirrors EmergencyPage structure exactly
// ─────────────────────────────────────────────────────────────────────────────
interface PageShellProps {
    statusLabel: string;
    statusRight: string;
    children: React.ReactNode;
}

function PageShell({ statusLabel, statusRight, children }: PageShellProps) {
    return (
        <div className="min-h-full bg-gray-50 text-gray-900 overflow-x-hidden pb-24">
            {/* Status Bar — same as EmergencyPage */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse block" />
                    <span className="text-xs font-medium text-gray-400 tracking-widest uppercase">{statusLabel}</span>
                </div>
                <div className="text-xs text-gray-500 font-mono">{statusRight}</div>
            </div>
            {children}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICE CONTROL BUTTON — Start / Stop read-aloud
// ─────────────────────────────────────────────────────────────────────────────
interface VoiceControlProps {
    text: string;
    label: string;
    sublabel?: string;
    isSpeaking: boolean;
    onStart: (text: string) => void;
    onStop: () => void;
}

function VoiceControl({ text, label, sublabel, isSpeaking, onStart, onStop }: VoiceControlProps) {
    return (
        <div className="w-full rounded-2xl bg-white border border-gray-200 px-4 py-3.5 flex items-center gap-4">
            {/* Animated speaker icon */}
            <div className="relative flex-shrink-0">
                {isSpeaking && (
                    <motion.span
                        className="absolute inset-0 rounded-full bg-green-400/30"
                        animate={{ scale: [1, 1.6, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                    />
                )}
                {isSpeaking ? (
                    <Volume2 className="w-5 h-5 text-green-500 relative z-10" />
                ) : (
                    <Volume2 className="w-5 h-5 text-gray-400 relative z-10" />
                )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${isSpeaking ? "text-green-700" : "text-gray-800"}`}>{label}</p>
                {sublabel && <p className="text-gray-400 text-xs">{sublabel}</p>}
            </div>

            {/* Start / Stop buttons */}
            {isSpeaking ? (
                <button
                    onClick={onStop}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors"
                >
                    <Square className="w-3 h-3" />
                    Stop
                </button>
            ) : (
                <button
                    onClick={() => onStart(text)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-green-600 text-xs font-bold hover:bg-green-100 transition-colors"
                >
                    <Play className="w-3 h-3" />
                    Start
                </button>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIVE STEP CARD — checkable with visual feedback
// ─────────────────────────────────────────────────────────────────────────────
interface StepCardProps {
    step: string;
    index: number;
    total: number;
    color: string;
    checked: boolean;
    onToggle: () => void;
}

function StepCard({ step, index, total, color, checked, onToggle }: StepCardProps) {
    return (
        <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={onToggle}
            className={`w-full rounded-2xl border px-4 py-3.5 flex items-start gap-4 text-left transition-all duration-200 ${checked
                ? "bg-green-50 border-green-200"
                : "bg-white border-gray-200 hover:border-gray-300"
                }`}
        >
            {/* Step number / check */}
            <motion.div
                animate={checked ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.25 }}
                className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs flex-shrink-0 mt-0.5 transition-colors duration-200"
                style={{
                    background: checked ? "#22c55e22" : color + "18",
                    color: checked ? "#16a34a" : color,
                }}
            >
                {checked ? (
                    <CheckCircle className="w-4 h-4" />
                ) : (
                    index + 1
                )}
            </motion.div>

            {/* Step text */}
            <p
                className={`text-sm leading-relaxed font-medium flex-1 transition-colors duration-200 ${checked ? "text-green-700 line-through decoration-green-300" : "text-gray-800"
                    }`}
            >
                {step}
            </p>
        </motion.button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROGRESS BAR
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressBarProps {
    completed: number;
    total: number;
    color: string;
}

function ProgressBar({ completed, total, color }: ProgressBarProps) {
    const pct = total > 0 ? (completed / total) * 100 : 0;
    const allDone = completed === total && total > 0;

    return (
        <div className="rounded-2xl bg-white border border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Progress
                </p>
                <p className={`text-xs font-bold ${allDone ? "text-green-500" : "text-gray-500"}`}>
                    {completed} / {total} steps
                </p>
            </div>
            <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: allDone ? "#22c55e" : color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                />
            </div>
            {allDone && (
                <motion.p
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs font-semibold text-green-500 mt-2 flex items-center gap-1"
                >
                    <CheckCircle className="w-3 h-3" /> All steps completed
                </motion.p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
interface AIFirstAidModalProps {
    onClose?: () => void;
}

export default function AIFirstAidModal({ onClose }: AIFirstAidModalProps) {
    const [screen, setScreen] = useState<"select" | "tree" | "final">("select");
    const [emergency, setEmergency] = useState<string | null>(null);
    const [history, setHistory] = useState<string[]>([]);
    const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

    const voice = useVoiceReadAloud();

    const config = emergency ? TREE[emergency] : null;
    const currentNode = config ? config.nodes[history[history.length - 1]] : null;

    const selectEmergency = (id: string) => {
        voice.stopSpeaking();
        setEmergency(id);
        setHistory(["start"]);
        setScreen("tree");
        setCheckedSteps(new Set());
    };

    const answer = (next: string) => {
        voice.stopSpeaking();
        setHistory(h => [...h, next]);
        const node = TREE[emergency!].nodes[next];
        if (node?.final) {
            setScreen("final");
            setCheckedSteps(new Set());
        }
    };

    const goBack = () => {
        voice.stopSpeaking();
        if (screen === "final") {
            setHistory(h => h.slice(0, -1));
            setScreen("tree");
            setCheckedSteps(new Set());
            return;
        }
        if (history.length > 1) {
            setHistory(h => h.slice(0, -1));
        } else {
            setScreen("select");
            setEmergency(null);
            setHistory([]);
            setCheckedSteps(new Set());
        }
    };

    const toggleStep = (index: number) => {
        setCheckedSteps(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    // ── Back button — shared across screens ──────────────────────────────────
    const BackButton = ({ onClick }: { onClick: () => void }) => (
        <button
            onClick={onClick}
            className="w-10 h-10 rounded-2xl bg-white border border-gray-200 flex items-center justify-center flex-shrink-0 hover:bg-gray-50 transition-colors"
        >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
    );

    // ── SELECT ────────────────────────────────────────────────────────────────
    if (screen === "select") {
        return (
            <PageShell statusLabel="First Aid Guide" statusRight="Offline Ready">
                {/* Hero Header */}
                <div className="px-5 pb-6">
                    <div className="flex items-start gap-4">
                        {onClose && (
                            <div className="mt-1">
                                <BackButton onClick={onClose} />
                            </div>
                        )}
                        <div>
                            <h1 className="text-3xl font-black tracking-tight leading-none">First Aid</h1>
                            <p className="text-gray-400 text-sm mt-1">Select the emergency type</p>
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-4">
                    {/* 911 Banner — same style as EmergencyPage Call 911 button */}
                    <motion.a
                        href="tel:911"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4 flex items-center gap-4 hover:bg-blue-100 transition-colors duration-150"
                    >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Phone className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <p className="font-bold text-sm text-blue-900">Always call 911 first</p>
                            <p className="text-blue-600 text-xs">This guide is a supplement only</p>
                        </div>
                        <span className="text-blue-500 text-sm font-bold">Call</span>
                    </motion.a>

                    {/* Emergency type grid — same card style as Tier 2 */}
                    <div className="grid grid-cols-2 gap-3">
                        {Object.entries(TREE).map(([id, em], i) => (
                            <motion.button
                                key={id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => selectEmergency(id)}
                                className="rounded-2xl bg-white border border-gray-200 p-4 text-left hover:border-gray-300 hover:bg-gray-50 transition-colors duration-150"
                            >
                                <div className="text-3xl mb-3">{em.icon}</div>
                                <p className="font-bold text-sm text-gray-900">{em.label}</p>
                            </motion.button>
                        ))}
                    </div>

                    {/* Disclaimer */}
                    <div className="flex items-start gap-3 px-1 pt-1">
                        <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            For informational purposes only. Not a substitute for professional medical advice. Always contact emergency services in any life-threatening situation.
                        </p>
                    </div>
                </div>
            </PageShell>
        );
    }

    // ── QUESTION ──────────────────────────────────────────────────────────────
    if (screen === "tree" && currentNode && !currentNode.final) {
        return (
            <PageShell statusLabel={`${config!.label} · Step ${history.length}`} statusRight="Response Ready">
                {/* Hero Header */}
                <div className="px-5 pb-6">
                    <div className="flex items-start gap-4">
                        <div className="mt-1"><BackButton onClick={goBack} /></div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{config!.icon}</span>
                                <h1 className="text-3xl font-black tracking-tight leading-none">{config!.label}</h1>
                            </div>
                            <p className="text-gray-400 text-sm mt-1">Answer the question below</p>
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-4">
                    {/* Warning — same style as EmergencyPage safety tip */}
                    <div className={`rounded-2xl border ${config!.lightBorder} ${config!.lightBg} px-4 py-3 flex items-start gap-3`}>
                        <AlertTriangle className={`w-4 h-4 ${config!.lightText} flex-shrink-0 mt-0.5`} />
                        <p className={`text-xs font-medium ${config!.lightText} leading-relaxed`}>{config!.warning}</p>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={history.join("-")}
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -30 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                        >
                            {/* Question card */}
                            <div className="rounded-2xl bg-white border border-gray-200 p-5">
                                <p className="text-xl font-black text-gray-900 leading-snug tracking-tight">
                                    {currentNode.q}
                                </p>
                            </div>

                            {/* YES / NO — big, full-width like SOS button */}
                            <div className="grid grid-cols-2 gap-3">
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => answer(currentNode.yes!)}
                                    className="rounded-2xl bg-green-500 text-white py-6 font-black text-xl hover:bg-green-600 transition-colors shadow-sm"
                                >
                                    ✓ YES
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => answer(currentNode.no!)}
                                    className="rounded-2xl bg-red-500 text-white py-6 font-black text-xl hover:bg-red-600 transition-colors shadow-sm"
                                >
                                    ✗ NO
                                </motion.button>
                            </div>

                            {/* Read aloud — Start / Stop */}
                            <VoiceControl
                                text={currentNode.q!}
                                label="Read question aloud"
                                isSpeaking={voice.isSpeaking}
                                onStart={voice.startSpeaking}
                                onStop={voice.stopSpeaking}
                            />
                        </motion.div>
                    </AnimatePresence>

                    <div className="flex items-start gap-3 px-1">
                        <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">Not medical advice. Call 911 for any life-threatening situation.</p>
                    </div>
                </div>
            </PageShell>
        );
    }

    // ── FINAL STEPS ───────────────────────────────────────────────────────────
    if (screen === "final" && currentNode?.final) {
        return (
            <PageShell statusLabel="Follow carefully" statusRight="Response Ready">
                {/* Hero Header */}
                <div className="px-5 pb-6">
                    <div className="flex items-start gap-4">
                        <div className="mt-1"><BackButton onClick={goBack} /></div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{config!.icon}</span>
                                <h1 className="text-3xl font-black tracking-tight leading-none">{config!.label}</h1>
                            </div>
                            <p className="text-gray-400 text-sm mt-1">Tap each step as you complete it</p>
                        </div>
                    </div>
                </div>

                <div className="px-5 space-y-3">
                    {/* Warning */}
                    <div className={`rounded-2xl border ${config!.lightBorder} ${config!.lightBg} px-4 py-3 flex items-start gap-3`}>
                        <AlertTriangle className={`w-4 h-4 ${config!.lightText} flex-shrink-0 mt-0.5`} />
                        <p className={`text-xs font-medium ${config!.lightText} leading-relaxed`}>{config!.warning}</p>
                    </div>

                    {/* Progress bar */}
                    <ProgressBar
                        completed={checkedSteps.size}
                        total={currentNode.steps!.length}
                        color={config!.color}
                    />

                    {/* Interactive step cards */}
                    <AnimatePresence>
                        {currentNode.steps!.map((step, i) => (
                            <StepCard
                                key={i}
                                step={step}
                                index={i}
                                total={currentNode.steps!.length}
                                color={config!.color}
                                checked={checkedSteps.has(i)}
                                onToggle={() => toggleStep(i)}
                            />
                        ))}
                    </AnimatePresence>

                    {/* CPR Metronome */}
                    {currentNode.isCPR && <CPRTimer />}

                    {/* Divider */}
                    <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 tracking-widest uppercase font-medium">Also available</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Read aloud — Start / Stop */}
                    <VoiceControl
                        text={currentNode.steps!.join(". ")}
                        label="Read all steps aloud"
                        sublabel="Uses device voice"
                        isSpeaking={voice.isSpeaking}
                        onStart={voice.startSpeaking}
                        onStop={voice.stopSpeaking}
                    />

                    {/* Safety reminder — same style as EmergencyPage bottom tip */}
                    <div className="flex items-start gap-3 px-1 pt-1">
                        <CheckCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Monitor the person closely and wait for professional help. Stay calm — help is on the way.
                        </p>
                    </div>
                </div>
            </PageShell>
        );
    }

    return null;
}
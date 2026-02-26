import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Card } from './ui/card';
import { AlertCircle, Clock, MapPin, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EmergencyEvent {
    id: string;
    userId: string;
    type: string;
    status: string;
    location?: { x: number; y: number };
    timestamp: any;
}

export function FirebaseFeed() {
    const [events, setEvents] = useState<EmergencyEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Listen to the 'emergency_events' collection in real-time
        const q = query(
            collection(db, "emergency_events"),
            orderBy("timestamp", "desc"),
            limit(10)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const eventList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as EmergencyEvent[];
            setEvents(eventList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching Firebase events:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <Card className="p-6 bg-white border-gray-200">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        SafePath Cloud Feed
                    </h2>
                    <p className="text-xs text-gray-500">Live data from Firebase Firestore</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Live</span>
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Loading cloud data...</div>
                ) : events.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">No recent events logged.</div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {events.map((event) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center gap-4"
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${event.type.includes('SOS') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    <AlertCircle className="w-5 h-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-gray-900 truncate uppercase">
                                            {event.type.replace('_', ' ')}
                                        </p>
                                        <span className="text-[10px] text-gray-400 whitespace-nowrap flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {event.timestamp?.toDate ? event.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                            <User className="w-3 h-3" />
                                            ID: {event.userId.slice(0, 8)}
                                        </div>
                                        {event.location && (
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <MapPin className="w-3 h-3" />
                                                Loc: {Math.round(event.location.x)}, {Math.round(event.location.y)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>
        </Card>
    );
}

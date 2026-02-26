import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBLY-VEOWHDFU9_tNbAPS_idL642ZUn1Os",
    authDomain: "safepath-ai-11522.firebaseapp.com",
    projectId: "safepath-ai-11522",
    storageBucket: "safepath-ai-11522.firebasestorage.app",
    messagingSenderId: "319908676044",
    appId: "1:319908676044:web:60aa381d43325730489d69",
    measurementId: "G-55SP0W47BK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
let analytics: ReturnType<typeof getAnalytics> | null = null;
try {
    if (typeof window !== 'undefined') {
        analytics = getAnalytics(app);
    }
} catch (e) {
    console.warn("⚠️ Firebase Analytics not available:", e);
}
export const db = getFirestore(app);

/**
 * Logs an SOS event to Firestore
 */
export async function logSOSEvent(data: {
    userId: string;
    type: string;
    location?: { x: number; y: number };
    status: string;
}) {
    try {
        const docRef = await addDoc(collection(db, "emergency_events"), {
            ...data,
            timestamp: serverTimestamp()
        });
        console.log("✅ SOS logged to Real Firebase with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("❌ Error adding SOS event to Firebase: ", e);
        return null;
    }
}

/**
 * Test Firebase connection by writing and reading a test document
 */
export async function testFirebaseConnection(): Promise<boolean> {
    try {
        // Write a test document
        const docRef = await addDoc(collection(db, "connection_tests"), {
            test: true,
            timestamp: serverTimestamp(),
            source: 'safepath_connection_check'
        });
        console.log("✅ Firebase write test passed, doc ID:", docRef.id);

        // Read back from the collection
        const q = query(collection(db, "emergency_events"), orderBy("timestamp", "desc"), limit(1));
        await getDocs(q);
        console.log("✅ Firebase read test passed");

        return true;
    } catch (e) {
        console.error("❌ Firebase connection test failed:", e);
        return false;
    }
}

/**
 * Check Firebase connection status
 */
export async function checkFirebaseStatus(): Promise<'connected' | 'error'> {
    try {
        const ok = await testFirebaseConnection();
        return ok ? 'connected' : 'error';
    } catch {
        return 'error';
    }
}

export default app;

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
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
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
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

export default app;

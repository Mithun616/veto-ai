/**
 * @fileoverview Safe Firebase initialization and client helper methods for
 * optional Google Sign-In and Firestore scan history.
 *
 * Designed to never crash or throw during SSR, production build, or guest browsing
 * when NEXT_PUBLIC_FIREBASE_API_KEY is not configured.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  type Firestore,
} from "firebase/firestore";
import type { AnalysisResult } from "@/lib/veto";

export interface SavedScan {
  id: string;
  title: string;
  createdAt: string;
  overallRisk: "Low" | "Medium" | "High";
  riskScore: number;
  summary: string;
  analysis: AnalysisResult;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Indicates whether the client has configured the minimum required Firebase credentials.
 */
export const isFirebaseConfigured = Boolean(
  typeof process.env.NEXT_PUBLIC_FIREBASE_API_KEY === "string" &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY.trim() !== ""
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (typeof window !== "undefined" && isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    googleProvider = new GoogleAuthProvider();
  } catch (err) {
    console.warn("[VetoAI] Failed to initialize Firebase:", err);
  }
}

export { app, auth, db, googleProvider };

/**
 * Triggers Google Sign-In via popup.
 * Returns the signed-in User or null if cancelled / unconfigured.
 */
export async function signInWithGoogle(): Promise<User | null> {
  if (!isFirebaseConfigured || !auth || !googleProvider) {
    console.warn("[VetoAI] Firebase credentials not configured.");
    return null;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (
      error.code !== "auth/popup-closed-by-user" &&
      error.code !== "auth/cancelled-popup-request"
    ) {
      console.error("[VetoAI] Google Sign-In error:", error);
    }
    return null;
  }
}

/**
 * Signs out the currently authenticated user.
 */
export async function signOutUser(): Promise<void> {
  if (!auth) return;
  try {
    await signOut(auth);
  } catch (err) {
    console.error("[VetoAI] Sign out error:", err);
  }
}

/**
 * Subscribes to Firebase auth state changes.
 * Returns an unsubscribe callback.
 */
export function onAuthChange(
  callback: (user: User | null) => void
): () => void {
  if (!isFirebaseConfigured || !auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Saves a completed analysis to Firestore under `users/${userId}/scans`.
 * Returns the created document ID or null on failure.
 */
export async function saveScanToFirestore(
  userId: string,
  scanData: {
    title: string;
    overallRisk: "Low" | "Medium" | "High";
    riskScore: number;
    summary: string;
    analysis: AnalysisResult;
  }
): Promise<string | null> {
  if (!isFirebaseConfigured || !db || !userId) {
    return null;
  }

  try {
    const scansRef = collection(db, "users", userId, "scans");
    const docRef = await addDoc(scansRef, {
      ...scanData,
      createdAt: serverTimestamp(),
      clientTimestamp: new Date().toISOString(),
    });
    return docRef.id;
  } catch (err) {
    console.warn("[VetoAI] Failed to save scan to Firestore:", err);
    return null;
  }
}

/**
 * Fetches saved scans for a user from Firestore ordered by creation date descending.
 */
export async function getUserScans(userId: string): Promise<SavedScan[]> {
  if (!isFirebaseConfigured || !db || !userId) {
    return [];
  }

  try {
    const scansRef = collection(db, "users", userId, "scans");
    const q = query(scansRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const scans: SavedScan[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      let dateStr = new Date().toISOString();
      if (data.createdAt && typeof data.createdAt.toDate === "function") {
        dateStr = data.createdAt.toDate().toISOString();
      } else if (data.clientTimestamp) {
        dateStr = String(data.clientTimestamp);
      }

      scans.push({
        id: doc.id,
        title: String(data.title || "Contract Audit"),
        createdAt: dateStr,
        overallRisk: (data.overallRisk as "Low" | "Medium" | "High") || "Medium",
        riskScore: typeof data.riskScore === "number" ? data.riskScore : 50,
        summary: String(data.summary || ""),
        analysis: data.analysis as AnalysisResult,
      });
    });

    return scans;
  } catch (err) {
    console.warn("[VetoAI] Failed to fetch scans from Firestore:", err);
    return [];
  }
}

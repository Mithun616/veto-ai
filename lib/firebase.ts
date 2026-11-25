/**
 * @fileoverview Safe Firebase initialization, client helper methods, and strict
 * allowlist serialization for optional Google Sign-In and Firestore scan history.
 *
 * Security & Privacy Guarantees:
 * 1. Raw document text, files, and transient UI fields are strictly excluded from persistence.
 * 2. `serializePersistedScan` enforces a strict allowlist of validated analysis fields.
 * 3. Never crashes or throws during SSR, production build, or guest browsing when
 *    NEXT_PUBLIC_FIREBASE_API_KEY is not configured.
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

/**
 * Persisted shape of a flagged clause in Firestore.
 */
export interface PersistedFlaggedClause {
  id: string;
  title: string;
  quote: string;
  risk: "Low" | "Medium" | "High";
  whyItMatters: string;
  negotiationLine: string;
}

/**
 * Persisted shape of a missing protection in Firestore.
 */
export interface PersistedMissingProtection {
  id: string;
  title: string;
  whyItMatters: string;
  askFor: string;
}

/**
 * Persisted shape of the negotiation draft email.
 */
export interface PersistedNegotiationEmail {
  subject: string;
  body: string;
}

/**
 * Persisted shape of the nested analysis object.
 * Strictly excludes documentSnapshot, raw document text, and transient UI state.
 */
export interface PersistedAnalysis {
  overallRisk: "Low" | "Medium" | "High";
  riskScore: number;
  summary: string;
  reviewStatus: "complete" | "incomplete_unverified" | "clean";
  unverifiedCount: number;
  hasSupportedFindings: boolean;
  flaggedClauses: PersistedFlaggedClause[];
  missingProtections: PersistedMissingProtection[];
  negotiationEmail: PersistedNegotiationEmail;
}

/**
 * Complete document payload written to `users/{userId}/scans`.
 */
export interface PersistedScanPayload {
  title: string;
  overallRisk: "Low" | "Medium" | "High";
  riskScore: number;
  summary: string;
  analysis: PersistedAnalysis;
  clientTimestamp: string;
}

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
 * Strict allowlist serialization for Firestore persistence.
 * Guarantees that raw document text, document snapshots, or unauthorized
 * fields are never stored in Cloud Firestore.
 */
export function serializePersistedScan(scanData: {
  title: string;
  overallRisk: "Low" | "Medium" | "High";
  riskScore: number;
  summary: string;
  analysis: AnalysisResult;
}): PersistedScanPayload {
  const safeTitle = String(scanData.title || "Contract Audit")
    .slice(0, 100)
    .trim();

  const safeOverallRisk: "Low" | "Medium" | "High" =
    scanData.overallRisk === "High" || scanData.overallRisk === "Low"
      ? scanData.overallRisk
      : "Medium";

  const safeRiskScore =
    typeof scanData.riskScore === "number" && !isNaN(scanData.riskScore)
      ? Math.max(0, Math.min(100, Math.round(scanData.riskScore)))
      : 50;

  const safeSummary = String(scanData.summary || "").slice(0, 2000).trim();

  const rawClauses = Array.isArray(scanData.analysis?.flaggedClauses)
    ? scanData.analysis.flaggedClauses
    : [];

  const safeFlaggedClauses: PersistedFlaggedClause[] = rawClauses
    .slice(0, 50)
    .map((c, idx) => ({
      id: String(c.id || `clause-${idx + 1}`).slice(0, 50),
      title: String(c.title || "Flagged Clause").slice(0, 150),
      quote: String(c.quote || "").slice(0, 500),
      risk: c.risk === "High" || c.risk === "Low" ? c.risk : "Medium",
      whyItMatters: String(c.whyItMatters || "").slice(0, 1000),
      negotiationLine: String(c.negotiationLine || "").slice(0, 1000),
    }));

  const rawProtections = Array.isArray(scanData.analysis?.missingProtections)
    ? scanData.analysis.missingProtections
    : [];

  const safeMissingProtections: PersistedMissingProtection[] = rawProtections
    .slice(0, 20)
    .map((p, idx) => ({
      id: String(p.id || `protection-${idx + 1}`).slice(0, 50),
      title: String(p.title || "Missing Protection").slice(0, 150),
      whyItMatters: String(p.whyItMatters || "").slice(0, 1000),
      askFor: String(p.askFor || "").slice(0, 1000),
    }));

  const safeNegotiationEmail: PersistedNegotiationEmail = {
    subject: String(
      scanData.analysis?.negotiationEmail?.subject || "Contract Discussion"
    ).slice(0, 200),
    body: String(scanData.analysis?.negotiationEmail?.body || "").slice(0, 5000),
  };

  const safeAnalysis: PersistedAnalysis = {
    overallRisk: safeOverallRisk,
    riskScore: safeRiskScore,
    summary: safeSummary,
    reviewStatus:
      scanData.analysis?.reviewStatus === "incomplete_unverified" ||
      scanData.analysis?.reviewStatus === "clean"
        ? scanData.analysis.reviewStatus
        : "complete",
    unverifiedCount:
      typeof scanData.analysis?.unverifiedCount === "number"
        ? Math.max(0, scanData.analysis.unverifiedCount)
        : 0,
    hasSupportedFindings: Boolean(
      scanData.analysis?.hasSupportedFindings ?? safeFlaggedClauses.length > 0
    ),
    flaggedClauses: safeFlaggedClauses,
    missingProtections: safeMissingProtections,
    negotiationEmail: safeNegotiationEmail,
  };

  return {
    title: safeTitle,
    overallRisk: safeOverallRisk,
    riskScore: safeRiskScore,
    summary: safeSummary,
    analysis: safeAnalysis,
    clientTimestamp: new Date().toISOString(),
  };
}

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
 * Saves an allowlist-serialized analysis to Firestore under `users/${userId}/scans`.
 * Full document text and raw files are NEVER stored.
 * Sanitizes payload with JSON.parse(JSON.stringify(...)) so undefined optional fields
 * never trigger Firestore unhandled rejections.
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
  },
  onScansUpdated?: (scans: SavedScan[]) => void
): Promise<string | null> {
  if (!isFirebaseConfigured || !db || !userId) {
    return null;
  }

  try {
    const payload = serializePersistedScan(scanData);
    // Sanitize with JSON.parse(JSON.stringify(...)) so undefined optional fields never get rejected by Firestore
    const sanitized = JSON.parse(JSON.stringify(payload));
    const scansRef = collection(db, "users", userId, "scans");
    const docRef = await addDoc(scansRef, {
      ...sanitized,
      createdAt: serverTimestamp(),
    });

    // Refresh scans state immediately after saving if callback provided
    if (onScansUpdated) {
      try {
        const refreshed = await getUserScans(userId);
        onScansUpdated(refreshed);
      } catch (refreshErr) {
        console.warn("[VetoAI] Failed to refresh scans after saving:", refreshErr);
      }
    }

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

      const rawAnalysis = (data.analysis || {}) as Partial<PersistedAnalysis>;

      const safeAnalysis: AnalysisResult = {
        overallRisk:
          rawAnalysis.overallRisk === "High" || rawAnalysis.overallRisk === "Low"
            ? rawAnalysis.overallRisk
            : "Medium",
        riskScore:
          typeof rawAnalysis.riskScore === "number" ? rawAnalysis.riskScore : 50,
        summary: String(rawAnalysis.summary || ""),
        reviewStatus:
          rawAnalysis.reviewStatus === "incomplete_unverified" ||
          rawAnalysis.reviewStatus === "clean"
            ? rawAnalysis.reviewStatus
            : "complete",
        unverifiedCount:
          typeof rawAnalysis.unverifiedCount === "number"
            ? rawAnalysis.unverifiedCount
            : 0,
        hasSupportedFindings: Boolean(
          rawAnalysis.hasSupportedFindings ??
            (Array.isArray(rawAnalysis.flaggedClauses) &&
              rawAnalysis.flaggedClauses.length > 0)
        ),
        flaggedClauses: Array.isArray(rawAnalysis.flaggedClauses)
          ? rawAnalysis.flaggedClauses.map((c) => ({
              id: String(c.id || ""),
              title: String(c.title || ""),
              quote: String(c.quote || ""),
              risk:
                c.risk === "High" || c.risk === "Low"
                  ? (c.risk as "Low" | "Medium" | "High")
                  : "Medium",
              whyItMatters: String(c.whyItMatters || ""),
              negotiationLine: String(c.negotiationLine || ""),
            }))
          : [],
        missingProtections: Array.isArray(rawAnalysis.missingProtections)
          ? rawAnalysis.missingProtections.map((p) => ({
              id: String(p.id || ""),
              title: String(p.title || ""),
              whyItMatters: String(p.whyItMatters || ""),
              askFor: String(p.askFor || ""),
            }))
          : [],
        negotiationEmail: {
          subject: String(rawAnalysis.negotiationEmail?.subject || "Contract Discussion"),
          body: String(rawAnalysis.negotiationEmail?.body || ""),
        },
      };

      scans.push({
        id: doc.id,
        title: String(data.title || "Contract Audit"),
        createdAt: dateStr,
        overallRisk: (data.overallRisk as "Low" | "Medium" | "High") || "Medium",
        riskScore: typeof data.riskScore === "number" ? data.riskScore : 50,
        summary: String(data.summary || ""),
        analysis: safeAnalysis,
      });
    });

    return scans;
  } catch (err) {
    console.warn("[VetoAI] Failed to fetch scans from Firestore:", err);
    return [];
  }
}

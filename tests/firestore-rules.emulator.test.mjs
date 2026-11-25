/**
 * @fileoverview Real Firestore Emulator Security Rules Test Suite.
 *
 * Evaluates the production `firestore.rules` against real Firestore Emulator instances
 * using `@firebase/rules-unit-testing`.
 *
 * Test Scenarios:
 * 1. Unauthenticated denial (read & write).
 * 2. Owner create/read/delete success.
 * 3. Cross-user read/write/delete denial.
 * 4. Invalid and unexpected fields rejected (documentSnapshot, documentText, admin, out-of-range scores).
 * 5. Update denial (immutability).
 * 6. Actual application save payload (from serializePersistedScan) accepted.
 *
 * Prerequisites:
 * Running Firestore Emulator (requires JDK >= 21):
 * `npx firebase emulators:start --only firestore`
 *
 * If emulator is not running (e.g. host JDK < 21), tests are gracefully skipped
 * with clear environmental diagnostics.
 */

import { describe, it, before, after, beforeEach } from "node:test";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { serializePersistedScan } from "../lib/firebase.ts";

const PROJECT_ID = "veto-ai-dev";
const RULES_PATH = path.resolve(process.cwd(), "firestore.rules");
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
const [host, portStr] = EMULATOR_HOST.split(":");
const port = Number(portStr) || 8080;

/**
 * Checks if the Firestore emulator is responding.
 */
async function isEmulatorReachable() {
  return new Promise((resolve) => {
    const req = http.request(
      { hostname: host, port, path: "/", method: "GET", timeout: 800 },
      () => resolve(true)
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

describe("Firestore Security Rules (Emulator Integration)", async () => {
  const emulatorRunning = await isEmulatorReachable();
  let testEnv = null;

  if (emulatorRunning) {
    before(async () => {
      const rules = fs.readFileSync(RULES_PATH, "utf8");
      testEnv = await initializeTestEnvironment({
        projectId: PROJECT_ID,
        firestore: {
          rules,
          host,
          port,
        },
      });
    });

    after(async () => {
      if (testEnv) {
        await testEnv.cleanup();
      }
    });

    beforeEach(async () => {
      if (testEnv) {
        await testEnv.clearFirestore();
      }
    });
  }

  const conditionalIt = emulatorRunning ? it : it.skip;
  const skipReason = "Firestore emulator not reachable (host JDK < 21 prevents emulator process)";

  conditionalIt("1. Unauthenticated users are denied read and create access", skipReason, async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    const scanRef = unauthedDb.collection("users").doc("user-alice").collection("scans").doc("scan-1");

    await assertFails(scanRef.get());
    await assertFails(scanRef.set({ title: "Test Scan", overallRisk: "Low" }));
  });

  conditionalIt("2. Authenticated owner can create valid scan, read it back, and delete it", skipReason, async () => {
    const aliceDb = testEnv.authenticatedContext("user-alice").firestore();
    const scanRef = aliceDb.collection("users").doc("user-alice").collection("scans").doc("scan-1");

    const validPayload = serializePersistedScan({
      title: "Employment Contract Review",
      overallRisk: "Medium",
      riskScore: 65,
      summary: "Contains non-compete clause.",
      analysis: {
        overallRisk: "Medium",
        riskScore: 65,
        summary: "Contains non-compete clause.",
        reviewStatus: "complete",
        unverifiedCount: 0,
        hasSupportedFindings: true,
        flaggedClauses: [
          {
            id: "clause-1",
            title: "Non-Compete",
            quote: "Cannot work in software for 24 months.",
            risk: "High",
            whyItMatters: "Restricts livelihood.",
            negotiationLine: "Request removing non-compete.",
          },
        ],
        missingProtections: [
          {
            id: "protection-1",
            title: "Mutual Termination",
            whyItMatters: "Notice should be bilateral.",
            askFor: "Add 30-day mutual notice.",
          },
        ],
        negotiationEmail: {
          subject: "Discussion regarding offer terms",
          body: "Dear HR, I have a question regarding clause 5.",
        },
      },
    });

    // Create success
    await assertSucceeds(scanRef.set(validPayload));

    // Read success
    await assertSucceeds(scanRef.get());

    // Delete success
    await assertSucceeds(scanRef.delete());
  });

  conditionalIt("3. Cross-user access is denied (User Bob cannot read, write, or delete User Alice's scans)", skipReason, async () => {
    const aliceDb = testEnv.authenticatedContext("user-alice").firestore();
    const bobDb = testEnv.authenticatedContext("user-bob").firestore();

    const aliceScanRef = aliceDb.collection("users").doc("user-alice").collection("scans").doc("scan-1");
    const bobAccessToAliceRef = bobDb.collection("users").doc("user-alice").collection("scans").doc("scan-1");

    const validPayload = serializePersistedScan({
      title: "Confidential Tenancy Audit",
      overallRisk: "Low",
      riskScore: 20,
      summary: "Fair agreement.",
      analysis: {
        overallRisk: "Low",
        riskScore: 20,
        summary: "Fair agreement.",
        reviewStatus: "complete",
        unverifiedCount: 0,
        hasSupportedFindings: false,
        flaggedClauses: [],
        missingProtections: [],
        negotiationEmail: {
          subject: "Tenancy Agreement Confirmation",
          body: "Looks good to sign.",
        },
      },
    });

    // Alice creates her scan
    await assertSucceeds(aliceScanRef.set(validPayload));

    // Bob tries to read Alice's scan -> DENIED
    await assertFails(bobAccessToAliceRef.get());

    // Bob tries to overwrite Alice's scan -> DENIED
    await assertFails(bobAccessToAliceRef.set(validPayload));

    // Bob tries to delete Alice's scan -> DENIED
    await assertFails(bobAccessToAliceRef.delete());
  });

  conditionalIt("4. Invalid and unexpected fields are rejected by strict allowlist schema", skipReason, async () => {
    const aliceDb = testEnv.authenticatedContext("user-alice").firestore();
    const scansCol = aliceDb.collection("users").doc("user-alice").collection("scans");

    const baseValid = serializePersistedScan({
      title: "Baseline Audit",
      overallRisk: "Low",
      riskScore: 10,
      summary: "Clean document.",
      analysis: {
        overallRisk: "Low",
        riskScore: 10,
        summary: "Clean document.",
        reviewStatus: "clean",
        unverifiedCount: 0,
        hasSupportedFindings: false,
        flaggedClauses: [],
        missingProtections: [],
        negotiationEmail: { subject: "Sub", body: "Body" },
      },
    });

    // Attempting to persist full documentSnapshot -> REJECTED
    await assertFails(
      scansCol.doc("bad-1").set({
        ...baseValid,
        documentSnapshot: "Full raw contract text that should never be saved...",
      })
    );

    // Attempting to persist documentText -> REJECTED
    await assertFails(
      scansCol.doc("bad-2").set({
        ...baseValid,
        documentText: "Sensitive contract text...",
      })
    );

    // Attempting to inject arbitrary admin field -> REJECTED
    await assertFails(
      scansCol.doc("bad-3").set({
        ...baseValid,
        role: "admin",
      })
    );

    // Attempting out-of-range riskScore -> REJECTED
    await assertFails(
      scansCol.doc("bad-4").set({
        ...baseValid,
        riskScore: 150,
      })
    );

    // Attempting negative riskScore -> REJECTED
    await assertFails(
      scansCol.doc("bad-5").set({
        ...baseValid,
        riskScore: -10,
      })
    );

    // Attempting oversized title (> 100 chars) -> REJECTED
    await assertFails(
      scansCol.doc("bad-6").set({
        ...baseValid,
        title: "A".repeat(150),
      })
    );
  });

  conditionalIt("5. Update operations are denied (saved scans are strictly immutable)", skipReason, async () => {
    const aliceDb = testEnv.authenticatedContext("user-alice").firestore();
    const scanRef = aliceDb.collection("users").doc("user-alice").collection("scans").doc("scan-immutable");

    const validPayload = serializePersistedScan({
      title: "Immutable Scan",
      overallRisk: "High",
      riskScore: 80,
      summary: "Severe penalty clauses.",
      analysis: {
        overallRisk: "High",
        riskScore: 80,
        summary: "Severe penalty clauses.",
        reviewStatus: "complete",
        unverifiedCount: 0,
        hasSupportedFindings: true,
        flaggedClauses: [],
        missingProtections: [],
        negotiationEmail: { subject: "Dispute", body: "Need changes" },
      },
    });

    // Initial creation succeeds
    await assertSucceeds(scanRef.set(validPayload));

    // Update attempt by the owner -> DENIED
    await assertFails(scanRef.update({ title: "Tampered Title" }));
    await assertFails(scanRef.update({ riskScore: 0 }));
  });

  conditionalIt("6. Actual application save payload generated by serializePersistedScan is accepted", skipReason, async () => {
    const aliceDb = testEnv.authenticatedContext("user-alice").firestore();
    const scanRef = aliceDb.collection("users").doc("user-alice").collection("scans").doc("scan-app-payload");

    const appPayload = serializePersistedScan({
      title: "SaaS Terms of Service Review",
      overallRisk: "Medium",
      riskScore: 55,
      summary: "Auto-renewal clause with postal notice requirement.",
      analysis: {
        overallRisk: "Medium",
        riskScore: 55,
        summary: "Auto-renewal clause with postal notice requirement.",
        reviewStatus: "complete",
        unverifiedCount: 0,
        hasSupportedFindings: true,
        flaggedClauses: [
          {
            id: "clause-saas-1",
            title: "Postal-Only Cancellation",
            quote: "Notice must be delivered via registered post 60 days in advance.",
            risk: "Medium",
            whyItMatters: "Creates artificial friction to prevent cancelling subscriptions.",
            negotiationLine: "Provide an online one-click cancellation mechanism.",
          },
        ],
        missingProtections: [
          {
            id: "prot-saas-1",
            title: "Digital Cancellation & Refunds",
            whyItMatters: "Subscribers should be able to cancel in the same method used to sign up.",
            askFor: "Allow digital cancellation through account settings.",
          },
        ],
        negotiationEmail: {
          subject: "Subscription Terms Amendment Request",
          body: "Hello Support, I request clarification regarding digital cancellation options.",
        },
      },
    });

    await assertSucceeds(scanRef.set(appPayload));
  });
});

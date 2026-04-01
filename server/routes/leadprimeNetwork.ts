/**
 * LeadPrime Network Routes — Owl Fenc Backend
 *
 * Handles:
 * - GET  /api/leadprime-network/connection          → get connection status (from DB)
 * - POST /api/leadprime-network/connect             → link account with API token
 * - DELETE /api/leadprime-network/connection        → unlink account
 * - POST /api/leadprime-network/sync                → manual sync all docs
 * - POST /api/leadprime-network/sync-document       → sync single document
 * - POST /api/leadprime-network/send-document       → send doc to specific @handle
 * - GET  /api/leadprime-network/sync-status         → get sync stats
 * - GET  /api/leadprime-network/validate-handle/:h  → validate a @handle exists in LeadPrime
 *
 * FIX: Connection state is now persisted in the users table (leadprime_token column)
 *      instead of in-memory Map — survives server restarts.
 */
import { Router, Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

// ─── LeadPrime API base URL ───────────────────────────────────────────────────
const LEADPRIME_API = process.env.LEADPRIME_API_URL || "https://leadprime.chyrris.com/api";

// ─── Auth middleware (Firebase UID from request) ──────────────────────────────
function getFirebaseUid(req: Request): string | null {
  return (req as any).user?.uid || null;
}

// ─── Helper: call LeadPrime API ───────────────────────────────────────────────
async function callLeadPrime(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const res = await fetch(`${LEADPRIME_API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-LeadPrime-Token": token,
        "X-Source": "owlfenc",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: String(err) } };
  }
}

// ─── Helper: get user row by Firebase UID ────────────────────────────────────
async function getUserByUid(uid: string) {
  if (!db) return null;
  try {
    const rows = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);
    return rows[0] || null;
  } catch {
    return null;
  }
}

// ─── GET /connection ──────────────────────────────────────────────────────────
router.get("/connection", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.json({ connected: false });
  }

  return res.json({
    connected: true,
    handle: user.leadprimeHandle,
    connectedAt: user.leadprimeConnectedAt,
    lastSync: user.leadprimeLastSync,
    syncedDocs: user.leadprimeSyncedDocs || 0,
    token: `${user.leadprimeToken.substring(0, 8)}...${user.leadprimeToken.slice(-4)}`,
  });
});

// ─── POST /connect ────────────────────────────────────────────────────────────
router.post("/connect", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const { token } = req.body;
  if (!token || !token.startsWith("lpn_")) {
    return res.status(400).json({ error: "Invalid token format. Must start with lpn_" });
  }

  // Validate token with LeadPrime
  const validation = await callLeadPrime("GET", "/network/documents/validate-token", token);
  if (!validation.ok) {
    return res.status(400).json({
      error: "Token not recognized by LeadPrime. Please generate a new token.",
      detail: validation.data,
    });
  }

  const handle = validation.data?.handle || null;

  // Persist to DB
  if (db) {
    try {
      await db
        .update(users)
        .set({
          leadprimeToken: token,
          leadprimeHandle: handle,
          leadprimeConnectedAt: new Date(),
          leadprimeSyncedDocs: 0,
          leadprimeLastSync: null,
        })
        .where(eq(users.firebaseUid, uid));
    } catch (err) {
      console.error("[LEADPRIME-NETWORK] Failed to persist token to DB:", err);
      // Non-fatal — still return success
    }
  }

  // Trigger initial sync in background
  triggerInitialSync(uid, token).catch(console.error);

  return res.json({ connected: true, handle });
});

// ─── DELETE /connection ───────────────────────────────────────────────────────
router.delete("/connection", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  if (db) {
    try {
      await db
        .update(users)
        .set({
          leadprimeToken: null,
          leadprimeHandle: null,
          leadprimeConnectedAt: null,
          leadprimeSyncedDocs: 0,
          leadprimeLastSync: null,
        })
        .where(eq(users.firebaseUid, uid));
    } catch (err) {
      console.error("[LEADPRIME-NETWORK] Failed to clear token from DB:", err);
    }
  }

  return res.json({ disconnected: true });
});

// ─── GET /sync-status ─────────────────────────────────────────────────────────
router.get("/sync-status", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected to LeadPrime Network" });
  }

  const result = await callLeadPrime("GET", "/network/documents/sync-status", user.leadprimeToken);
  if (!result.ok) {
    return res.json({ estimates: 0, invoices: 0, contracts: 0, permits: 0, lastSyncAt: null });
  }

  return res.json(result.data);
});

// ─── POST /sync (manual full sync) ───────────────────────────────────────────
router.post("/sync", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected to LeadPrime" });
  }

  const synced = await triggerInitialSync(uid, user.leadprimeToken);
  return res.json({ synced });
});

// ─── POST /sync-document (auto-sync single doc) ───────────────────────────────
router.post("/sync-document", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected" });
  }

  const payload = req.body;
  if (!payload.doc_type || !payload.doc_reference) {
    return res.status(400).json({ error: "doc_type and doc_reference are required" });
  }

  const result = await callLeadPrime("POST", "/network/documents/receive", user.leadprimeToken, {
    ...payload,
    sender_handle: user.leadprimeHandle,
    source: "owlfenc",
    auto_sync: true,
  });

  if (!result.ok) {
    return res.status(500).json({ error: "Failed to sync to LeadPrime" });
  }

  // Update sync count and lastSync in DB
  if (db) {
    try {
      await db
        .update(users)
        .set({
          leadprimeSyncedDocs: (user.leadprimeSyncedDocs || 0) + 1,
          leadprimeLastSync: new Date(),
        })
        .where(eq(users.firebaseUid, uid));
    } catch {}
  }

  return res.json({ synced: true, doc_reference: payload.doc_reference });
});

// ─── POST /send-document (send to specific @handle) ───────────────────────────
router.post("/send-document", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected to LeadPrime Network" });
  }

  const { recipient_handle, ...docPayload } = req.body;
  if (!recipient_handle) {
    return res.status(400).json({ error: "recipient_handle is required" });
  }

  const result = await callLeadPrime("POST", "/network/documents/receive", user.leadprimeToken, {
    ...docPayload,
    sender_handle: user.leadprimeHandle,
    recipient_handle,
    source: "owlfenc",
    auto_sync: false,
  });

  if (!result.ok) {
    return res.status(500).json({
      error: result.data?.message || "Failed to send document to LeadPrime",
    });
  }

  return res.json({ sent: true, recipient_handle, doc_reference: docPayload.doc_reference });
});

// ─── GET /validate-handle/:handle ─────────────────────────────────────────────
router.get("/validate-handle/:handle", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected to LeadPrime Network" });
  }

  const { handle } = req.params;
  if (!handle || handle.length < 3) {
    return res.json({ exists: false });
  }

  const result = await callLeadPrime(
    "GET",
    `/network/validate-handle/${encodeURIComponent(handle)}`,
    user.leadprimeToken
  );

  if (!result.ok) return res.json({ exists: false });
  return res.json(result.data);
});

// ─── Background sync helper ───────────────────────────────────────────────────
async function triggerInitialSync(uid: string, token: string): Promise<number> {
  const result = await callLeadPrime("POST", "/network/documents/request-sync", token, {
    source: "owlfenc",
    uid,
  });

  if (db) {
    try {
      await db
        .update(users)
        .set({ leadprimeLastSync: new Date() })
        .where(eq(users.firebaseUid, uid));
    } catch {}
  }

  return result.data?.synced || 0;
}

export default router;

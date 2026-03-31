/**
 * LeadPrime Network Routes — Owl Fenc Backend
 * 
 * Handles:
 * - GET  /api/leadprime-network/connection          → get connection status
 * - POST /api/leadprime-network/connect             → link account with API token
 * - DELETE /api/leadprime-network/connection        → unlink account
 * - POST /api/leadprime-network/sync                → manual sync all docs
 * - POST /api/leadprime-network/sync-document       → sync single document
 * - POST /api/leadprime-network/send-document       → send doc to specific @handle
 * - GET  /api/leadprime-network/sync-status         → get sync stats
 * - GET  /api/leadprime-network/validate-handle/:h  → validate a @handle exists in LeadPrime
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
  // Firebase auth sets req.user in the auth middleware
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

// ─── In-memory connection store (replace with DB column in production) ────────
// Format: { [firebaseUid]: { token, handle, connectedAt, lastSync } }
const connectionStore = new Map<string, {
  token: string;
  handle: string;
  connectedAt: string;
  lastSync?: string;
  syncedDocs: number;
}>();

// ─── GET /connection ──────────────────────────────────────────────────────────
router.get("/connection", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const conn = connectionStore.get(uid);
  if (!conn) return res.json({ connected: false });

  return res.json({
    connected: true,
    handle: conn.handle,
    connectedAt: conn.connectedAt,
    lastSync: conn.lastSync,
    syncedDocs: conn.syncedDocs,
    token: `${conn.token.substring(0, 8)}...${conn.token.slice(-4)}`, // masked
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
    });
  }

  const handle = validation.data?.handle || "unknown";

  connectionStore.set(uid, {
    token,
    handle,
    connectedAt: new Date().toISOString(),
    syncedDocs: 0,
  });

  // Trigger initial sync in background
  triggerInitialSync(uid, token).catch(console.error);

  return res.json({ connected: true, handle });
});

// ─── DELETE /connection ───────────────────────────────────────────────────────
router.delete("/connection", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  connectionStore.delete(uid);
  return res.json({ disconnected: true });
});

// ─── GET /sync-status ─────────────────────────────────────────────────────────
router.get("/sync-status", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const conn = connectionStore.get(uid);
  if (!conn) return res.status(400).json({ error: "Not connected" });

  // Get counts from LeadPrime
  const result = await callLeadPrime("GET", `/network/documents/sync-status`, conn.token);
  if (!result.ok) {
    return res.json({ estimates: 0, invoices: 0, contracts: 0, permits: 0, lastSyncAt: null });
  }

  return res.json(result.data);
});

// ─── POST /sync (manual full sync) ───────────────────────────────────────────
router.post("/sync", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const conn = connectionStore.get(uid);
  if (!conn) return res.status(400).json({ error: "Not connected to LeadPrime" });

  const synced = await triggerInitialSync(uid, conn.token);
  return res.json({ synced });
});

// ─── POST /sync-document (auto-sync single doc) ───────────────────────────────
router.post("/sync-document", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const conn = connectionStore.get(uid);
  if (!conn) return res.status(400).json({ error: "Not connected" });

  const payload = req.body;
  if (!payload.doc_type || !payload.doc_reference) {
    return res.status(400).json({ error: "doc_type and doc_reference are required" });
  }

  const result = await callLeadPrime("POST", "/network/documents/receive", conn.token, {
    ...payload,
    sender_handle: conn.handle,
    source: "owlfenc",
    auto_sync: true,
  });

  if (!result.ok) {
    return res.status(500).json({ error: "Failed to sync to LeadPrime" });
  }

  // Update sync count
  const existing = connectionStore.get(uid);
  if (existing) {
    connectionStore.set(uid, {
      ...existing,
      lastSync: new Date().toISOString(),
      syncedDocs: existing.syncedDocs + 1,
    });
  }

  return res.json({ synced: true, doc_reference: payload.doc_reference });
});

// ─── POST /send-document (send to specific @handle) ───────────────────────────
router.post("/send-document", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const conn = connectionStore.get(uid);
  if (!conn) return res.status(400).json({ error: "Not connected to LeadPrime Network" });

  const { recipient_handle, ...docPayload } = req.body;
  if (!recipient_handle) {
    return res.status(400).json({ error: "recipient_handle is required" });
  }

  const result = await callLeadPrime("POST", "/network/documents/receive", conn.token, {
    ...docPayload,
    sender_handle: conn.handle,
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

  const conn = connectionStore.get(uid);
  if (!conn) return res.status(400).json({ error: "Not connected to LeadPrime Network" });

  const { handle } = req.params;
  if (!handle || handle.length < 3) {
    return res.json({ exists: false });
  }

  const result = await callLeadPrime(
    "GET",
    `/network/validate-handle/${encodeURIComponent(handle)}`,
    conn.token
  );

  if (!result.ok) return res.json({ exists: false });
  return res.json(result.data);
});

// ─── Background sync helper ───────────────────────────────────────────────────
async function triggerInitialSync(uid: string, token: string): Promise<number> {
  // In a real implementation, this would query the Owl Fenc DB for the user's
  // documents and send them all to LeadPrime. For now, it triggers a sync
  // request and LeadPrime pulls the data.
  const result = await callLeadPrime("POST", "/network/documents/request-sync", token, {
    source: "owlfenc",
    uid,
  });

  const conn = connectionStore.get(uid);
  if (conn) {
    connectionStore.set(uid, {
      ...conn,
      lastSync: new Date().toISOString(),
    });
  }

  return result.data?.synced || 0;
}

export default router;

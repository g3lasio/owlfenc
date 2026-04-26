/**
 * LeadPrime Network Routes — Owl Fenc Backend
 *
 * Handles:
 * - GET  /api/leadprime-network/connection          → get connection status (from DB)
 * - POST /api/leadprime-network/connect             → link account with API token
 * - DELETE /api/leadprime-network/connection        → unlink account
 * - POST /api/leadprime-network/sync                → manual sync all docs (REAL DATA)
 * - POST /api/leadprime-network/sync-document       → sync single document
 * - POST /api/leadprime-network/send-document       → send doc to specific @handle
 * - GET  /api/leadprime-network/sync-status         → get sync stats
 * - GET  /api/leadprime-network/validate-handle/:h  → validate a @handle exists in LeadPrime
 *
 * FIX: Connection state is now persisted in the users table (leadprime_token column)
 *      instead of in-memory Map — survives server restarts.
 * FIX v2: triggerInitialSync now reads REAL data from Firestore + PostgreSQL and
 *         pushes it to LeadPrime via POST /api/leadprime-network/history.
 */
import { Router, Request, Response } from "express";
import { db, pool } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db as firebaseDb } from "../firebase-admin";

const router = Router();

// ─── LeadPrime API base URL ───────────────────────────────────────────────────
const LEADPRIME_API = process.env.LEADPRIME_API_URL || "https://leadprime.chyrris.com/api";
const OWL_FENC_BASE_URL = process.env.OWL_FENC_BASE_URL || "https://app.owlfenc.com";

// ─── Auth middleware (Firebase UID from request) ──────────────────────────────
function getFirebaseUid(req: Request): string | null {
  return (req as any).firebaseUser?.uid ||
         (req as any).user?.uid ||
         (req.headers['x-firebase-uid'] as string) ||
         null;
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
        "Authorization": `Bearer ${token}`,
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

  // Validate token with LeadPrime via the public owlfencBridge endpoint
  const validation = await callLeadPrime("POST", "/leadprime-network/connection", token);
  if (!validation.ok) {
    return res.status(400).json({
      error: "Token not recognized by LeadPrime. Please generate a new token.",
      detail: validation.data,
    });
  }

  const handle = validation.data?.handle || validation.data?.network_handle ||
                 validation.data?.contractor?.handle || null;

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
    }
  }

  // Trigger initial sync in background — now pushes REAL data
  triggerFullSync(uid, token).catch(console.error);

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

  const result = await callLeadPrime("GET", "/leadprime-network/status", user.leadprimeToken);
  if (!result.ok) {
    return res.json({
      estimates: 0, invoices: 0, contracts: 0, permits: 0,
      lastSyncAt: user.leadprimeLastSync || null,
      syncedDocs: user.leadprimeSyncedDocs || 0,
    });
  }

  return res.json({
    ...result.data,
    lastSyncAt: user.leadprimeLastSync || null,
    syncedDocs: user.leadprimeSyncedDocs || 0,
  });
});

// ─── POST /sync (manual full sync) ───────────────────────────────────────────
router.post("/sync", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected to LeadPrime" });
  }

  try {
    const result = await triggerFullSync(uid, user.leadprimeToken);
    return res.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      total: result.total,
      breakdown: result.breakdown,
    });
  } catch (err: any) {
    console.error("[LEADPRIME-NETWORK] Sync error:", err.message);
    return res.status(500).json({ error: "Sync failed", detail: err.message });
  }
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

  // Extract project-grouping fields from payload or metadata (for correct project association in LeadPrime)
  const meta = payload.metadata || {};
  const clientName = payload.client_name || meta.client_name || null;
  const clientEmail = payload.client_email || meta.client_email || null;
  const owlfencProjectId = payload.owlfenc_project_id || meta.owlfenc_project_id || null;
  const externalId = payload.external_id || meta.external_id || payload.doc_reference;

  // Single doc push via /history endpoint (no recipient needed for own records)
  const result = await callLeadPrime("POST", "/leadprime-network/history", user.leadprimeToken, {
    documents: [{
      doc_type: payload.doc_type,
      doc_title: payload.doc_title || payload.doc_reference,
      doc_reference: payload.doc_reference,
      external_id: externalId,
      project_address: payload.project_address,
      client_name: clientName,
      client_email: clientEmail,
      owlfenc_project_id: owlfencProjectId,
      amount: payload.amount,
      currency: payload.currency || "USD",
      doc_url: payload.doc_url,
      status: payload.status || "pending",
      created_at: payload.created_at,
    }],
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

  const result = await callLeadPrime("POST", "/leadprime-network/documents/push", user.leadprimeToken, {
    ...docPayload,
    recipient_handle,
    source: "owlfenc",
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

// ─── GET /optimus-projects — list active Optimus projects for the connected contractor ────────────
router.get("/optimus-projects", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected to LeadPrime Network" });
  }

  const result = await callLeadPrime("GET", "/optimus/projects", user.leadprimeToken);
  if (!result.ok) {
    return res.status(500).json({ error: result.data?.message || "Failed to fetch Optimus projects" });
  }
  // Return only active projects
  const projects = (result.data?.projects || []).filter((p: any) => p.status === 'active' || p.status === 'in_progress');
  return res.json({ projects });
});

// ─── POST /optimus-add-file — add a signed contract PDF to an Optimus project ───────────────────
// Accepts: { project_id, file_url, file_name, contract_id, amount }
router.post("/optimus-add-file", async (req: Request, res: Response) => {
  const uid = getFirebaseUid(req);
  if (!uid) return res.status(401).json({ error: "Unauthorized" });

  const user = await getUserByUid(uid);
  if (!user || !user.leadprimeToken) {
    return res.status(400).json({ error: "Not connected to LeadPrime Network" });
  }

  const { project_id, file_url, file_name, contract_id, amount } = req.body;
  if (!project_id || !file_url || !file_name) {
    return res.status(400).json({ error: "project_id, file_url, and file_name are required" });
  }

  const result = await callLeadPrime(
    "POST",
    `/optimus/projects/${project_id}/files`,
    user.leadprimeToken,
    {
      file_url,
      file_name,
      file_type: "document",
      mime_type: "application/pdf",
      description: `Signed contract${amount ? ` — $${Number(amount).toLocaleString()}` : ''}${contract_id ? ` (${contract_id})` : ''}`,
      is_from_owlfenc: true,
      owlfenc_doc_id: contract_id || null,
    }
  );

  if (!result.ok) {
    return res.status(500).json({ error: result.data?.message || "Failed to add file to Optimus project" });
  }
  return res.json({ success: true, file: result.data?.file });
});

// ─── Full sync: reads ALL data from OWL FENC and pushes to LeadPrime ──────────
/**
 * Reads estimates (Firebase), invoices/payments (PostgreSQL via project_payments),
 * contracts (PostgreSQL), permit searches (Firebase permit_searches collection),
 * and property searches (Firebase property_searches collection) for the given
 * Firebase UID, then bulk-pushes them all to LeadPrime via /history endpoint.
 *
 * FIX v3:
 * - invoices: uses project_payments table (invoices table doesn't exist in production)
 * - permits: uses Firebase 'permit_searches' collection (has index, not subcollection path)
 * - properties: uses Firebase 'property_searches' collection (has index, not subcollection path)
 * - ownership_report type: changed to 'other' to pass LeadPrime's doc_type constraint
 *   (until migration 090 is applied in production)
 */
async function triggerFullSync(
  uid: string,
  token: string
): Promise<{ imported: number; skipped: number; total: number; breakdown: Record<string, number> }> {
  console.log(`[LEADPRIME-SYNC] ▶ Starting full sync for uid=${uid}`);
  const documents: any[] = [];
  const breakdown: Record<string, number> = {
    estimates: 0,
    invoices: 0,
    contracts: 0,
    permits: 0,
    properties: 0,
  };

  // ── 1. Estimates from Firebase ────────────────────────────────────────────────
  // FIX: EstimatesWizard.tsx saves estimates with field 'firebaseUserId' (NOT 'userId').
  //      Querying 'userId' returns 0 results. Must use 'firebaseUserId'.
  try {
    // NOTE: No orderBy here — combining where()+orderBy() on different fields requires a composite
    // Firestore index that does not exist yet. Simple equality filter works without any index.
    const estimatesSnap = await firebaseDb
      .collection("estimates")
      .where("firebaseUserId", "==", uid)
      .limit(500)
      .get();

    for (const doc of estimatesSnap.docs) {
      const e = doc.data();
      documents.push({
        doc_type: "estimate",
        doc_title: `Estimate #${e.estimateNumber || doc.id} — ${e.clientName || "Client"}`,
        doc_reference: e.estimateNumber || doc.id,
        external_id: `owlfenc_estimate_${doc.id}`,
        // Project grouping fields
        owlfenc_project_id: doc.id,           // Firebase estimate doc ID — the root of a project
        client_email: e.clientEmail || null,
        client_name: e.clientName || null,
        project_address: e.projectAddress || e.clientAddress || null,
        project_name: e.projectType || e.projectSubtype || null,
        amount: e.total ? parseFloat(String(e.total)) : null,
        currency: "USD",
        doc_url: e.shareId ? `${OWL_FENC_BASE_URL}/shared-estimate/${e.shareId}` : `${OWL_FENC_BASE_URL}/view/estimate/${doc.id}`,
        status: e.status || "sent",
        created_at: e.createdAt?.toDate ? e.createdAt.toDate().toISOString() : (e.createdAt || null),
      });
      breakdown.estimates++;
    }
  } catch (err: any) {
    console.warn("[LEADPRIME-SYNC] Could not read estimates from Firebase:", err.message);
  }
  console.log(`[LEADPRIME-SYNC] ✓ Estimates: ${breakdown.estimates} found`);

  // ── 2a. Invoices from Firebase 'invoices' collection (primary source) ─────────
  // Invoices.tsx saves to Firebase collection(db, 'invoices') with userId = Firebase UID.
  // This is the PRIMARY invoice source — project_payments is only for Stripe-processed payments.
  try {
    // NOTE: No orderBy — avoids composite index requirement (userId + createdAt)
    const invoicesSnap = await firebaseDb
      .collection("invoices")
      .where("userId", "==", uid)
      .limit(500)
      .get();
    for (const doc of invoicesSnap.docs) {
      const inv = doc.data();
      documents.push({
        doc_type: "invoice",
        doc_title: `Invoice #${inv.invoiceNumber || doc.id} — ${inv.clientName || "Client"}`,
        doc_reference: inv.invoiceNumber || doc.id,
        external_id: `owlfenc_invoice_fb_${doc.id}`,
        owlfenc_project_id: inv.estimateId || null,  // Firebase estimate doc ID
        client_name: inv.clientName || null,
        client_email: inv.clientEmail || null,
        project_address: inv.estimateData?.clientAddress || null,
        amount: inv.totalAmount ? parseFloat(String(inv.totalAmount)) : null,
        currency: "USD",
        doc_url: `${OWL_FENC_BASE_URL}/view/invoice/${doc.id}`,
        status: inv.paymentStatus === "paid" ? "paid" : (inv.paymentStatus === "partial" ? "pending" : "pending"),
        created_at: inv.createdAt || null,
      });
      breakdown.invoices++;
    }
  } catch (err: any) {
    console.warn("[LEADPRIME-SYNC] Could not read invoices from Firebase:", err.message);
  }
  console.log(`[LEADPRIME-SYNC] ✓ Invoices (Firebase): ${breakdown.invoices} found`);

  // ── 2b. Invoices from PostgreSQL (via project_payments — Stripe-processed payments) ──
  // NOTE: The 'invoices' table in schema.ts was never migrated to production.
  //       OWL FENC stores Stripe payment records in 'project_payments'.
  //       We need to join with users to get the integer userId from firebaseUid.
  if (pool) {
    try {
      const invResult = await pool.query(
        `SELECT pp.id, pp.invoice_number, pp.client_name, pp.client_email, pp.amount, pp.status, pp.created_at,
                pp.firebase_project_id
         FROM project_payments pp
         JOIN users u ON u.id = pp.user_id
         WHERE u.firebase_uid = $1
           AND pp.invoice_number IS NOT NULL
         ORDER BY pp.created_at DESC
         LIMIT 500`,
        [uid]
      );
      for (const inv of invResult.rows) {
        // Amount is stored in cents in project_payments
        const amountDollars = inv.amount ? inv.amount / 100 : null;
        documents.push({
          doc_type: "invoice",
          doc_title: `Invoice #${inv.invoice_number} — ${inv.client_name || "Client"}`,
          doc_reference: inv.invoice_number,
          external_id: `owlfenc_invoice_${inv.id}`,
          // Project grouping: firebase_project_id links invoice to its parent estimate
          owlfenc_project_id: inv.firebase_project_id || null,
          client_name: inv.client_name || null,
          client_email: inv.client_email || null,
          amount: amountDollars,
          currency: "USD",
          status: inv.status === 'succeeded' ? 'paid' : (inv.status || "pending"),
          created_at: inv.created_at ? new Date(inv.created_at).toISOString() : null,
        });
        breakdown.invoices++;
      }
    } catch (err: any) {
      console.warn("[LEADPRIME-SYNC] Could not read invoices from PostgreSQL:", err.message);
    }
  }

  // ── 3. Digital Contracts from PostgreSQL ─────────────────────────────────
  if (pool) {
    try {
      const ctrResult = await pool.query(
        `SELECT id, contract_id, client_name, client_email, client_address, total_amount, status, created_at, permanent_pdf_url
         FROM digital_contracts
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT 500`,
        [uid]
      );
      for (const ctr of ctrResult.rows) {
        documents.push({
          doc_type: "contract",
          doc_title: `Contract — ${ctr.client_name || "Client"}`,
          doc_reference: ctr.contract_id || ctr.id,
          external_id: `owlfenc_contract_${ctr.id}`,
          // Project grouping: match by client_email + project_address
          client_email: ctr.client_email || null,
          client_name: ctr.client_name || null,
          project_address: ctr.client_address || null,
          amount: ctr.total_amount ? parseFloat(ctr.total_amount) : null,
          currency: "USD",
          doc_url: ctr.permanent_pdf_url || null,
          status: ctr.status || "pending",
          created_at: ctr.created_at ? new Date(ctr.created_at).toISOString() : null,
        });
        breakdown.contracts++;
      }
    } catch (err: any) {
      console.warn("[LEADPRIME-SYNC] Could not read contracts from PostgreSQL:", err.message);
    }
  }
  console.log(`[LEADPRIME-SYNC] ✓ Contracts: ${breakdown.contracts} found`);

  // ── 4. Permit searcheshes from Firebase (two collections) ──────────────────────────
  // PermitAdvisor.tsx saves to 'permit_search_history' (primary).
  // Some older code saved to 'permit_searches'. We read BOTH to avoid missing any records.
  const permitSeenIds = new Set<string>();
  for (const permitCollection of ["permit_search_history", "permit_searches"]) {
    try {
      // NOTE: No orderBy — avoids composite index requirement (userId + createdAt)
      const permitsSnap = await firebaseDb
        .collection(permitCollection)
        .where("userId", "==", uid)
        .limit(200)
        .get();

      for (const doc of permitsSnap.docs) {
        if (permitSeenIds.has(doc.id)) continue; // deduplicate across collections
        permitSeenIds.add(doc.id);
        const p = doc.data();
        documents.push({
          doc_type: "permit",
          doc_title: `Permit Search — ${p.query || p.address || p.city || "Search"}`,
          doc_reference: doc.id,
          external_id: `owlfenc_permit_${doc.id}`,
          // Project grouping: match by address
          client_email: p.clientEmail || null,
          client_name: p.clientName || null,
          project_address: p.address ? `${p.address}${p.city ? ", " + p.city : ""}${p.state ? ", " + p.state : ""}` : null,
          client_name: p.permitType || p.projectType || null,
          doc_url: `${OWL_FENC_BASE_URL}/view/permit/${doc.id}`,
          status: p.status || "completed",
          created_at: p.createdAt?.toDate ? p.createdAt.toDate().toISOString() : (p.createdAt || null),
        });
        breakdown.permits++;
      }
    } catch (err: any) {
      console.warn(`[LEADPRIME-SYNC] Could not read ${permitCollection} from Firebase:`, err.message);
    }
  }
  // ── 5. Property searches from Firebase ───────────────────────────────────
  // FIX: Use 'property_searches' collection (has composite index) instead of
  //      'searches/property/history' subcollection path (no index, causes FAILED_PRECONDITION)
  try {
    const propsSnap = await firebaseDb
      .collection("property_searches")
      .where("userId", "==", uid)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();

    for (const doc of propsSnap.docs) {
      const p = doc.data();
      documents.push({
        doc_type: "other",  // ownership_report — using 'other' until migration 090 is applied in LeadPrime
        doc_title: `Property Research — ${p.address || "Address"}`,
        doc_reference: doc.id,
        external_id: `owlfenc_property_${doc.id}`,
        // Project grouping: match by address
        client_email: p.clientEmail || null,
        client_name: p.ownerName || null,
        project_address: p.address ? `${p.address}${p.city ? ", " + p.city : ""}${p.state ? ", " + p.state : ""}` : null,
        project_name: p.ownerName ? `Owner: ${p.ownerName}` : null,
        doc_url: `${OWL_FENC_BASE_URL}/view/property/${doc.id}`,
        status: p.status || "completed",
        created_at: p.createdAt?.toDate ? p.createdAt.toDate().toISOString() : (p.createdAt || null),
      });
      breakdown.properties++;
    }
  } catch (err: any) {
    console.warn("[LEADPRIME-SYNC] Could not read property searches from Firebase:", err.message);
  }
  console.log(`[LEADPRIME-SYNC] ✓ Permits: ${breakdown.permits}, Properties: ${breakdown.properties} found`);
  console.log(`[LEADPRIME-SYNC] ✓ Total documents to push: ${documents.length}`);

  // ── Push all documents to LeadPrime in batches of 100 ────────────────────
  let totalImported = 0;
  let totalSkipped = 0;

  if (documents.length === 0) {
    console.log(`[LEADPRIME-SYNC] No documents found for uid ${uid}`);
  } else {
    const BATCH_SIZE = 100;
    for (let i = 0; i < documents.length; i += BATCH_SIZE) {
      const batch = documents.slice(i, i + BATCH_SIZE);
      try {
        const result = await callLeadPrime("POST", "/leadprime-network/history", token, {
          documents: batch,
        });
        if (result.ok) {
          totalImported += result.data?.imported || 0;
          totalSkipped += result.data?.skipped || 0;
        } else {
          console.error(`[LEADPRIME-SYNC] Batch ${i / BATCH_SIZE + 1} failed:`, result.data);
          totalSkipped += batch.length;
        }
      } catch (err: any) {
        console.error(`[LEADPRIME-SYNC] Batch ${i / BATCH_SIZE + 1} error:`, err.message);
        totalSkipped += batch.length;
      }
    }
  }

  // ── Update user's sync stats in DB ────────────────────────────────────────
  if (db) {
    try {
      await db
        .update(users)
        .set({
          leadprimeSyncedDocs: totalImported,
          leadprimeLastSync: new Date(),
        })
        .where(eq(users.firebaseUid, uid));
    } catch {}
  }

  console.log(`[LEADPRIME-SYNC] uid=${uid} total=${documents.length} imported=${totalImported} skipped=${totalSkipped}`, breakdown);

  return {
    imported: totalImported,
    skipped: totalSkipped,
    total: documents.length,
    breakdown,
  };
}

export default router;

/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║              OWL FENC — EXTERNAL API (Agent Integration Layer)              ║
 * ║                                                                              ║
 * ║  Exposes 6 tools callable by external agents (LeadPrime, MCP, etc.)         ║
 * ║  Authentication: API keys with format owf_live_<random>                     ║
 * ║                                                                              ║
 * ║  Tools:                                                                      ║
 * ║    POST /api/external/find-or-create-client                                  ║
 * ║    POST /api/external/generate-estimate                                      ║
 * ║    POST /api/external/create-contract-from-estimate                          ║
 * ║    POST /api/external/check-permit                                           ║
 * ║    GET  /api/external/estimate-status/:estimateId                            ║
 * ║    POST /api/external/document-status-update                                 ║
 * ║                                                                              ║
 * ║  API Key Management:                                                         ║
 * ║    POST /api/external/keys          (create key — requires Firebase auth)    ║
 * ║    GET  /api/external/keys          (list keys — requires Firebase auth)     ║
 * ║    DELETE /api/external/keys/:keyId (revoke key — requires Firebase auth)    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { admin } from '../lib/firebase-admin';
import { walletService } from '../services/walletService';
import { FEATURE_CREDIT_COSTS } from '../../shared/wallet-schema';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { universalIntelligenceEngine as uieInstance } from '../services/universalIntelligenceEngine';
import { resendService } from '../services/resendService';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const randomPart = crypto.randomBytes(28).toString('base64url');
  const key = `owf_live_${randomPart}`;
  const prefix = key.substring(0, 16); // "owf_live_XXXXXXX" — safe to display
  const hash = hashApiKey(key);
  return { key, prefix, hash };
}

interface AuthResult {
  userId: string;     // Firebase UID of the Owl Fenc contractor
  keyId: string;      // Firestore document ID of the API key
  keyName: string;    // Human-readable name of the key
}

/**
 * Authenticate an external API key.
 * Keys are stored in Firestore: /external_api_keys/{keyId}
 * {
 *   userId: string,        // Firebase UID of the contractor
 *   keyHash: string,       // SHA-256 hash of the full key
 *   keyPrefix: string,     // First 16 chars (safe to display)
 *   name: string,          // Human-readable label (e.g. "LeadPrime Integration")
 *   isActive: boolean,
 *   createdAt: Timestamp,
 *   lastUsedAt: Timestamp | null,
 *   usageCount: number,
 * }
 */
async function authenticateApiKey(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers['authorization'] as string | undefined;
  const xApiKey = req.headers['x-api-key'] as string | undefined;
  const rawKey = xApiKey || authHeader?.replace('Bearer ', '');

  if (!rawKey || !rawKey.startsWith('owf_live_')) {
    return null;
  }

  const keyHash = hashApiKey(rawKey);
  const db = admin.firestore();

  const snapshot = await db
    .collection('external_api_keys')
    .where('keyHash', '==', keyHash)
    .where('isActive', '==', true)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data();

  // Update last used timestamp and usage count (fire-and-forget)
  doc.ref.update({
    lastUsedAt: admin.firestore.FieldValue.serverTimestamp(),
    usageCount: admin.firestore.FieldValue.increment(1),
  }).catch(() => {/* non-critical */});

  return {
    userId: data.userId,
    keyId: doc.id,
    keyName: data.name || 'Unnamed Key',
  };
}

/**
 * Middleware: require a valid owf_live_ API key.
 * Attaches `req.externalAuth` on success.
 */
async function requireApiKey(req: Request, res: Response, next: Function): Promise<void> {
  try {
    const auth = await authenticateApiKey(req);
    if (!auth) {
      res.status(401).json({
        success: false,
        error: 'INVALID_API_KEY',
        message: 'Provide a valid Owl Fenc API key via Authorization: Bearer owf_live_... or X-API-Key header.',
      });
      return;
    }
    (req as any).externalAuth = auth;
    next();
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'AUTH_ERROR', message: err.message });
  }
}

/**
 * Check credits and deduct after success.
 * Returns false and sends a 402 response if insufficient credits.
 */
async function checkAndDeductCredits(
  res: Response,
  userId: string,
  featureName: keyof typeof FEATURE_CREDIT_COSTS,
  resourceId?: string,
  description?: string
): Promise<boolean> {
  const cost = FEATURE_CREDIT_COSTS[featureName];
  if (cost === 0) return true; // Free feature

  const affordCheck = await walletService.canAfford(userId, cost);
  if (!affordCheck.canAfford) {
    res.status(402).json({
      success: false,
      error: 'INSUFFICIENT_CREDITS',
      message: `Insufficient credits. Need ${cost}, have ${affordCheck.currentBalance}.`,
      required: cost,
      available: affordCheck.currentBalance,
    });
    return false;
  }
  return true;
}

async function deductCredits(
  userId: string,
  featureName: keyof typeof FEATURE_CREDIT_COSTS,
  resourceId?: string,
  description?: string
): Promise<void> {
  const cost = FEATURE_CREDIT_COSTS[featureName];
  if (cost === 0) return;
  try {
    await walletService.deductCredits({
      firebaseUid: userId,
      featureName,
      resourceId,
      description,
      idempotencyKey: resourceId ? `${featureName}:${resourceId}` : undefined,
    });
  } catch (err) {
    console.error(`[EXT-API] Credit deduction failed for ${featureName}:`, err);
    // Non-critical — operation already succeeded
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API KEY MANAGEMENT (requires Firebase auth — contractor manages their own keys)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/external/keys
 * Create a new API key for the authenticated contractor.
 * Body: { name: string }
 * Returns: { keyId, key, prefix, name } — key is shown ONCE, never again.
 */
router.post('/keys', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).firebaseUser?.uid;
    if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const { name } = z.object({ name: z.string().min(1).max(100) }).parse(req.body);

    // Limit: max 5 active keys per user
    const db = admin.firestore();
    const existing = await db
      .collection('external_api_keys')
      .where('userId', '==', userId)
      .where('isActive', '==', true)
      .get();

    if (existing.size >= 5) {
      return res.status(400).json({
        success: false,
        error: 'KEY_LIMIT_REACHED',
        message: 'Maximum 5 active API keys allowed. Revoke an existing key first.',
      });
    }

    const { key, prefix, hash } = generateApiKey();

    const docRef = await db.collection('external_api_keys').add({
      userId,
      keyHash: hash,
      keyPrefix: prefix,
      name,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUsedAt: null,
      usageCount: 0,
    });

    console.log(`🔑 [EXT-API] New API key created for user ${userId}: ${prefix}...`);

    res.status(201).json({
      success: true,
      id: docRef.id,
      key,         // ⚠️ Shown ONCE — contractor must save this
      prefix,      // Safe to display later
      name,
      createdAt: new Date().toISOString(),
      message: 'Save this key securely. It will not be shown again.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'VALIDATION_ERROR', details: err.errors });
    }
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

/**
 * GET /api/external/keys
 * List all API keys for the authenticated contractor (prefix only, never full key).
 */
router.get('/keys', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).firebaseUser?.uid;
    if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const db = admin.firestore();
    const snapshot = await db
      .collection('external_api_keys')
      .where('userId', '==', userId)
      .get();

    const keys = snapshot.docs
      .map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          prefix: d.keyPrefix,
          name: d.name,
          isActive: d.isActive,
          createdAt: d.createdAt?.toDate()?.toISOString() || null,
          lastUsedAt: d.lastUsedAt?.toDate()?.toISOString() || null,
          usageCount: d.usageCount || 0,
        };
      })
      .filter(k => k.isActive !== false)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    res.json({ success: true, keys });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

/**
 * DELETE /api/external/keys/:keyId
 * Revoke an API key.
 */
router.delete('/keys/:keyId', verifyFirebaseAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).firebaseUser?.uid;
    if (!userId) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const db = admin.firestore();
    const docRef = db.collection('external_api_keys').doc(req.params.keyId);
    const doc = await docRef.get();

    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ success: false, error: 'KEY_NOT_FOUND' });
    }

    await docRef.update({ isActive: false });
    console.log(`🔑 [EXT-API] API key revoked: ${req.params.keyId}`);

    res.json({ success: true, message: 'API key revoked successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 1: find_or_create_client
// ─────────────────────────────────────────────────────────────────────────────

const FindOrCreateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * POST /api/external/find-or-create-client
 * Search for an existing client by phone or email. If not found, create a new one.
 * Returns: { clientId, name, isNew, ... }
 *
 * Required: name + (phone OR email)
 * Missing fields response: { error: 'MISSING_REQUIRED_FIELDS', missing: [...] }
 */
router.post('/find-or-create-client', requireApiKey, async (req: Request, res: Response) => {
  const auth = (req as any).externalAuth as AuthResult;

  try {
    const data = FindOrCreateClientSchema.parse(req.body);

    // Validate: need at least phone or email to search/deduplicate
    if (!data.phone && !data.email) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        missing: ['phone or email'],
        message: 'Provide at least a phone number or email to find or create a client.',
      });
    }

    const db = admin.firestore();
    const clientsRef = db.collection('clients');

    // Search by phone first, then by email
    let existingClient: any = null;

    if (data.phone) {
      const phoneSnapshot = await clientsRef
        .where('userId', '==', auth.userId)
        .where('phone', '==', data.phone)
        .limit(1)
        .get();
      if (!phoneSnapshot.empty) {
        existingClient = { id: phoneSnapshot.docs[0].id, ...phoneSnapshot.docs[0].data() };
      }
    }

    if (!existingClient && data.email) {
      const emailSnapshot = await clientsRef
        .where('userId', '==', auth.userId)
        .where('email', '==', data.email)
        .limit(1)
        .get();
      if (!emailSnapshot.empty) {
        existingClient = { id: emailSnapshot.docs[0].id, ...emailSnapshot.docs[0].data() };
      }
    }

    if (existingClient) {
      console.log(`[EXT-API] find-or-create-client: found existing client ${existingClient.id}`);
      return res.json({
        success: true,
        isNew: false,
        clientId: existingClient.id,
        name: existingClient.name,
        phone: existingClient.phone,
        email: existingClient.email,
        address: existingClient.address,
        city: existingClient.city,
        state: existingClient.state,
        zipCode: existingClient.zipCode,
      });
    }

    // Create new client
    const newClient = {
      userId: auth.userId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
      notes: data.notes || null,
      source: `external_api:${auth.keyName}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await clientsRef.add(newClient);
    console.log(`[EXT-API] find-or-create-client: created new client ${docRef.id}`);

    res.status(201).json({
      success: true,
      isNew: true,
      clientId: docRef.id,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zipCode: data.zipCode || null,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const missing = err.errors.map(e => e.path.join('.'));
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        missing,
        message: `Missing or invalid fields: ${missing.join(', ')}`,
      });
    }
    console.error('[EXT-API] find-or-create-client error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 2: generate_estimate
// ─────────────────────────────────────────────────────────────────────────────

const GenerateEstimateSchema = z.object({
  // Client info (use clientId if already created, or provide inline)
  clientId: z.string().optional(),
  clientName: z.string().min(1, 'Client name is required'),
  clientPhone: z.string().optional(),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),

  // Project location (used for local market pricing)
  projectCity: z.string().min(1, 'Project city is required for accurate pricing'),
  projectState: z.string().min(1, 'Project state is required for accurate pricing'),
  projectZip: z.string().optional(),

  // Project description — must be detailed enough for the AI
  projectDescription: z.string().min(15, 'Project description must be at least 15 characters'),

  // Optional financial settings (uses contractor defaults from Settings if not provided)
  taxRate: z.number().min(0).max(30).optional(),
  taxOnMaterialsOnly: z.boolean().optional(),
  overheadPercent: z.number().min(0).max(200).optional(),
  markupPercent: z.number().min(0).max(500).optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
});

/**
 * POST /api/external/generate-estimate
 * Generate a full AI estimate using the Universal Intelligence Engine.
 * Returns: { estimateId, shareUrl, total, itemCount, items[] }
 *
 * Credits: 8 (aiEstimate) + 20 (deepSearchFull) = 28 total
 * Missing fields response: { error: 'MISSING_REQUIRED_FIELDS', missing: [...] }
 */
router.post('/generate-estimate', requireApiKey, async (req: Request, res: Response) => {
  const auth = (req as any).externalAuth as AuthResult;

  try {
    const data = GenerateEstimateSchema.parse(req.body);

    // Check credits upfront (aiEstimate + deepSearchFull)
    const totalCost = FEATURE_CREDIT_COSTS.aiEstimate + FEATURE_CREDIT_COSTS.deepSearchFull;
    const affordCheck = await walletService.canAfford(auth.userId, totalCost);
    if (!affordCheck.canAfford) {
      return res.status(402).json({
        success: false,
        error: 'INSUFFICIENT_CREDITS',
        message: `Insufficient credits. Need ${totalCost}, have ${affordCheck.currentBalance}.`,
        required: totalCost,
        available: affordCheck.currentBalance,
      });
    }

    // Load contractor settings from Firestore for defaults
    const db = admin.firestore();
    let contractorSettings: any = {};
    try {
      const settingsDoc = await db.collection('estimateSettings').doc(auth.userId).get();
      if (settingsDoc.exists) {
        contractorSettings = settingsDoc.data() || {};
      }
    } catch (_) { /* use defaults */ }

    // Load contractor profile for company info
    let contractorProfile: any = {};
    try {
      const profileDoc = await db.collection('contractors').doc(auth.userId).get();
      if (profileDoc.exists) {
        contractorProfile = profileDoc.data() || {};
      }
    } catch (_) { /* use defaults */ }

    // Build location string for the UIE
    const locationStr = [data.projectCity, data.projectState, data.projectZip]
      .filter(Boolean).join(', ');

    console.log(`[EXT-API] generate-estimate: calling UIE for user ${auth.userId}, location: ${locationStr}`);

    // Call the Universal Intelligence Engine
    const uieResult = await uieInstance.estimate(
      data.projectDescription,
      locationStr,
      'full',
      {
        taxRate: data.taxRate ?? contractorSettings.taxRate ?? 0,
        taxOnMaterialsOnly: data.taxOnMaterialsOnly ?? contractorSettings.taxOnMaterialsOnly ?? true,
        overheadPercent: data.overheadPercent ?? contractorSettings.overheadPercent ?? 15,
        markupPercent: data.markupPercent ?? contractorSettings.markupPercent ?? 20,
        crewSize: contractorSettings.defaultCrewSize,
        laborRatePerHour: contractorSettings.defaultLaborRatePerHour,
        fuelCostPerProject: contractorSettings.defaultFuelCostPerProject,
        dumpFeePerProject: contractorSettings.defaultDumpFeePerProject,
        miscCostPercent: contractorSettings.defaultMiscCostPercent,
      }
    );

    const legacyResult = uieInstance.toLegacyFormat(uieResult);

    // Build estimate items from UIE result
    const items = [
      ...(legacyResult.materials || []).map((m: any) => ({
        description: m.description || m.name,
        quantity: m.quantity,
        unit: m.unit,
        unitPrice: m.unitPrice,
        totalPrice: m.totalPrice || m.totalCost || (m.quantity * m.unitPrice),
        category: 'material',
      })),
      ...(legacyResult.laborCosts || []).map((l: any) => ({
        description: l.description || l.name,
        quantity: l.quantity || l.hours || 1,
        unit: l.unit || 'hr',
        unitPrice: l.unitPrice || l.rate,
        totalPrice: l.totalPrice || l.totalCost || l.total,
        category: 'labor',
      })),
    ];

    const subtotal = items.reduce((sum: number, i: any) => sum + (i.totalPrice || 0), 0);
    const taxRate = data.taxRate ?? contractorSettings.taxRate ?? 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = legacyResult.grandTotal || (subtotal + taxAmount);

    // Resolve client info
    let clientData: any = {
      name: data.clientName,
      phone: data.clientPhone || null,
      email: data.clientEmail || null,
      address: data.clientAddress || null,
    };

    if (data.clientId) {
      try {
        const clientDoc = await db.collection('clients').doc(data.clientId).get();
        if (clientDoc.exists && clientDoc.data()?.userId === auth.userId) {
          const cd = clientDoc.data()!;
          clientData = {
            name: cd.name,
            phone: cd.phone || null,
            email: cd.email || null,
            address: [cd.address, cd.city, cd.state, cd.zipCode].filter(Boolean).join(', ') || null,
          };
        }
      } catch (_) { /* use inline data */ }
    }

    // Save estimate to Firebase
    const estimateNumber = `EST-${Date.now()}`;
    const estimateDoc = {
      userId: auth.userId,
      estimateNumber,
      clientId: data.clientId || null,
      client: clientData,
      projectDetails: data.projectDescription,
      projectCity: data.projectCity,
      projectState: data.projectState,
      projectZip: data.projectZip || null,
      items,
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate,
      tax: Math.round(taxAmount * 100) / 100,
      discountType: data.discountType || 'percentage',
      discountValue: data.discountValue || 0,
      discountAmount: 0,
      total: Math.round(total * 100) / 100,
      status: 'draft',
      source: `external_api:${auth.keyName}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const estimateRef = await db.collection('estimates').add(estimateDoc);
    const estimateId = estimateRef.id;

    // Generate shareable URL
    const shareId = crypto.randomBytes(32).toString('hex');
    const shareData = {
      estimateData: {
        client: clientData,
        items,
        projectDetails: data.projectDescription,
        subtotal: estimateDoc.subtotal,
        tax: estimateDoc.tax,
        total: estimateDoc.total,
        taxRate,
        discountType: estimateDoc.discountType,
        discountValue: estimateDoc.discountValue,
        discountAmount: 0,
        contractor: {
          company: contractorProfile.companyName || contractorProfile.businessName || 'Contractor',
          address: contractorProfile.address || null,
          city: contractorProfile.city || null,
          state: contractorProfile.state || null,
          zipCode: contractorProfile.zipCode || null,
          phone: contractorProfile.phone || null,
          email: contractorProfile.email || null,
          license: contractorProfile.licenseNumber || null,
          logo: contractorProfile.logoUrl || null,
        },
        createdAt: new Date().toISOString(),
      },
      shareId,
      estimateNumber,
      firebaseDocId: estimateId,
      contractorId: auth.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      accessCount: 0,
      isActive: true,
    };

    await db.collection('shared_estimates').doc(shareId).set(shareData);

    // Determine the app domain for the share URL
    const host = req.get('host') || 'app.owlfenc.com';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const shareUrl = `${protocol}://${host}/shared-estimate/${shareId}`;

    // Deduct credits after success
    await deductCredits(auth.userId, 'deepSearchFull', estimateId, 'External API: AI Estimate (UIE)');
    await deductCredits(auth.userId, 'aiEstimate', estimateId, 'External API: Estimate Created');

    console.log(`[EXT-API] generate-estimate: success. estimateId=${estimateId}, total=$${total.toFixed(2)}`);

    res.status(201).json({
      success: true,
      estimateId,
      shareUrl,
      shareId,
      estimateNumber,
      total: Math.round(total * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(taxAmount * 100) / 100,
      itemCount: items.length,
      items: items.map((i: any) => ({
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
        category: i.category,
      })),
      projectType: uieResult.projectType,
      confidence: uieResult.confidence,
      warnings: uieResult.warnings || [],
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const missing = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        missing: missing.map(m => m.field),
        details: missing,
        message: `Missing or invalid fields: ${missing.map(m => m.field).join(', ')}`,
      });
    }
    console.error('[EXT-API] generate-estimate error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 3: create_contract_from_estimate
// ─────────────────────────────────────────────────────────────────────────────

const CreateContractSchema = z.object({
  estimateId: z.string().min(1, 'estimateId is required'),
  startDate: z.string().min(1, 'startDate is required (ISO format: YYYY-MM-DD)'),
  paymentTerms: z.string().optional().default('50% upfront, 50% on completion'),
  specialConditions: z.string().optional(),
});

/**
 * POST /api/external/create-contract-from-estimate
 * Convert an approved estimate into a legal contract.
 * Returns: { contractId, contractUrl, status }
 *
 * Credits: 12 (contract)
 */
router.post('/create-contract-from-estimate', requireApiKey, async (req: Request, res: Response) => {
  const auth = (req as any).externalAuth as AuthResult;

  try {
    const data = CreateContractSchema.parse(req.body);

    // Check credits
    if (!(await checkAndDeductCredits(res, auth.userId, 'contract'))) return;

    const db = admin.firestore();

    // Load the estimate
    const estimateDoc = await db.collection('estimates').doc(data.estimateId).get();
    if (!estimateDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'ESTIMATE_NOT_FOUND',
        message: `Estimate ${data.estimateId} not found.`,
      });
    }

    const estimate = estimateDoc.data()!;
    if (estimate.userId !== auth.userId) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'This estimate does not belong to your account.',
      });
    }

    // Load contractor profile
    let contractorProfile: any = {};
    try {
      const profileDoc = await db.collection('contractors').doc(auth.userId).get();
      if (profileDoc.exists) contractorProfile = profileDoc.data() || {};
    } catch (_) {}

    // Build contract document
    const contractData = {
      userId: auth.userId,
      estimateId: data.estimateId,
      clientId: estimate.clientId || null,
      clientName: estimate.client?.name || 'Client',
      clientEmail: estimate.client?.email || null,
      clientPhone: estimate.client?.phone || null,
      clientAddress: estimate.client?.address || null,
      projectAddress: estimate.projectCity
        ? `${estimate.projectCity}, ${estimate.projectState}`
        : (estimate.client?.address || 'Project Address'),
      projectCity: estimate.projectCity || null,
      projectState: estimate.projectState || null,
      projectZip: estimate.projectZip || null,
      projectType: estimate.projectType || 'Construction Project',
      projectDescription: estimate.projectDetails || '',
      startDate: new Date(data.startDate),
      totalAmount: estimate.total || 0,
      paymentTerms: data.paymentTerms,
      specialConditions: data.specialConditions || null,
      contractorName: contractorProfile.ownerName || contractorProfile.name || 'Contractor',
      contractorEmail: contractorProfile.email || null,
      contractorPhone: contractorProfile.phone || null,
      contractorLicense: contractorProfile.licenseNumber || null,
      contractorAddress: contractorProfile.address || null,
      status: 'draft',
      source: `external_api:${auth.keyName}`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const contractRef = await db.collection('contracts').add(contractData);
    const contractId = contractRef.id;

    // Build a shareable contract URL
    const host = req.get('host') || 'app.owlfenc.com';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    const contractUrl = `${protocol}://${host}/contracts/${contractId}`;

    // Deduct credits after success
    await deductCredits(auth.userId, 'contract', contractId, 'External API: Contract from Estimate');

    console.log(`[EXT-API] create-contract: success. contractId=${contractId}`);

    res.status(201).json({
      success: true,
      contractId,
      contractUrl,
      status: 'draft',
      clientName: contractData.clientName,
      totalAmount: contractData.totalAmount,
      message: 'Contract created as draft. Share the contractUrl for digital signature.',
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const missing = err.errors.map(e => e.path.join('.'));
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        missing,
        message: `Missing or invalid fields: ${missing.join(', ')}`,
      });
    }
    console.error('[EXT-API] create-contract error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 4: check_permit
// ─────────────────────────────────────────────────────────────────────────────

const CheckPermitSchema = z.object({
  address: z.string().min(5, 'Full project address is required (street, city, state)'),
  projectType: z.string().min(3, 'Project type is required (e.g., "wood fence installation")'),
  projectDescription: z.string().optional(),
});

/**
 * POST /api/external/check-permit
 * Run the Permit Advisor for a project address and type.
 * Returns: { permitRequired, permits[], estimatedCost, timeline, notes }
 *
 * Credits: 15 (permitReport)
 */
router.post('/check-permit', requireApiKey, async (req: Request, res: Response) => {
  const auth = (req as any).externalAuth as AuthResult;

  try {
    const data = CheckPermitSchema.parse(req.body);

    // Check credits
    if (!(await checkAndDeductCredits(res, auth.userId, 'permitReport'))) return;

    // Import the permit service
    const { permitService } = await import('../services/permitService');

    const result = await permitService.checkPermits(data.address, data.projectType);

    // Deduct credits after success
    await deductCredits(auth.userId, 'permitReport', undefined, 'External API: Permit Check');

    console.log(`[EXT-API] check-permit: success for ${data.address}`);

    res.json({
      success: true,
      address: data.address,
      projectType: data.projectType,
      ...result,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const missing = err.errors.map(e => e.path.join('.'));
      return res.status(400).json({
        success: false,
        error: 'MISSING_REQUIRED_FIELDS',
        missing,
        message: `Missing or invalid fields: ${missing.join(', ')}`,
      });
    }
    console.error('[EXT-API] check-permit error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 5: get_estimate_status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/external/estimate-status/:estimateId
 * Get the current status and summary of an estimate.
 * Returns: { estimateId, estimateNumber, status, total, clientName, shareUrl, createdAt }
 */
router.get('/estimate-status/:estimateId', requireApiKey, async (req: Request, res: Response) => {
  const auth = (req as any).externalAuth as AuthResult;

  try {
    const { estimateId } = req.params;
    const db = admin.firestore();

    const estimateDoc = await db.collection('estimates').doc(estimateId).get();
    if (!estimateDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'ESTIMATE_NOT_FOUND',
        message: `Estimate ${estimateId} not found.`,
      });
    }

    const estimate = estimateDoc.data()!;
    if (estimate.userId !== auth.userId) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'This estimate does not belong to your account.',
      });
    }

    // Find the share URL if it exists
    let shareUrl: string | null = null;
    try {
      const shareSnapshot = await db
        .collection('shared_estimates')
        .where('firebaseDocId', '==', estimateId)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!shareSnapshot.empty) {
        const shareData = shareSnapshot.docs[0].data();
        const host = req.get('host') || 'app.owlfenc.com';
        const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        shareUrl = `${protocol}://${host}/shared-estimate/${shareData.shareId}`;
      }
    } catch (_) {}

    res.json({
      success: true,
      estimateId,
      estimateNumber: estimate.estimateNumber || null,
      status: estimate.status || 'draft',
      total: estimate.total || 0,
      subtotal: estimate.subtotal || 0,
      tax: estimate.tax || 0,
      itemCount: (estimate.items || []).length,
      clientName: estimate.client?.name || null,
      clientPhone: estimate.client?.phone || null,
      projectDetails: estimate.projectDetails || null,
      shareUrl,
      createdAt: estimate.createdAt?.toDate() || null,
      updatedAt: estimate.updatedAt?.toDate() || null,
    });
  } catch (err: any) {
    console.error('[EXT-API] estimate-status error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TOOL 6: document-status-update (LeadPrime → Owl Fenc callback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/external/document-status-update
 * Called by LeadPrime when a recipient approves, declines, or requests changes
 * on a document sent via LeadPrime Network.
 *
 * Auth: Bearer owf_live_<key> (the contractor's Owl Fenc API key stored in LeadPrime)
 * Body: {
 *   document_id: string,       // LeadPrime network document UUID
 *   doc_reference: string,     // Owl Fenc estimate/doc ID (e.g. EST-1777...)
 *   status: 'approved' | 'declined' | 'changes_requested',
 *   note?: string,             // Only present for changes_requested
 *   responded_by?: string,     // LeadPrime contractor UUID of the recipient
 *   responded_at: string,      // ISO 8601 timestamp
 * }
 */
router.post('/document-status-update', requireApiKey, async (req: Request, res: Response) => {
  const auth = (req as any).externalAuth as AuthResult;
  try {
    const bodySchema = z.object({
      document_id: z.string().min(1),
      doc_reference: z.string().optional(),
      status: z.enum(['approved', 'declined', 'changes_requested']),
      note: z.string().optional(),
      responded_by: z.string().optional(),
      responded_at: z.string().optional(),
    });
    const body = bodySchema.parse(req.body);

    const db = admin.firestore();
    const statusMap: Record<string, string> = {
      approved: 'approved',
      declined: 'rejected',
      changes_requested: 'changes_requested',
    };
    const owlfencStatus = statusMap[body.status];

    // ── 1. Try to update the estimate in Firestore by doc_reference ──────────
    let estimateUpdated = false;
    let contractorEmail: string | null = null;
    let estimateNumber: string | null = body.doc_reference || null;
    let clientName: string | null = null;
    let estimateTotal: number | null = null;

    if (body.doc_reference) {
      // Try to find by estimateNumber field first
      const byNumber = await db
        .collection('estimates')
        .where('userId', '==', auth.userId)
        .where('estimateNumber', '==', body.doc_reference)
        .limit(1)
        .get();

      // Also try by Firestore document ID directly
      let estimateDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      if (!byNumber.empty) {
        estimateDoc = byNumber.docs[0];
      } else {
        // Try direct doc ID lookup
        const directDoc = await db.collection('estimates').doc(body.doc_reference).get();
        if (directDoc.exists && directDoc.data()?.userId === auth.userId) {
          estimateDoc = directDoc;
        }
      }

      if (estimateDoc) {
        const estimateData = estimateDoc.data()!;
        clientName = estimateData.client?.name || estimateData.clientName || null;
        estimateTotal = estimateData.total || null;
        estimateNumber = estimateData.estimateNumber || body.doc_reference;

        await estimateDoc.ref.update({
          status: owlfencStatus,
          leadprimeStatus: body.status,
          leadprimeNote: body.note || null,
          leadprimeRespondedAt: body.responded_at || new Date().toISOString(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        estimateUpdated = true;
      }
    }

    // ── 2. Get contractor email from Firebase Auth ────────────────────────────
    try {
      const firebaseUser = await admin.auth().getUser(auth.userId);
      contractorEmail = firebaseUser.email || null;
    } catch (_) { /* non-critical */ }

    // ── 3. Send email notification to contractor ──────────────────────────────
    if (contractorEmail) {
      const statusLabels: Record<string, { emoji: string; label: string; color: string; bgColor: string }> = {
        approved: { emoji: '✅', label: 'Approved', color: '#065f46', bgColor: '#d1fae5' },
        declined: { emoji: '❌', label: 'Declined', color: '#7f1d1d', bgColor: '#fee2e2' },
        changes_requested: { emoji: '✏️', label: 'Changes Requested', color: '#78350f', bgColor: '#fef3c7' },
      };
      const sl = statusLabels[body.status];
      const noteBlock = body.note
        ? `<div style="margin-top:12px;padding:12px;background:#f9fafb;border-left:3px solid #d1d5db;border-radius:4px;">
             <strong style="color:#374151;">Note from recipient:</strong>
             <p style="color:#6b7280;margin:6px 0 0;">${body.note}</p>
           </div>`
        : '';

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <div style="background:${sl.bgColor};padding:20px;border-radius:12px;border-left:4px solid ${sl.color};">
            <h2 style="color:${sl.color};margin:0 0 15px 0;">${sl.emoji} Estimate ${sl.label} via LeadPrime Network</h2>
            ${estimateNumber ? `<p style="color:${sl.color};margin:0 0 8px;"><strong>Estimate:</strong> ${estimateNumber}</p>` : ''}
            ${clientName ? `<p style="color:${sl.color};margin:0 0 8px;"><strong>Client:</strong> ${clientName}</p>` : ''}
            ${estimateTotal ? `<p style="color:${sl.color};margin:0 0 8px;"><strong>Amount:</strong> $${estimateTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>` : ''}
            <p style="color:${sl.color};margin:0;"><strong>Responded:</strong> ${body.responded_at ? new Date(body.responded_at).toLocaleString('en-US') : new Date().toLocaleString('en-US')}</p>
            ${noteBlock}
          </div>
          <p style="color:#6b7280;font-size:12px;margin-top:16px;">This notification was sent automatically by LeadPrime Network. Log in to <a href="https://app.owlfenc.com" style="color:#0ea5e9;">Owl Fenc</a> to view the full estimate.</p>
        </div>
      `;

      await resendService.sendEmail({
        to: contractorEmail,
        subject: `${sl.emoji} Estimate ${sl.label} — ${estimateNumber || body.document_id}`,
        html,
        emailType: 'notification',
        userId: auth.userId,
      }).catch(() => { /* non-critical — don't fail the response */ });
    }

    // ── 4. Respond ────────────────────────────────────────────────────────────
    res.json({
      success: true,
      document_id: body.document_id,
      doc_reference: body.doc_reference || null,
      status: body.status,
      owlfenc_status: owlfencStatus,
      estimate_updated: estimateUpdated,
      contractor_notified: !!contractorEmail,
    });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'INVALID_BODY', details: err.errors });
    }
    console.error('[EXT-API] document-status-update error:', err);
    res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MANIFEST — GET /api/external
// ─────────────────────────────────────────────────────────────────────────────

router.get('/', async (_req: Request, res: Response) => {
  res.json({
    name: 'Owl Fenc External API',
    version: '1.1.0',
    description: 'Agent integration layer for Owl Fenc contractor tools',
    authentication: 'Bearer owf_live_<key> or X-API-Key: owf_live_<key>',
    tools: [
      {
        name: 'find_or_create_client',
        method: 'POST',
        path: '/api/external/find-or-create-client',
        required: ['name', 'phone OR email'],
        optional: ['address', 'city', 'state', 'zipCode', 'notes'],
        credits: 0,
      },
      {
        name: 'generate_estimate',
        method: 'POST',
        path: '/api/external/generate-estimate',
        required: ['clientName', 'projectCity', 'projectState', 'projectDescription (min 15 chars)'],
        optional: ['clientId', 'clientPhone', 'clientEmail', 'clientAddress', 'projectZip', 'taxRate', 'overheadPercent', 'markupPercent'],
        credits: 28,
        note: 'projectDescription must include scope and measurements (e.g. "Install 200 LF wood privacy fence with posts and concrete")',
      },
      {
        name: 'create_contract_from_estimate',
        method: 'POST',
        path: '/api/external/create-contract-from-estimate',
        required: ['estimateId', 'startDate (YYYY-MM-DD)'],
        optional: ['paymentTerms', 'specialConditions'],
        credits: 12,
      },
      {
        name: 'check_permit',
        method: 'POST',
        path: '/api/external/check-permit',
        required: ['address (full: street, city, state)', 'projectType'],
        optional: ['projectDescription'],
        credits: 15,
      },
      {
        name: 'get_estimate_status',
        method: 'GET',
        path: '/api/external/estimate-status/:estimateId',
        required: ['estimateId (URL param)'],
        credits: 0,
      },
      {
        name: 'document_status_update',
        method: 'POST',
        path: '/api/external/document-status-update',
        required: ['document_id', 'status (approved | declined | changes_requested)'],
        optional: ['doc_reference', 'note', 'responded_by', 'responded_at'],
        credits: 0,
        note: 'Called by LeadPrime Network when a recipient responds to a sent document. Updates estimate status in Firestore and notifies the contractor via email.',
      },
    ],
    keyManagement: {
      create: 'POST /api/external/keys (requires Firebase auth)',
      list: 'GET /api/external/keys (requires Firebase auth)',
      revoke: 'DELETE /api/external/keys/:keyId (requires Firebase auth)',
    },
  });
});

export default router;

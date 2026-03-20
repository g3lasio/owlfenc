/**
 * STRIPE WEBHOOKS ROUTES
 * Handles incoming Stripe webhook events for payment automation
 *
 * CRITICAL FIXES (2026-03-20):
 * 1. Raw body MUST be captured BEFORE global express.json() parses the body.
 *    The route-level middleware here runs AFTER global middleware because Express
 *    already consumed the stream. We now use express.raw() at the route level
 *    with a verify callback to stash the raw buffer on req.rawBody.
 * 2. When STRIPE_WEBHOOK_SECRET is missing, return 200 (not 503) so Stripe
 *    does not keep retrying — the event is acknowledged but not processed.
 * 3. When result.success is false (handler-level error), return 200 with a
 *    warning body instead of 400. Stripe treats any non-2xx as a failure and
 *    retries indefinitely. Only return non-2xx for genuine signature failures.
 * 4. Unhandled event types must always return 200.
 */

import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import { stripeWebhookService } from '../services/stripeWebhookService.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// RAW BODY CAPTURE MIDDLEWARE
// Must run BEFORE express.json() has a chance to consume the stream.
// We mount this router BEFORE global express.json() in server/index.ts (see fix).
// As a belt-and-suspenders measure we also capture it here via express.raw().
// ─────────────────────────────────────────────────────────────────────────────
router.use(
  '/stripe',
  express.raw({
    type: ['application/json', '*/*'],
    limit: '2mb',
    verify: (req: any, _res: Response, buf: Buffer) => {
      // Stash raw buffer so signature verification always works,
      // even if a global body-parser has already run.
      req.rawBody = buf;
    },
  })
);

// Stripe webhook endpoint secret (from Stripe dashboard)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_WEBHOOK_SECRET) {
  console.warn('⚠️ [STRIPE-WEBHOOKS] STRIPE_WEBHOOK_SECRET not configured');
  console.warn('⚠️ [STRIPE-WEBHOOKS] Set STRIPE_WEBHOOK_SECRET in Replit Secrets → Deployments → Configuration → Secrets');
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/stripe
// ─────────────────────────────────────────────────────────────────────────────
router.post('/stripe', async (req: any, res: Response) => {
  // ── 1. Acknowledge immediately if webhook secret is not configured ──────────
  // Return 200 so Stripe stops retrying. Log a critical warning.
  if (!STRIPE_WEBHOOK_SECRET) {
    console.error('🚨 [STRIPE-WEBHOOKS] STRIPE_WEBHOOK_SECRET is NOT set in production secrets!');
    console.error('🚨 [STRIPE-WEBHOOKS] Payments are being received but credits CANNOT be granted.');
    console.error('🚨 [STRIPE-WEBHOOKS] ACTION REQUIRED: Add STRIPE_WEBHOOK_SECRET to Replit Secrets.');
    // Return 200 to stop Stripe from retrying — we cannot process without the secret.
    return res.status(200).json({
      received: true,
      warning: 'Webhook received but not processed: STRIPE_WEBHOOK_SECRET not configured',
    });
  }

  const signature = req.headers['stripe-signature'] as string;

  if (!signature) {
    console.error('❌ [STRIPE-WEBHOOKS] Missing Stripe-Signature header — rejecting');
    // 400 is correct here: this is a bad request (not a Stripe retry scenario)
    return res.status(400).json({ error: 'Missing Stripe-Signature header' });
  }

  // ── 2. Resolve raw body ─────────────────────────────────────────────────────
  // Priority: req.rawBody (set by verify callback above) → req.body if Buffer
  let rawBody: Buffer;
  if (req.rawBody && Buffer.isBuffer(req.rawBody)) {
    rawBody = req.rawBody;
  } else if (Buffer.isBuffer(req.body)) {
    rawBody = req.body;
  } else if (typeof req.body === 'string') {
    rawBody = Buffer.from(req.body, 'utf8');
  } else if (req.body && typeof req.body === 'object') {
    // Last resort: global express.json() already parsed it — re-serialize.
    // Signature verification WILL fail in this case because whitespace may differ.
    // This path should never be hit once the route is mounted before express.json().
    console.warn('⚠️ [STRIPE-WEBHOOKS] Body was pre-parsed by express.json() — signature verification may fail.');
    rawBody = Buffer.from(JSON.stringify(req.body), 'utf8');
  } else {
    console.error('❌ [STRIPE-WEBHOOKS] Could not resolve raw body');
    return res.status(400).json({ error: 'Could not resolve raw body for signature verification' });
  }

  console.log(`🔗 [STRIPE-WEBHOOKS] Received webhook — body size: ${rawBody.length} bytes`);

  try {
    // ── 3. Process the event ──────────────────────────────────────────────────
    const result = await stripeWebhookService.processWebhookEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );

    if (result.success) {
      console.log(`✅ [STRIPE-WEBHOOKS] Processed ${result.eventType} (${result.eventId}) → ${result.action}`);
      return res.status(200).json({
        received: true,
        eventType: result.eventType,
        eventId: result.eventId,
        action: result.action,
        userId: result.userId,
      });
    } else {
      // Handler returned success=false (e.g., DB error, missing metadata).
      // Return 200 so Stripe does NOT retry — the event was received and the
      // failure is on our side. We log it for manual investigation.
      console.error(`⚠️ [STRIPE-WEBHOOKS] Handler error for ${result.eventType} (${result.eventId}): ${result.error}`);
      console.error('⚠️ [STRIPE-WEBHOOKS] Returning 200 to prevent Stripe retry loop. Investigate manually.');
      return res.status(200).json({
        received: true,
        warning: 'Event received but handler reported an error',
        eventType: result.eventType,
        eventId: result.eventId,
        error: result.error,
      });
    }

  } catch (error: any) {
    // ── 4. Signature verification failure → 400 (correct — do not retry) ──────
    if (error?.type === 'StripeSignatureVerificationError' || error?.message?.includes('signature')) {
      console.error('❌ [STRIPE-WEBHOOKS] Signature verification FAILED:', error.message);
      console.error('❌ [STRIPE-WEBHOOKS] Possible causes:');
      console.error('   a) STRIPE_WEBHOOK_SECRET does not match the endpoint secret in Stripe Dashboard');
      console.error('   b) Body was modified by a middleware before signature verification');
      console.error('   c) Wrong webhook endpoint selected in Stripe Dashboard');
      return res.status(400).json({
        error: 'Webhook signature verification failed',
        hint: 'Verify STRIPE_WEBHOOK_SECRET matches the endpoint secret in Stripe Dashboard',
      });
    }

    // ── 5. Unexpected server error → 200 to avoid infinite Stripe retries ─────
    console.error('❌ [STRIPE-WEBHOOKS] Unexpected error processing webhook:', error);
    return res.status(200).json({
      received: true,
      warning: 'Unexpected server error — event received but not processed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/webhooks/stripe/health
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stripe/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'stripe-webhooks',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhookSecret: STRIPE_WEBHOOK_SECRET ? 'configured' : 'MISSING — credits will not be granted',
    environment: process.env.NODE_ENV || 'development',
  });
});

export default router;

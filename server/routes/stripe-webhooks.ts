/**
 * STRIPE WEBHOOKS ROUTES
 * Handles incoming Stripe webhook events for payment automation
 */

import { Router } from 'express';
import { stripeWebhookService } from '../services/stripeWebhookService.js';

const router = Router();

// Raw body middleware for Stripe webhook signature verification
router.use('/stripe', (req, res, next) => {
  if (req.headers['content-type'] === 'application/json') {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      req.body = Buffer.from(body, 'utf8');
      next();
    });
  } else {
    next();
  }
});

// Stripe webhook endpoint secret (from Stripe dashboard)
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!STRIPE_WEBHOOK_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ [STRIPE-WEBHOOKS] STRIPE_WEBHOOK_SECRET is required but not configured in production');
    process.exit(1);
  } else {
    console.warn('⚠️ [STRIPE-WEBHOOKS] STRIPE_WEBHOOK_SECRET not configured - webhooks will be disabled in development');
  }
}

/**
 * POST /api/webhooks/stripe
 * Process incoming Stripe webhook events
 */
router.post('/stripe', async (req, res) => {
  try {
    // Check if webhooks are properly configured
    if (!STRIPE_WEBHOOK_SECRET) {
      console.warn('⚠️ [STRIPE-WEBHOOKS] Webhook secret not configured - rejecting webhook');
      return res.status(503).json({
        success: false,
        error: 'Webhook endpoint not configured',
        message: 'STRIPE_WEBHOOK_SECRET is required for webhook processing'
      });
    }
    
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      console.error('❌ [STRIPE-WEBHOOKS] Missing Stripe signature');
      return res.status(400).json({
        success: false,
        error: 'Missing Stripe signature'
      });
    }
    
    console.log('🔗 [STRIPE-WEBHOOKS] Received webhook request');
    
    // Ensure we have a raw buffer for signature verification
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    
    // Process webhook event
    const result = await stripeWebhookService.processWebhookEvent(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
    
    if (result.success) {
      console.log(`✅ [STRIPE-WEBHOOKS] Successfully processed ${result.eventType} (${result.eventId})`);
      
      res.json({
        success: true,
        eventType: result.eventType,
        eventId: result.eventId,
        action: result.action,
        userId: result.userId
      });
    } else {
      console.error(`❌ [STRIPE-WEBHOOKS] Failed to process ${result.eventType}:`, result.error);
      
      res.status(400).json({
        success: false,
        eventType: result.eventType,
        eventId: result.eventId,
        error: result.error
      });
    }
    
  } catch (error) {
    console.error('❌ [STRIPE-WEBHOOKS] Unexpected error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/webhooks/stripe/health
 * Health check for Stripe webhook system
 */
router.get('/stripe/health', (req, res) => {
  res.json({
    success: true,
    service: 'stripe-webhooks',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    webhookSecret: STRIPE_WEBHOOK_SECRET ? 'configured' : 'missing',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * GET /api/webhooks/stripe/test
 * Test endpoint for webhook configuration (development only)
 */
router.get('/stripe/test', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      error: 'Test endpoint not available in production'
    });
  }
  
  res.json({
    success: true,
    message: 'Stripe webhook system is configured',
    environment: process.env.NODE_ENV,
    webhookEndpoint: '/api/webhooks/stripe',
    supportedEvents: [
      'invoice.payment_failed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'invoice.payment_succeeded',
      'customer.subscription.created'
    ]
  });
});

export default router;
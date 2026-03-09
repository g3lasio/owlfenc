/**
 * Public Checkout Routes — Client-Facing Payment Page with Tip Support
 * 
 * These endpoints are PUBLIC (no auth required) because the CLIENT (not the contractor)
 * is the one paying. The payment is identified by a payment ID embedded in the URL.
 * 
 * Decisión 3 — PAYG Strategy:
 * - Client sees payment details + optional tip selector
 * - Tip amount is added to the payment intent before charging
 * - Tip goes 100% to the contractor (no platform fee on tips)
 * - Platform fee (0.5%) is applied only to the base amount
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { createStripeClient, getStripePublishableKey } from '../config/stripe';

const router = Router();
const stripe = createStripeClient();

/**
 * GET /api/public-checkout/:paymentId
 * Returns public-safe payment details for the client checkout page.
 * No auth required — payment ID is the access token.
 */
router.get('/:paymentId', async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    
    if (isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID',
      });
    }

    const payment = await storage.getProjectPayment(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Only expose public-safe fields to the client
    const publicPayment = {
      id: payment.id,
      amount: payment.amount,           // Base amount in cents
      type: payment.type,
      description: payment.description,
      clientName: payment.clientName,
      invoiceNumber: payment.invoiceNumber,
      status: payment.status,
      dueDate: payment.dueDate,
    };

    return res.json({
      success: true,
      data: publicPayment,
      stripePublishableKey: getStripePublishableKey(), // Needed by Stripe Elements
    });

  } catch (error) {
    console.error('❌ [PUBLIC-CHECKOUT] Error fetching payment:', error);
    return res.status(500).json({
      success: false,
      error: 'Error loading payment details',
    });
  }
});

/**
 * POST /api/public-checkout/:paymentId/create-intent
 * Creates a Stripe PaymentIntent with the base amount + optional tip.
 * 
 * Body:
 *   tipAmount: number (in cents, optional, default 0)
 * 
 * The PaymentIntent is created on the contractor's connected Stripe account.
 * Platform fee (0.5%) applies only to the base amount — tips go 100% to contractor.
 */
const createIntentSchema = z.object({
  tipAmount: z.number().int().min(0).default(0), // Tip in cents
});

router.post('/:paymentId/create-intent', async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    
    if (isNaN(paymentId) || paymentId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid payment ID',
      });
    }

    const { tipAmount } = createIntentSchema.parse(req.body);

    const payment = await storage.getProjectPayment(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Only allow creating intents for pending payments
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Payment is already ${payment.status}`,
      });
    }

    // Get the contractor's Stripe Connect account ID
    const user = await storage.getUser(payment.userId);
    if (!user?.stripeConnectAccountId) {
      return res.status(400).json({
        success: false,
        error: 'Contractor Stripe account not configured',
      });
    }

    const baseAmount = Math.round(payment.amount); // Base amount in cents
    const tipCents = Math.round(tipAmount);         // Tip in cents
    const totalAmount = baseAmount + tipCents;       // Total to charge client

    // Platform fee: 0.5% of BASE amount only (tips go 100% to contractor)
    const platformFeeCents = Math.round(baseAmount * 0.005);

    console.log(`💳 [PUBLIC-CHECKOUT] Creating PaymentIntent for payment ${paymentId}`);
    console.log(`   Base: $${(baseAmount / 100).toFixed(2)} | Tip: $${(tipCents / 100).toFixed(2)} | Total: $${(totalAmount / 100).toFixed(2)} | Platform fee: $${(platformFeeCents / 100).toFixed(2)}`);

    // Create PaymentIntent on the contractor's connected account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        paymentId: payment.id.toString(),
        baseAmount: baseAmount.toString(),
        tipAmount: tipCents.toString(),
        invoiceNumber: payment.invoiceNumber || '',
        clientName: payment.clientName || '',
      },
      application_fee_amount: platformFeeCents, // 0.5% platform fee on base only
    }, {
      stripeAccount: user.stripeConnectAccountId,
    });

    return res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      totalAmount,
      baseAmount,
      tipAmount: tipCents,
      platformFee: platformFeeCents,
    });

  } catch (error: any) {
    console.error('❌ [PUBLIC-CHECKOUT] Error creating PaymentIntent:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error creating payment intent',
    });
  }
});

/**
 * POST /api/public-checkout/:paymentId/confirm
 * Called after successful payment to update the payment record status.
 * Validates the PaymentIntent was actually paid before updating.
 */
const confirmSchema = z.object({
  paymentIntentId: z.string().min(1),
  tipAmount: z.number().int().min(0).default(0),
});

router.post('/:paymentId/confirm', async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { paymentIntentId, tipAmount } = confirmSchema.parse(req.body);

    const payment = await storage.getProjectPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const user = await storage.getUser(payment.userId);
    if (!user?.stripeConnectAccountId) {
      return res.status(400).json({ success: false, error: 'Contractor account not configured' });
    }

    // Verify the PaymentIntent status directly with Stripe
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      stripeAccount: user.stripeConnectAccountId,
    });

    if (intent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        error: `Payment not completed. Status: ${intent.status}`,
      });
    }

    // Update payment record
    await storage.updateProjectPayment(paymentId, {
      status: 'succeeded',
      stripePaymentIntentId: paymentIntentId,
      paidDate: new Date(),
      notes: tipAmount > 0
        ? `Paid with $${(tipAmount / 100).toFixed(2)} tip. Total: $${(intent.amount / 100).toFixed(2)}`
        : `Paid via custom checkout. Total: $${(intent.amount / 100).toFixed(2)}`,
    });

    console.log(`✅ [PUBLIC-CHECKOUT] Payment ${paymentId} confirmed. Intent: ${paymentIntentId}. Tip: $${(tipAmount / 100).toFixed(2)}`);

    return res.json({
      success: true,
      message: 'Payment confirmed successfully',
      paidAmount: intent.amount,
      tipAmount,
    });

  } catch (error: any) {
    console.error('❌ [PUBLIC-CHECKOUT] Error confirming payment:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error confirming payment',
    });
  }
});

export default router;

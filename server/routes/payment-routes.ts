import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { projectPaymentService } from '../services/projectPaymentService';
import { storage } from '../storage';
import Stripe from 'stripe';
import express from 'express';
import { isAuthenticated } from '../middleware/auth';

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any,
});

// Schema for validating payment link creation
const createPaymentLinkSchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(3),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  customerEmail: z.string().email().optional(),
  projectId: z.number().optional(),
});

// Schema for validating Stripe Connect account creation
const connectAccountSchema = z.object({
  businessType: z.enum(['individual', 'company']).optional(),
  country: z.string().length(2).optional(), // ISO 2-letter country code
});

const router = Router();

// Get Stripe account status
router.get('/stripe/account-status', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    let hasStripeAccount = false;
    let accountDetails = null;

    try {
      const user = await storage.getUser(userId);
      
      if (user && user.stripeConnectAccountId) {
        hasStripeAccount = true;
        try {
          const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
          accountDetails = {
            id: account.id,
            email: account.email,
            businessType: account.business_type,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            defaultCurrency: account.default_currency,
            country: account.country,
          };
        } catch (error) {
          console.error('Error retrieving Stripe account:', error);
          hasStripeAccount = false;
        }
      }
    } catch (userError) {
      console.log('User not found in storage, returning default status');
      // Continue with default values - this is normal for new users
    }

    return res.json({
      hasStripeAccount,
      accountDetails,
    });
  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    return res.status(500).json({ message: 'Error checking Stripe account status' });
  }
});

// Create Stripe Connect account
router.post('/stripe/connect', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    let user;
    
    try {
      user = await storage.getUser(userId);
    } catch (error) {
      // Create demo user if not found
      console.log('Creating demo user for Stripe Connect');
      user = await storage.createUser({
        username: 'contractor_demo',
        email: 'contractor@owlfence.com',
        password: 'demo_password',
        company: 'Demo Contractor LLC'
      });
    }

    if (!user || !user.email) {
      return res.status(400).json({ message: 'User email is required to create a Stripe account' });
    }

    const validatedData = connectAccountSchema.parse(req.body);

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const refreshUrl = `${baseUrl}/project-payments?refresh=true`;
    const returnUrl = `${baseUrl}/project-payments?setup=success`;

    const accountLink = await projectPaymentService.createConnectAccount({
      userId: user.id,
      email: user.email,
      refreshUrl,
      returnUrl,
      businessType: validatedData.businessType,
      country: validatedData.country,
    });

    res.json({ url: accountLink });
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return res.status(500).json({ message: 'Error creating Stripe Connect account' });
  }
});

// Get Stripe Connect dashboard link
router.get('/stripe/dashboard', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const dashboardLink = await projectPaymentService.createConnectDashboardLink(userId);

    res.json({ url: dashboardLink });
  } catch (error) {
    console.error('Error getting Stripe dashboard link:', error);
    return res.status(500).json({ message: 'Error getting Stripe dashboard link' });
  }
});

// Create a payment link
router.post('/payment-links', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const validatedData = createPaymentLinkSchema.parse(req.body);

    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const successUrl = validatedData.successUrl || `${baseUrl}/payment-tracker?payment=success`;
    const cancelUrl = validatedData.cancelUrl || `${baseUrl}/payment-tracker?payment=canceled`;

    const paymentLinkUrl = await projectPaymentService.createPaymentLink({
      amount: validatedData.amount,
      description: validatedData.description,
      successUrl,
      cancelUrl,
      customerEmail: validatedData.customerEmail,
      userId,
      projectId: validatedData.projectId,
    });

    res.json({ url: paymentLinkUrl });
  } catch (error) {
    console.error('Error creating payment link:', error);
    return res.status(500).json({ message: 'Error creating payment link' });
  }
});

// Get all payment links for the current user
router.get('/payment-links', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const payments = await storage.getProjectPaymentsByUserId(userId);

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payment links:', error);
    return res.status(500).json({ message: 'Error fetching payment links' });
  }
});

// Stripe webhook handler
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    return res.status(400).json({ message: 'Missing Stripe signature' });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn('STRIPE_WEBHOOK_SECRET is not set. Webhook verification will fail.');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`Webhook received: ${event.type}`);

    // Handle the event based on type
    switch (event.type) {
      case 'checkout.session.completed':
        await projectPaymentService.handleProjectCheckoutCompleted(event.data.object);
        break;
      
      case 'payment_intent.succeeded':
        // Handle payment intent success
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent ${paymentIntent.id} succeeded`);
        break;
        
      case 'payment_intent.payment_failed':
        // Handle payment intent failure
        const failedPaymentIntent = event.data.object;
        console.log(`PaymentIntent ${failedPaymentIntent.id} failed`);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return res.status(400).json({ message: 'Webhook error' });
  }
});

export default router;
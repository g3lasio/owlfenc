import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { projectPaymentService } from '../services/projectPaymentService';
import { storage } from '../storage';
import Stripe from 'stripe';
import express from 'express';
import { isAuthenticated } from '../middleware/auth';
import { createStripeClient } from '../config/stripe';

// Initialize Stripe with centralized configuration
const stripe = createStripeClient();

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

// DEPRECATED: Using contractor-payment-routes.ts instead for Stripe Connect
// Get Stripe account status - simplified version for testing
router.get('/stripe/account-status-OLD', async (req: Request, res: Response) => {
  try {
    // For now, return a default status that indicates no Stripe account
    // This allows the frontend to work and show the "Connect Bank Account" button
    const response = {
      hasStripeAccount: false,
      accountDetails: null,
    };

    console.log('Stripe account status check - returning default status');
    return res.json(response);
  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    return res.status(500).json({ message: 'Error checking Stripe account status' });
  }
});

// DEPRECATED: Using contractor-payment-routes.ts Account Links implementation instead
// Create Stripe Connect account using OAuth
router.post('/stripe/connect-OLD', async (req: Request, res: Response) => {
  try {
    console.log('Initiating Stripe Connect OAuth flow');
    
    const validatedData = connectAccountSchema.parse(req.body);

    const baseUrl = 'https://4d52eb7d-89c5-4768-b289-5b2d76991682-00-1ovgjat7mg0re.riker.replit.dev';
    const clientId = 'ca_SPYH601QeKcuZgmB8iBIQRh7sjokOagL';
    
    // Generate a unique state parameter for security
    const state = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build OAuth URL for Stripe Connect
    const oauthUrl = new URL('https://connect.stripe.com/oauth/authorize');
    oauthUrl.searchParams.append('response_type', 'code');
    oauthUrl.searchParams.append('client_id', clientId);
    oauthUrl.searchParams.append('scope', 'read_write');
    oauthUrl.searchParams.append('redirect_uri', `${baseUrl}/project-payments?setup=oauth`);
    oauthUrl.searchParams.append('state', state);
    
    // Optional: suggest account type based on business type
    if (validatedData.businessType === 'individual') {
      oauthUrl.searchParams.append('stripe_user[business_type]', 'individual');
    } else if (validatedData.businessType === 'company') {
      oauthUrl.searchParams.append('stripe_user[business_type]', 'company');
    }
    
    // Optional: suggest country
    if (validatedData.country) {
      oauthUrl.searchParams.append('stripe_user[country]', validatedData.country);
    }
    
    console.log(`Stripe Connect OAuth URL generated: ${oauthUrl.toString()}`);
    res.json({ 
      success: true,
      url: oauthUrl.toString(),
      message: "Stripe Connect OAuth URL generated successfully"
    });
  } catch (error) {
    console.error('Error creating Stripe Connect OAuth URL:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error creating Stripe Connect OAuth URL',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// DEPRECATED: Using contractor-payment-routes.ts implementation
// Handle OAuth callback from Stripe Connect  
router.get('/stripe/oauth/callback-OLD', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      console.error('Stripe OAuth error:', error);
      return res.redirect('/project-payments?error=oauth_failed');
    }

    if (!code) {
      return res.status(400).json({ message: 'Authorization code is required' });
    }

    // Exchange authorization code for access token
    const tokenResponse = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code: code as string,
    });

    const { stripe_user_id, access_token } = tokenResponse;

    console.log(`Stripe Connect account connected: ${stripe_user_id}`);

    // Redirect back to the payments page with success
    res.redirect('/project-payments?setup=success&account=' + stripe_user_id);
  } catch (error) {
    console.error('Error handling Stripe OAuth callback:', error);
    res.redirect('/project-payments?error=oauth_failed');
  }
});

// DEPRECATED: Using contractor-payment-routes.ts implementation
// Get Stripe Connect dashboard link
router.get('/stripe/dashboard-OLD', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || typeof req.user === 'string') {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    const userId = (req.user as any).id;
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
    if (!req.user || typeof req.user === 'string') {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    const userId = (req.user as any).id;
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
    if (!req.user || typeof req.user === 'string') {
      return res.status(401).json({ message: 'Usuario no autenticado' });
    }
    const userId = (req.user as any).id;
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
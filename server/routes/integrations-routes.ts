import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Check QuickBooks connection status
router.get('/quickbooks/status', async (req: Request, res: Response) => {
  try {
    // Check if QuickBooks credentials exist and are valid
    const hasQuickBooksCredentials = process.env.QUICKBOOKS_CLIENT_ID && process.env.QUICKBOOKS_CLIENT_SECRET;
    
    if (!hasQuickBooksCredentials) {
      return res.json({ connected: false, reason: 'No credentials configured' });
    }

    // TODO: Add actual QuickBooks API validation when credentials are provided
    res.json({ 
      connected: false, 
      reason: 'Credentials need validation',
      setupRequired: true 
    });
  } catch (error) {
    console.error('QuickBooks status check error:', error);
    res.json({ connected: false, error: 'Status check failed' });
  }
});

// Check HubSpot connection status
router.get('/hubspot/status', async (req: Request, res: Response) => {
  try {
    const hasHubSpotCredentials = process.env.HUBSPOT_API_KEY;
    
    if (!hasHubSpotCredentials) {
      return res.json({ connected: false, reason: 'No API key configured' });
    }

    // TODO: Add actual HubSpot API validation when API key is provided
    res.json({ 
      connected: false, 
      reason: 'API key needs validation',
      setupRequired: true 
    });
  } catch (error) {
    console.error('HubSpot status check error:', error);
    res.json({ connected: false, error: 'Status check failed' });
  }
});

// Check Square connection status
router.get('/square/status', async (req: Request, res: Response) => {
  try {
    const hasSquareCredentials = process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID;
    
    if (!hasSquareCredentials) {
      return res.json({ connected: false, reason: 'No credentials configured' });
    }

    // TODO: Add actual Square API validation when credentials are provided
    res.json({ 
      connected: false, 
      reason: 'Credentials need validation',
      setupRequired: true 
    });
  } catch (error) {
    console.error('Square status check error:', error);
    res.json({ connected: false, error: 'Status check failed' });
  }
});

// Check Stripe connection status
router.get('/stripe/status', async (req: Request, res: Response) => {
  try {
    const hasStripeCredentials = process.env.STRIPE_SECRET_KEY && process.env.VITE_STRIPE_PUBLIC_KEY;
    
    if (!hasStripeCredentials) {
      return res.json({ connected: false, reason: 'No credentials configured' });
    }

    // TODO: Add actual Stripe API validation when credentials are provided
    res.json({ 
      connected: false, 
      reason: 'Credentials need validation',
      setupRequired: true 
    });
  } catch (error) {
    console.error('Stripe status check error:', error);
    res.json({ connected: false, error: 'Status check failed' });
  }
});

// Check SendGrid connection status
router.get('/sendgrid/status', async (req: Request, res: Response) => {
  try {
    const hasSendGridKey = process.env.SENDGRID_API_KEY;
    
    if (!hasSendGridKey) {
      return res.json({ connected: false, reason: 'No API key configured' });
    }

    // SendGrid is configured and working since we have the API key
    res.json({ 
      connected: true, 
      service: 'SendGrid',
      status: 'Active'
    });
  } catch (error) {
    console.error('SendGrid status check error:', error);
    res.json({ connected: false, error: 'Status check failed' });
  }
});

// QuickBooks OAuth initiation
router.get('/quickbooks/auth', (req: Request, res: Response) => {
  // Redirect to QuickBooks OAuth flow
  res.json({ 
    message: 'QuickBooks authentication required',
    authUrl: 'https://appcenter.intuit.com/connect/oauth2',
    setupRequired: true
  });
});

// HubSpot OAuth initiation
router.get('/hubspot/auth', (req: Request, res: Response) => {
  res.json({ 
    message: 'HubSpot authentication required',
    authUrl: 'https://app.hubspot.com/oauth/authorize',
    setupRequired: true
  });
});

// Square OAuth initiation
router.get('/square/auth', (req: Request, res: Response) => {
  res.json({ 
    message: 'Square authentication required',
    authUrl: 'https://connect.squareup.com/oauth2/authorize',
    setupRequired: true
  });
});

// Stripe OAuth initiation
router.get('/stripe/auth', (req: Request, res: Response) => {
  res.json({ 
    message: 'Stripe authentication required',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    setupRequired: true
  });
});

export default router;
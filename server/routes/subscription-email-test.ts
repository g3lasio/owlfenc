/**
 * SUBSCRIPTION EMAIL TEST ROUTES
 * Endpoints para probar el sistema de emails de suscripción
 * Solo para desarrollo/debugging
 */

import { Request, Response, Router } from 'express';
import { subscriptionEmailService } from '../services/subscriptionEmailService';

const router = Router();

router.post('/test-welcome', async (req: Request, res: Response) => {
  try {
    const { email, userName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`🧪 [EMAIL-TEST] Testing welcome email to: ${email}`);
    
    const result = await subscriptionEmailService.sendWelcomeEmail({
      email,
      userName: userName || email.split('@')[0]
    });
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Welcome email sent successfully',
        emailId: result.emailId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
    
  } catch (error) {
    console.error('❌ [EMAIL-TEST] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.post('/test-trial-activated', async (req: Request, res: Response) => {
  try {
    const { email, userName } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    console.log(`🧪 [EMAIL-TEST] Testing trial activated email to: ${email}`);
    
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 14);
    
    const result = await subscriptionEmailService.sendTrialActivatedEmail({
      email,
      userName: userName || email.split('@')[0],
      trialEndDate
    });
    
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Trial activated email sent successfully',
        emailId: result.emailId 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        error: result.error 
      });
    }
    
  } catch (error) {
    console.error('❌ [EMAIL-TEST] Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

router.get('/status', async (_req: Request, res: Response) => {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    
    res.json({
      service: 'subscription-email',
      status: resendApiKey ? 'configured' : 'missing_api_key',
      apiKeyPrefix: resendApiKey ? resendApiKey.substring(0, 10) + '...' : null,
      fromEmail: 'Owl Fenc <noreply@owlfenc.com>'
    });
    
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export function registerSubscriptionEmailTestRoutes(app: any) {
  app.use('/api/subscription-email-test', router);
  console.log('🧪 [SUBSCRIPTION-EMAIL-TEST] Test routes registered at /api/subscription-email-test');
}

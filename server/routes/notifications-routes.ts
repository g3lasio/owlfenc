import { Router } from 'express';
import type { Request, Response } from 'express';
import sgMail from '@sendgrid/mail';

const router = Router();

// Configure SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

// Update email notification preferences
router.post('/email-preferences', async (req: Request, res: Response) => {
  try {
    const { type, enabled } = req.body;
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!type || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Type and enabled status required' });
    }
    
    // In a real implementation, this would save to database
    // For now, we'll store in memory or session
    console.log(`Email notification preference updated for user ${userId}: ${type} = ${enabled}`);
    
    // If enabling email notifications, verify SendGrid is configured
    if (enabled && process.env.SENDGRID_API_KEY) {
      try {
        // Send a test notification to verify setup
        const msg = {
          to: req.user?.email || 'test@example.com',
          from: process.env.EMAIL_FROM || 'noreply@owlfence.com',
          subject: 'Notification Preferences Updated',
          text: `Your ${type} email notifications have been ${enabled ? 'enabled' : 'disabled'}.`,
          html: `<p>Your <strong>${type}</strong> email notifications have been <strong>${enabled ? 'enabled' : 'disabled'}</strong>.</p>`
        };
        
        await sgMail.send(msg);
        console.log('Test email sent successfully');
      } catch (emailError) {
        console.warn('Email sending failed:', emailError);
        // Don't fail the preference update if email fails
      }
    }
    
    res.json({
      success: true,
      message: `Email notifications for ${type} ${enabled ? 'enabled' : 'disabled'}`,
      type,
      enabled
    });
  } catch (error) {
    console.error('Email preference update error:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
});

// Update SMS notification preferences
router.post('/sms-preferences', async (req: Request, res: Response) => {
  try {
    const { type, enabled } = req.body;
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!type || typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Type and enabled status required' });
    }
    
    // In a real implementation, this would save to database
    console.log(`SMS notification preference updated for user ${userId}: ${type} = ${enabled}`);
    
    // For SMS, you would integrate with Twilio or similar service
    // This is where real SMS functionality would be implemented
    
    res.json({
      success: true,
      message: `SMS notifications for ${type} ${enabled ? 'enabled' : 'disabled'}`,
      type,
      enabled
    });
  } catch (error) {
    console.error('SMS preference update error:', error);
    res.status(500).json({ error: 'Failed to update SMS preferences' });
  }
});

// Get current notification preferences
router.get('/preferences', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // In a real implementation, this would fetch from database
    const preferences = {
      email: {
        newProjects: true,
        payments: true,
        permits: true
      },
      sms: {
        emergency: true,
        clientCommunications: false
      },
      quietHours: {
        start: '22:00',
        end: '07:00'
      }
    };
    
    res.json(preferences);
  } catch (error) {
    console.error('Preference fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Send test notification
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { type } = req.body; // 'email' or 'sms'
    const userId = req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (type === 'email' && process.env.SENDGRID_API_KEY) {
      const msg = {
        to: req.user?.email || 'test@example.com',
        from: process.env.EMAIL_FROM || 'noreply@owlfence.com',
        subject: 'Test Notification - Owl Fence',
        text: 'This is a test notification from your Owl Fence dashboard.',
        html: '<p>This is a <strong>test notification</strong> from your Owl Fence dashboard.</p>'
      };
      
      await sgMail.send(msg);
      res.json({ success: true, message: 'Test email sent successfully' });
    } else if (type === 'sms') {
      // SMS test would go here with Twilio integration
      res.json({ success: true, message: 'SMS testing not yet implemented' });
    } else {
      res.status(400).json({ error: 'Invalid notification type or service not configured' });
    }
  } catch (error) {
    console.error('Test notification error:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
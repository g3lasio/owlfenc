/**
 * Email Tracking API Routes
 * Real-time email delivery status monitoring
 */

import { Router } from 'express';
import { emailTracker } from '../services/emailDeliveryTracker';

const router = Router();

/**
 * GET /api/email-tracking/status/:emailId
 * Get delivery status for specific email
 */
router.get('/status/:emailId', async (req, res) => {
  try {
    const { emailId } = req.params;
    
    console.log(`📊 [EMAIL-TRACKING-API] Checking status for email: ${emailId}`);
    
    const status = await emailTracker.getDeliveryStatus(emailId);
    
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Email tracking not found',
        emailId
      });
    }

    console.log(`📊 [EMAIL-TRACKING-API] Status retrieved:`, status);

    res.json({
      success: true,
      emailId,
      status: status.status,
      actuallyDelivered: status.actuallyDelivered,
      timestamp: status.timestamp,
      recipient: status.recipient,
      subject: status.subject,
      fromAddress: status.fromAddress,
      deliveryDetails: status.deliveryDetails,
      error: status.error
    });

  } catch (error: any) {
    console.error('📊 [EMAIL-TRACKING-API] Error checking status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking email status',
      error: error.message
    });
  }
});

/**
 * GET /api/email-tracking/summary
 * Get delivery summary for all tracked emails
 */
router.get('/summary', async (req, res) => {
  try {
    console.log('📊 [EMAIL-TRACKING-API] Getting delivery summary...');
    
    const summary = emailTracker.getDeliverySummary();
    
    console.log('📊 [EMAIL-TRACKING-API] Summary:', summary);

    res.json({
      success: true,
      summary,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📊 [EMAIL-TRACKING-API] Error getting summary:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting email summary',
      error: error.message
    });
  }
});

/**
 * GET /api/email-tracking/recent
 * Get recent email deliveries
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    console.log(`📊 [EMAIL-TRACKING-API] Getting recent ${limit} emails...`);
    
    const allEmails = emailTracker.getAllTrackedEmails();
    const recent = allEmails
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    console.log(`📊 [EMAIL-TRACKING-API] Found ${recent.length} recent emails`);

    res.json({
      success: true,
      emails: recent,
      total: allEmails.length,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📊 [EMAIL-TRACKING-API] Error getting recent emails:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting recent emails',
      error: error.message
    });
  }
});

/**
 * POST /api/email-tracking/validate-email
 * Validate email deliverability
 */
router.post('/validate-email', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    console.log(`📊 [EMAIL-TRACKING-API] Validating email: ${email}`);
    
    const validation = await emailTracker.validateEmailDeliverability(email);
    
    console.log(`📊 [EMAIL-TRACKING-API] Validation result:`, validation);

    res.json({
      success: true,
      email,
      validation,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📊 [EMAIL-TRACKING-API] Error validating email:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating email',
      error: error.message
    });
  }
});

/**
 * DELETE /api/email-tracking/cleanup
 * Clean up old tracking data
 */
router.delete('/cleanup', async (req, res) => {
  try {
    console.log('📊 [EMAIL-TRACKING-API] Cleaning up old tracking data...');
    
    const removedCount = emailTracker.cleanupOldTracking();
    
    console.log(`📊 [EMAIL-TRACKING-API] Cleaned up ${removedCount} old records`);

    res.json({
      success: true,
      message: `Cleaned up ${removedCount} old tracking records`,
      removedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('📊 [EMAIL-TRACKING-API] Error during cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error during cleanup',
      error: error.message
    });
  }
});

export default router;
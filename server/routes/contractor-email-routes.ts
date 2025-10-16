import express from 'express';
import { ContractorEmailService, contractorEmailService } from '../services/contractorEmailService';

const router = express.Router();

/**
 * Test SendGrid configuration
 * GET /api/contractor-email/test-config
 */
router.get('/test-config', async (req, res) => {
  try {
    const hasApiKey = !!process.env.SENDGRID_API_KEY;
    const apiKeyLength = process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.length : 0;
    
    res.json({
      success: true,
      config: {
        hasApiKey,
        apiKeyLength,
        apiKeyPrefix: process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.substring(0, 10) + '...' : 'Not set'
      }
    });
  } catch (error) {
    console.error('Error checking SendGrid config:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking configuration'
    });
  }
});

/**
 * Validate contractor email capability
 * POST /api/contractor-email/validate
 */
router.post('/validate', async (req, res) => {
  try {
    const { contractorEmail } = req.body;

    if (!contractorEmail) {
      return res.status(400).json({
        success: false,
        message: 'Contractor email is required'
      });
    }

    const result = await contractorEmailService.validateContractorEmailCapability(contractorEmail);
    res.json(result);

  } catch (error) {
    console.error('Error validating contractor email:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating email capability'
    });
  }
});

/**
 * Send estimate email from contractor to client
 * POST /api/contractor-email/send-estimate
 */
router.post('/send-estimate', async (req, res) => {
  try {
    const {
      contractorEmail,
      contractorName,
      contractorProfile,
      clientEmail,
      clientName,
      estimateData,
      customMessage,
      customSubject,
      sendCopy
    } = req.body;

    // Validate required fields
    if (!contractorEmail || !clientEmail || !estimateData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contractor email, client email, or estimate data'
      });
    }

    // Create estimate email template using service
    const template = ContractorEmailService.createEstimateTemplate(
      clientName,
      contractorName,
      contractorProfile || { email: contractorEmail, companyName: contractorName, displayName: contractorName },
      estimateData,
      customMessage
    );

    // Override subject if custom subject provided
    if (customSubject) {
      template.subject = customSubject;
    }

    // Send email using contractor email service
    const result = await contractorEmailService.sendContractorEmail({
      contractorEmail,
      contractorName,
      clientEmail,
      clientName,
      template,
      sendCopy
    });

    res.json(result);

  } catch (error) {
    console.error('Error sending estimate email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send estimate email. Please check your email configuration.'
    });
  }
});

/**
 * Send general notification email from contractor to client
 * POST /api/contractor-email/send-notification
 */
router.post('/send-notification', async (req, res) => {
  try {
    const {
      contractorEmail,
      contractorName,
      clientEmail,
      clientName,
      subject,
      message,
      htmlContent,
      sendCopy
    } = req.body;

    if (!contractorEmail || !clientEmail || !subject || (!message && !htmlContent)) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: emails, subject, or message content'
      });
    }

    const template = {
      subject,
      html: htmlContent || `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2>Message from ${contractorName}</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <div style="white-space: pre-wrap;">${message}</div>
          </div>
          <p>Best regards,<br><strong>${contractorName}</strong></p>
        </div>
      `,
      text: message || 'Please check the HTML version of this email.'
    };

    const result = await contractorEmailService.sendContractorEmail({
      contractorEmail,
      contractorName,
      clientEmail,
      clientName,
      template,
      sendCopy
    });

    res.json(result);

  } catch (error) {
    console.error('Error sending notification email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification email. Please check your email configuration.'
    });
  }
});

export default router;

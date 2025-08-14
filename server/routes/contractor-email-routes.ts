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
 * Verify contractor email with SendGrid
 * POST /api/contractor-email/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email and name are required'
      });
    }

    const result = await ContractorEmailService.verifyContractorEmail(email, name);

    res.json(result);
  } catch (error) {
    console.error('Error in email verification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification'
    });
  }
});

/**
 * Complete email verification when user clicks the link
 * GET /api/contractor-email/complete-verification
 */
router.get('/complete-verification', async (req, res) => {
  try {
    const { token, email } = req.query;

    if (!token || !email) {
      return res.status(400).json({
        success: false,
        message: 'Verification token and email are required'
      });
    }

    const result = await ContractorEmailService.completeEmailVerification(token as string, email as string);
    
    // Usar URL builder para redirecciones dinámicas
    const { buildEmailVerificationUrl } = await import('../utils/url-builder');
    
    if (result.success) {
      const verificationUrl = buildEmailVerificationUrl(req, '', true);
      res.redirect(verificationUrl);
    } else {
      const verificationUrl = buildEmailVerificationUrl(req, '', false);
      res.redirect(verificationUrl);
    }
  } catch (error) {
    console.error('Error completing verification:', error);
    const { buildEmailVerificationUrl } = await import('../utils/url-builder');
    const errorUrl = buildEmailVerificationUrl(req, '', false);
    res.redirect(errorUrl);
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

    // Create estimate email template using new service
    const template = ContractorEmailService.createEstimateTemplate(
      clientName,
      contractorName,
      contractorProfile || { email: contractorEmail, companyName: contractorName },
      estimateData,
      customMessage
    );

    // Override subject if custom subject provided
    if (customSubject) {
      template.subject = customSubject;
    }

    // Send email using new contractor email service
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
      message: 'Failed to send estimate email. Please check your email verification status.'
    });
  }
});

/**
 * Send contract email from contractor to client
 * POST /api/contractor-email/send-contract
 */
router.post('/send-contract', async (req, res) => {
  try {
    const {
      contractorEmail,
      contractorName,
      contractorProfile,
      clientEmail,
      clientName,
      contractData,
      customMessage,
      customSubject,
      sendCopy
    } = req.body;

    if (!contractorEmail || !clientEmail || !contractData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contractor email, client email, or contract data'
      });
    }

    const template = ContractorEmailService.createContractTemplate(
      clientName,
      contractorName,
      contractorProfile,
      contractData,
      customMessage
    );

    if (customSubject) {
      template.subject = customSubject;
    }

    const result = await ContractorEmailService.sendContractorEmail({
      contractorEmail,
      contractorName,
      clientEmail,
      clientName,
      template,
      sendCopy
    });

    res.json(result);

  } catch (error) {
    console.error('Error sending contract email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send contract email. Please check your email verification status.'
    });
  }
});

/**
 * Send payment link email from contractor to client
 * POST /api/contractor-email/send-payment
 */
router.post('/send-payment', async (req, res) => {
  try {
    const {
      contractorEmail,
      contractorName,
      contractorProfile,
      clientEmail,
      clientName,
      paymentData,
      customMessage,
      customSubject,
      sendCopy
    } = req.body;

    if (!contractorEmail || !clientEmail || !paymentData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contractor email, client email, or payment data'
      });
    }

    const template = ContractorEmailService.createPaymentTemplate(
      clientName,
      contractorName,
      contractorProfile,
      paymentData,
      customMessage
    );

    if (customSubject) {
      template.subject = customSubject;
    }

    const result = await ContractorEmailService.sendContractorEmail({
      contractorEmail,
      contractorName,
      clientEmail,
      clientName,
      template,
      sendCopy
    });

    res.json(result);

  } catch (error) {
    console.error('Error sending payment email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send payment email. Please check your email verification status.'
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

    const result = await ContractorEmailService.sendContractorEmail({
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
      message: 'Failed to send notification email. Please check your email verification status.'
    });
  }
});

/**
 * Check contractor email verification status
 * GET /api/contractor-email/status/:email
 */
/**
 * Verify contractor email with SendGrid
 * POST /api/contractor-email/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const result = await ContractorEmailService.verifyContractorEmail(email, name || 'Contractor');
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Verification email sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message
      });
    }
  } catch (error) {
    console.error('Error in email verification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * Check email verification status
 * POST /api/contractor-email/check-verification
 */
router.post('/check-verification', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const status = await ContractorEmailService.checkVerificationStatus(email);
    
    res.json({
      success: true,
      verified: status.verified,
      pending: status.pending
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({
      success: false,
      verified: false,
      pending: false
    });
  }
});

router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const status = await ContractorEmailService.checkVerificationStatus(email);
    
    res.json({
      success: true,
      email,
      verified: status.verified,
      pending: status.pending,
      message: 'Email verification status retrieved'
    });

  } catch (error) {
    console.error('Error checking email status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check email verification status'
    });
  }
});

export default router;
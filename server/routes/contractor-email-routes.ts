import express from 'express';
import ContractorEmailService from '../services/contractorEmailService.js';

const router = express.Router();

/**
 * Verify contractor email with SendGrid
 * POST /api/contractor-email/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { contractorEmail, contractorName } = req.body;

    if (!contractorEmail || !contractorName) {
      return res.status(400).json({
        success: false,
        message: 'Contractor email and name are required'
      });
    }

    const result = await ContractorEmailService.verifyContractorEmail(contractorEmail, contractorName);

    if (result) {
      res.json({
        success: true,
        message: 'Verification email sent to contractor. Please check your email and click the verification link.',
        action: 'verification_sent'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.'
      });
    }
  } catch (error) {
    console.error('Error in email verification:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during email verification'
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

    // Create estimate email template
    const template = ContractorEmailService.createEstimateTemplate(
      clientName,
      contractorName,
      contractorProfile,
      estimateData,
      customMessage
    );

    // Override subject if custom subject provided
    if (customSubject) {
      template.subject = customSubject;
    }

    // Send email using contractor email service
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
/**
 * SMS Routes for Contract Delivery
 * Handles SMS notifications via Twilio integration
 */

import { Router } from 'express';
import { twilioService } from '../services/twilioService';
import { resendEmailAdvanced } from '../services/resendEmailAdvanced';

const router = Router();

// Send contract notification SMS
router.post('/contract-notification', async (req, res) => {
  try {
    const {
      to,
      clientName,
      contractorName,
      contractorCompany,
      projectType,
      contractUrl
    } = req.body;

    console.log('📱 [SMS-API] Contract notification request received');
    console.log('📱 [SMS-API] To:', to);
    console.log('📱 [SMS-API] Client:', clientName);
    console.log('📱 [SMS-API] Contractor:', contractorName, contractorCompany);

    if (!to || !clientName || !contractorName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, clientName, contractorName'
      });
    }

    const result = await twilioService.sendContractNotification({
      to,
      clientName,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      projectType: projectType || 'construction project',
      contractUrl
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [SMS-API] Contract notification error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error sending SMS'
    });
  }
});

// Send verification code SMS
router.post('/verification', async (req, res) => {
  try {
    const { to, code, contractorName } = req.body;

    console.log('📱 [SMS-API] Verification SMS request received');
    console.log('📱 [SMS-API] To:', to);
    console.log('📱 [SMS-API] Contractor:', contractorName);

    if (!to || !code || !contractorName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, code, contractorName'
      });
    }

    const result = await twilioService.sendVerificationCode({
      to,
      code,
      contractorName
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [SMS-API] Verification SMS error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error sending verification SMS'
    });
  }
});

// Send contract completion SMS
router.post('/completion', async (req, res) => {
  try {
    const {
      to,
      clientName,
      contractorName,
      contractorCompany,
      projectType
    } = req.body;

    console.log('📱 [SMS-API] Completion SMS request received');
    console.log('📱 [SMS-API] To:', to);
    console.log('📱 [SMS-API] Client:', clientName);
    console.log('📱 [SMS-API] Contractor:', contractorName, contractorCompany);

    if (!to || !clientName || !contractorName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, clientName, contractorName'
      });
    }

    const result = await twilioService.sendContractCompletion({
      to,
      clientName,
      contractorName,
      contractorCompany: contractorCompany || contractorName,
      projectType: projectType || 'construction project'
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [SMS-API] Completion SMS error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error sending completion SMS'
    });
  }
});

// Get SMS service status
router.get('/status', (req, res) => {
  try {
    const status = twilioService.getServiceStatus();
    
    res.json({
      success: true,
      status: {
        configured: status.configured,
        hasCredentials: status.hasCredentials,
        fromNumber: status.fromNumber ? 'Configured' : 'Missing',
        service: 'Twilio SMS'
      }
    });

  } catch (error) {
    console.error('❌ [SMS-API] Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking SMS service status'
    });
  }
});

// Test email service endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { to, contractorName, contractorCompany, subject, htmlContent } = req.body;

    console.log('📧 [SMS-EMAIL-TEST] Testing email service...');

    const result = await resendEmailAdvanced.sendContractEmail({
      to: to || 'gelasio@chyrris.com',
      toName: 'Test Client',
      contractorEmail: 'contractor@test.com',
      contractorName: contractorName || 'Test Contractor',
      contractorCompany: contractorCompany || 'Test Company LLC',
      subject: subject || 'Test Contract Email',
      htmlContent: htmlContent || '<h1>Test Email</h1><p>This is a test contract email.</p>'
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [SMS-EMAIL-TEST] Email test error:', error);
    res.status(500).json({
      success: false,
      error: 'Email test failed'
    });
  }
});

// Health check endpoint for both SMS and Email services
router.get('/health', async (req, res) => {
  try {
    const smsStatus = twilioService.getServiceStatus();
    const emailHealth = await resendEmailAdvanced.checkHealth();

    res.json({
      success: true,
      services: {
        sms: {
          configured: smsStatus.configured,
          hasCredentials: smsStatus.hasCredentials,
          fromNumber: smsStatus.fromNumber ? 'Configured' : 'Missing',
          domain: 'Twilio Cloud'
        },
        email: {
          healthy: emailHealth.healthy,
          message: emailHealth.message,
          domain: 'owlfenc.com',
          environment: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
        }
      },
      overall: {
        status: smsStatus.configured && emailHealth.healthy ? 'fully_operational' : 'partial_service',
        capabilities: {
          sms: smsStatus.configured,
          email: emailHealth.healthy
        }
      }
    });

  } catch (error) {
    console.error('❌ [SMS-HEALTH] Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Send COMPLETE contract email (email with embedded contract content)
router.post('/complete-contract-email', async (req, res) => {
  try {
    const {
      to,
      contractorName,
      contractorCompany,
      clientName,
      contractHTML,
      contractId,
      reviewUrl
    } = req.body;

    console.log('📧 [COMPLETE-CONTRACT-EMAIL-API] Processing complete contract email...');
    console.log('📧 [COMPLETE-CONTRACT-EMAIL-API] To:', to);
    console.log('📧 [COMPLETE-CONTRACT-EMAIL-API] Contract ID:', contractId);
    console.log('📧 [COMPLETE-CONTRACT-EMAIL-API] Review URL:', reviewUrl);

    if (!to || !contractorName || !contractorCompany || !clientName || !contractHTML || !contractId || !reviewUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, contractorName, contractorCompany, clientName, contractHTML, contractId, reviewUrl'
      });
    }

    const result = await resendEmailAdvanced.sendCompleteContractEmail({
      to,
      contractorName,
      contractorCompany,
      clientName,
      contractHTML,
      contractId,
      reviewUrl
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [COMPLETE-CONTRACT-EMAIL-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error sending complete contract email'
    });
  }
});

// Send COMPLETE contract SMS (SMS with direct review link)
router.post('/complete-contract-sms', async (req, res) => {
  try {
    const {
      to,
      clientName,
      contractorName,
      contractorCompany,
      contractId,
      reviewUrl
    } = req.body;

    console.log('📱 [COMPLETE-CONTRACT-SMS-API] Processing complete contract SMS...');
    console.log('📱 [COMPLETE-CONTRACT-SMS-API] To:', to);
    console.log('📱 [COMPLETE-CONTRACT-SMS-API] Contract ID:', contractId);
    console.log('📱 [COMPLETE-CONTRACT-SMS-API] Review URL:', reviewUrl);

    if (!to || !clientName || !contractorName || !contractorCompany || !contractId || !reviewUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, clientName, contractorName, contractorCompany, contractId, reviewUrl'
      });
    }

    const result = await twilioService.sendCompleteContractSMS({
      to,
      clientName,
      contractorName,
      contractorCompany,
      contractId,
      reviewUrl
    });

    res.json(result);

  } catch (error) {
    console.error('❌ [COMPLETE-CONTRACT-SMS-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error sending complete contract SMS'
    });
  }
});

export default router;
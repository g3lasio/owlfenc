/**
 * Multi-Channel Contract Delivery Routes
 * 
 * Handles secure contract delivery through multiple channels:
 * - Professional Email (SendGrid)
 * - SMS (External app integration)
 * - WhatsApp Business (External app integration)
 */

import express from 'express';
import multiChannelDeliveryService from '../services/multiChannelDeliveryService';
import { requireAuth } from '../middleware/unified-session-auth';
import { userMappingService } from '../services/userMappingService';

const router = express.Router();

/**
 * POST /api/multi-channel/initiate
 * Initiate secure multi-channel contract delivery
 * ✅ SIMPLIFIED AUTH: Uses session-based auth (no manual tokens required)
 */
router.post('/initiate', requireAuth, async (req, res) => {
  try {
    console.log('🔐 [MULTI-CHANNEL API] Initiate request received');
    
    const { 
      contractHTML, 
      deliveryMethods, 
      contractData, 
      securityFeatures 
    } = req.body;

    // ✅ SIMPLIFIED: User is already authenticated via session cookie
    const firebaseUid = req.authUser?.uid || req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'UNAUTHORIZED'
      });
    }
    
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.authUser?.email || req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario',
        code: 'USER_MAPPING_FAILED'
      });
    }
    console.log(`✅ [AUTH-SIMPLE] Contract delivery for user_id: ${userId}`);

    // Validate required fields

    if (!contractHTML) {
      return res.status(400).json({ 
        error: 'Contract HTML is required',
        code: 'MISSING_CONTRACT_HTML'
      });
    }

    if (!contractData) {
      return res.status(400).json({ 
        error: 'Contract data is required',
        code: 'MISSING_CONTRACT_DATA'
      });
    }

    if (!deliveryMethods || typeof deliveryMethods !== 'object') {
      return res.status(400).json({ 
        error: 'Delivery methods configuration is required',
        code: 'MISSING_DELIVERY_METHODS'
      });
    }

    // Allow generation of signature links without requiring delivery methods
    const selectedMethods = Object.entries(deliveryMethods).filter(([_, enabled]) => enabled);
    console.log('🔐 [MULTI-CHANNEL API] Selected delivery methods:', selectedMethods.length > 0 ? selectedMethods.map(([method, _]) => method) : 'None (links only mode)');

    // Validate email addresses if email delivery is selected
    if (deliveryMethods.email) {
      if (!contractData.contractorEmail || !contractData.clientEmail) {
        return res.status(400).json({ 
          error: 'Contractor and client email addresses are required for email delivery',
          code: 'MISSING_EMAIL_ADDRESSES'
        });
      }
    }

    // Validate phone numbers if SMS or WhatsApp delivery is selected
    if (deliveryMethods.sms || deliveryMethods.whatsapp) {
      if (!contractData.contractorPhone || !contractData.clientPhone) {
        return res.status(400).json({ 
          error: 'Contractor and client phone numbers are required for SMS/WhatsApp delivery',
          code: 'MISSING_PHONE_NUMBERS'
        });
      }
    }

    console.log('🔐 [MULTI-CHANNEL API] Validation passed, initiating signature protocol...');
    if (selectedMethods.length > 0) {
      console.log('🔐 [MULTI-CHANNEL API] Selected methods:', selectedMethods.map(([method, _]) => method));
    } else {
      console.log('🔐 [MULTI-CHANNEL API] Links only mode - no delivery methods selected');
    }

    // Initiate secure delivery
    const result = await multiChannelDeliveryService.initiateSecureDelivery({
      userId,
      contractHTML,
      deliveryMethods,
      contractData,
      securityFeatures: securityFeatures || {
        encryption: "256-bit SSL",
        verification: true,
        auditTrail: true,
        timeStamps: true
      }
    });

    console.log('✅ [MULTI-CHANNEL API] Delivery completed successfully');
    console.log('✅ [MULTI-CHANNEL API] Contract ID:', result.contractId);

    // Return success response
    res.json({
      success: true,
      message: selectedMethods.length > 0 ? 'Secure contract delivery initiated successfully' : 'Signature links generated successfully',
      contractId: result.contractId,
      contractorSignUrl: result.contractorSignUrl,
      clientSignUrl: result.clientSignUrl,
      deliveryResults: result.deliveryResults,
      securityFeatures: {
        encryption: "256-bit SSL",
        verification: true,
        auditTrail: true,
        timeStamps: true,
        expirationHours: 72
      },
      deliveredChannels: selectedMethods.length > 0 ? selectedMethods.map(([method, _]) => {
        switch(method) {
          case 'email': return 'Secure Email';
          case 'sms': return 'SMS Text Message';
          case 'whatsapp': return 'WhatsApp Business';
          default: return method;
        }
      }) : ['Signature Links Generated - Manual Sharing']
    });

  } catch (error) {
    console.error('❌ [MULTI-CHANNEL API] Error:', error);
    
    res.status(500).json({
      error: 'Failed to initiate secure delivery',
      message: error.message || 'Internal server error',
      code: 'DELIVERY_FAILED'
    });
  }
});

/**
 * GET /api/multi-channel/status/:contractId
 * Get delivery status for a contract
 * ✅ SIMPLIFIED AUTH: Uses session-based auth
 */
router.get('/status/:contractId', requireAuth, async (req, res) => {
  try {
    const { contractId } = req.params;
    
    // ✅ SIMPLIFIED: User is already authenticated via session cookie
    const firebaseUid = req.authUser?.uid || req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado',
        code: 'UNAUTHORIZED'
      });
    }
    
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.authUser?.email || req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario',
        code: 'USER_MAPPING_FAILED'
      });
    }
    console.log(`✅ [AUTH-SIMPLE] Contract status for user_id: ${userId}`);
    
    // For now, return a mock status
    // In production, this would query a database for actual status
    res.json({
      contractId,
      status: 'delivered',
      deliveryChannels: {
        email: { status: 'delivered', timestamp: new Date().toISOString() },
        sms: { status: 'generated', timestamp: new Date().toISOString() },
        whatsapp: { status: 'generated', timestamp: new Date().toISOString() }
      },
      securityStatus: {
        encryption: 'active',
        auditTrail: 'complete',
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [MULTI-CHANNEL API] Status error:', error);
    
    res.status(500).json({
      error: 'Failed to get delivery status',
      message: error.message || 'Internal server error'
    });
  }
});

/**
 * POST /api/multi-channel/initiate-public
 * Generate signature links WITHOUT authentication requirement
 * This endpoint is specifically for generating contract signature links
 * without requiring Firebase authentication
 */
router.post('/initiate-public', async (req, res) => {
  try {
    console.log('🔓 [MULTI-CHANNEL PUBLIC] Public initiate request received - NO AUTH REQUIRED');
    
    const { 
      contractHTML, 
      deliveryMethods, 
      contractData, 
      securityFeatures,
      userId: providedUserId,
      templateId, // ✅ Template-aware: Support for Change Order and future templates
      signatureRequirement // ✅ Template-driven signature requirements
    } = req.body;

    // Validate required fields
    if (!contractHTML) {
      return res.status(400).json({ 
        error: 'Contract HTML is required',
        code: 'MISSING_CONTRACT_HTML'
      });
    }

    if (!contractData) {
      return res.status(400).json({ 
        error: 'Contract data is required',
        code: 'MISSING_CONTRACT_DATA'
      });
    }

    // Use provided userId or generate a temporary one for tracking
    const userId = providedUserId || `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔓 [PUBLIC-AUTH] Processing contract for: ${userId}`);

    // Allow generation of signature links without requiring delivery methods
    const selectedMethods = deliveryMethods ? 
      Object.entries(deliveryMethods).filter(([_, enabled]) => enabled) : [];
    
    console.log('🔓 [MULTI-CHANNEL PUBLIC] Mode:', selectedMethods.length > 0 ? 'With delivery' : 'Links only');

    // Validate email addresses if email delivery is selected
    if (deliveryMethods?.email) {
      if (!contractData.contractorEmail || !contractData.clientEmail) {
        return res.status(400).json({ 
          error: 'Contractor and client email addresses are required for email delivery',
          code: 'MISSING_EMAIL_ADDRESSES'
        });
      }
    }

    // Initiate secure delivery (works without authentication)
    const result = await multiChannelDeliveryService.initiateSecureDelivery({
      userId,
      contractHTML,
      deliveryMethods: deliveryMethods || {},
      contractData,
      securityFeatures: securityFeatures || {
        encryption: "256-bit SSL",
        verification: true,
        auditTrail: true,
        timeStamps: true
      }
    });

    console.log('✅ [MULTI-CHANNEL PUBLIC] Links generated successfully');
    console.log('✅ [MULTI-CHANNEL PUBLIC] Contract ID:', result.contractId);

    // Return success response
    res.json({
      success: true,
      message: 'Signature links generated successfully (public endpoint)',
      contractId: result.contractId,
      contractorSignUrl: result.contractorSignUrl,
      clientSignUrl: result.clientSignUrl,
      deliveryResults: result.deliveryResults,
      securityFeatures: {
        encryption: "256-bit SSL",
        verification: true,
        auditTrail: true,
        timeStamps: true,
        expirationHours: 72
      },
      publicEndpoint: true,
      deliveredChannels: selectedMethods.length > 0 ? selectedMethods.map(([method, _]) => {
        switch(method) {
          case 'email': return 'Secure Email';
          case 'sms': return 'SMS Text Message';
          case 'whatsapp': return 'WhatsApp Business';
          default: return method;
        }
      }) : ['Signature Links Generated - Manual Sharing']
    });

  } catch (error) {
    console.error('❌ [MULTI-CHANNEL PUBLIC] Error:', error);
    
    res.status(500).json({
      error: 'Failed to generate signature links',
      message: error.message || 'Internal server error',
      code: 'GENERATION_FAILED'
    });
  }
});

/**
 * GET /api/multi-channel/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        email: {
          status: process.env.SENDGRID_API_KEY ? 'configured' : 'not_configured',
          service: 'SendGrid'
        },
        sms: {
          status: 'ready',
          service: 'External App Integration'
        },
        whatsapp: {
          status: 'ready',
          service: 'External App Integration'
        }
      },
      securityFeatures: {
        encryption: '256-bit SSL',
        verification: 'device-based',
        auditTrail: 'complete',
        timeStamps: 'enabled'
      }
    };

    res.json(health);

  } catch (error) {
    console.error('❌ [MULTI-CHANNEL API] Health check error:', error);
    
    res.status(500).json({
      status: 'unhealthy',
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
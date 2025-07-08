/**
 * DUAL SIGNATURE WORKFLOW API ROUTES
 * Complete contractor + client dual signature system for US-wide distribution
 */

import { Router } from 'express';
import { dualSignatureWorkflow } from '../services/dualSignatureWorkflow';
import { signatureStorageService } from '../services/signatureStorageService';

const router = Router();

/**
 * POST /api/dual-signature/initiate
 * Initiate complete dual signature workflow
 */
router.post('/initiate', async (req, res) => {
  try {
    console.log('🔄 [DUAL-SIGNATURE-API] Initiating dual signature workflow...');
    
    const {
      contractId,
      contractHTML,
      contractorData,
      clientData,
      projectDetails
    } = req.body;

    // Validate required fields
    if (!contractId || !contractHTML || !contractorData || !clientData || !projectDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contractId, contractHTML, contractorData, clientData, projectDetails'
      });
    }

    // Initiate dual signature workflow
    const result = await dualSignatureWorkflow.initiateDualSignatureWorkflow({
      contractId,
      contractHTML,
      contractorData,
      clientData,
      projectDetails
    });

    console.log('✅ [DUAL-SIGNATURE-API] Workflow result:', result.success ? 'SUCCESS' : 'FAILED');

    res.json(result);

  } catch (error) {
    console.error('❌ [DUAL-SIGNATURE-API] Error:', error);
    res.status(500).json({
      success: false,
      message: `Dual signature workflow error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * POST /api/dual-signature/send-final-pdf
 * Send final signed PDF to both parties
 */
router.post('/send-final-pdf', async (req, res) => {
  try {
    console.log('📄 [FINAL-PDF-API] Sending final signed PDF to both parties...');
    
    const {
      contractId,
      signedPdfBase64,
      contractorData,
      clientData,
      projectDetails
    } = req.body;

    // Validate required fields
    if (!contractId || !signedPdfBase64 || !contractorData || !clientData || !projectDetails) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contractId, signedPdfBase64, contractorData, clientData, projectDetails'
      });
    }

    // Convert base64 PDF to buffer
    const signedPdfBuffer = Buffer.from(signedPdfBase64, 'base64');

    // Send final PDF to both parties
    const result = await dualSignatureWorkflow.sendFinalSignedPDF({
      contractId,
      signedPdfBuffer,
      contractorData,
      clientData,
      projectDetails
    });

    console.log('✅ [FINAL-PDF-API] PDF delivery result:', result.success ? 'SUCCESS' : 'FAILED');

    res.json(result);

  } catch (error) {
    console.error('❌ [FINAL-PDF-API] Error:', error);
    res.status(500).json({
      success: false,
      message: `Final PDF delivery error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

/**
 * POST /api/dual-signature/test-workflow
 * Test the complete dual signature workflow with sample data
 */
router.post('/test-workflow', async (req, res) => {
  try {
    console.log('🧪 [TEST-WORKFLOW] Running dual signature workflow test...');
    
    const testData = {
      contractId: `TEST-DUAL-${Date.now()}`,
      contractHTML: `
        <h1>🧪 TEST CONTRACT - DUAL SIGNATURE WORKFLOW</h1>
        <p><strong>CONTRACTOR:</strong> Test Contractor LLC</p>
        <p><strong>CLIENT:</strong> Test Client Name</p>
        <p><strong>PROJECT:</strong> Test Project Description</p>
        <p><strong>VALUE:</strong> $10,000.00</p>
        <p><strong>PURPOSE:</strong> Testing dual signature workflow with owlfenc.com domain</p>
        <p>This is a test contract to verify the complete dual signature workflow implementation.</p>
      `,
      contractorData: {
        name: 'Test Contractor',
        company: 'Test Contractor LLC',
        email: req.body.contractorEmail || 'contractor-test@example.com',
        phone: '+15551234567'
      },
      clientData: {
        name: 'Test Client',
        email: req.body.clientEmail || 'client-test@example.com',
        phone: '+15557654321'
      },
      projectDetails: {
        description: 'Test Project - Dual Signature Workflow',
        value: '$10,000.00',
        address: '123 Test Street, Test City, TX 12345'
      }
    };

    // Run the dual signature workflow test
    const result = await dualSignatureWorkflow.initiateDualSignatureWorkflow(testData);

    console.log('✅ [TEST-WORKFLOW] Test completed:', result.success ? 'SUCCESS' : 'FAILED');

    res.json({
      ...result,
      testMode: true,
      message: `${result.message} (TEST MODE)`,
      testData
    });

  } catch (error) {
    console.error('❌ [TEST-WORKFLOW] Error:', error);
    res.status(500).json({
      success: false,
      message: `Test workflow error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      testMode: true
    });
  }
});

/**
 * POST /api/dual-signature/store-signature
 * Store digital signature for contract
 */
router.post('/store-signature', async (req, res) => {
  try {
    console.log('✍️ [SIGNATURE-API] Storing digital signature...');
    
    const {
      contractId,
      signerName,
      signerRole,
      signatureType,
      signatureData,
      metadata
    } = req.body;

    // Validate required fields
    if (!contractId || !signerName || !signerRole || !signatureType || !signatureData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required signature data'
      });
    }

    // Validate role
    if (!['contractor', 'client'].includes(signerRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signer role'
      });
    }

    // Prepare signature data
    const signature = {
      contractId,
      signerName,
      signerRole: signerRole as 'contractor' | 'client',
      signatureType: signatureType as 'canvas' | 'typed',
      signatureData,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      deviceInfo: metadata?.deviceInfo,
      geolocation: metadata?.geolocation
    };

    // Store signature
    const success = signatureStorage.storeSignature(contractId, signature);
    
    if (success) {
      const contractSignatures = signatureStorage.getContractSignatures(contractId);
      
      console.log('✅ [SIGNATURE-API] Signature stored successfully');
      console.log('📊 [SIGNATURE-API] Contract status:', contractSignatures?.status);
      
      res.json({
        success: true,
        message: 'Signature stored successfully',
        contractStatus: contractSignatures?.status,
        isFullySigned: signatureStorage.isFullySigned(contractId)
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to store signature'
      });
    }
  } catch (error) {
    console.error('❌ [SIGNATURE-API] Error storing signature:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * GET /api/dual-signature/contract-status/:contractId
 * Get contract signature status
 */
router.get('/contract-status/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const signatures = signatureStorage.getContractSignatures(contractId);
    
    if (!signatures) {
      // Initialize contract if not found
      signatureStorage.initializeContract(contractId);
      const newSignatures = signatureStorage.getContractSignatures(contractId);
      
      return res.json({
        success: true,
        contractSignatures: newSignatures,
        isFullySigned: false
      });
    }
    
    res.json({
      success: true,
      contractSignatures: signatures,
      isFullySigned: signatureStorage.isFullySigned(contractId)
    });
  } catch (error) {
    console.error('❌ [SIGNATURE-API] Error getting contract status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
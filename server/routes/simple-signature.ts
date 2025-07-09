/**
 * Simple Digital Signature API Routes
 * 
 * Replaces complex Neural Signature with streamlined workflow:
 * POST /initiate - Start signature process (replaces Neural Signature)
 * GET /:contractId - Get contract data for signing page
 * POST /:contractId/sign - Save signature from mobile page
 * GET /:contractId/status - Check signature status
 */

import { Router } from 'express';
import { simpleSignatureService } from '../services/SimpleSignatureService';

const router = Router();

/**
 * POST /api/simple-signature/initiate
 * Initiate simple signature workflow - replaces Neural Signature
 */
router.post('/initiate', async (req, res) => {
  try {
    console.log('🚀 [SIMPLE-SIGNATURE-API] Initiating simple signature workflow');
    
    const {
      userId,
      contractId,
      contractorData,
      clientData,
      contractData
    } = req.body;

    // Validate required fields
    if (!contractId || !contractorData || !clientData || !contractData) {
      return res.status(400).json({
        success: false,
        error: 'Missing required contract data'
      });
    }

    const result = await simpleSignatureService.initiateSignatureWorkflow({
      userId: userId || 1, // Default for testing
      contractId,
      contractorData,
      clientData,
      contractData
    });

    console.log('✅ [SIMPLE-SIGNATURE-API] Workflow initiated successfully');
    res.json(result);

  } catch (error) {
    console.error('❌ [SIMPLE-SIGNATURE-API] Error initiating workflow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate signature workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/simple-signature/:contractId
 * Get contract data for signature page
 */
router.get('/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    console.log(`📄 [SIMPLE-SIGNATURE-API] Getting contract data: ${contractId}`);

    const contract = await simpleSignatureService.getContractForSigning(contractId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    // Return contract data for signature page
    res.json({
      success: true,
      contract: {
        contractId: contract.contractId,
        contractorName: contract.contractorName,
        contractorCompany: contract.contractorCompany,
        contractorEmail: contract.contractorEmail,
        contractorPhone: contract.contractorPhone,
        clientName: contract.clientName,
        clientEmail: contract.clientEmail,
        clientPhone: contract.clientPhone,
        clientAddress: contract.clientAddress,
        projectDescription: contract.projectDescription,
        totalAmount: Number(contract.totalAmount),
        startDate: contract.startDate,
        completionDate: contract.completionDate,
        contractHtml: contract.contractHtml,
        status: contract.status,
        contractorSigned: contract.contractorSigned,
        clientSigned: contract.clientSigned,
        contractorSignedAt: contract.contractorSignedAt,
        clientSignedAt: contract.clientSignedAt
      }
    });

  } catch (error) {
    console.error('❌ [SIMPLE-SIGNATURE-API] Error getting contract:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get contract data'
    });
  }
});

/**
 * POST /api/simple-signature/:contractId/sign
 * Save signature from mobile-friendly signing page
 */
router.post('/:contractId/sign', async (req, res) => {
  try {
    const { contractId } = req.params;
    const { party, signatureData, signatureType, signerName } = req.body;

    console.log(`🖊️ [SIMPLE-SIGNATURE-API] Saving signature: ${contractId} - ${party}`);

    // Validate required fields
    if (!party || !signatureData || !signatureType || !signerName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required signature data'
      });
    }

    if (!['contractor', 'client'].includes(party)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid party type'
      });
    }

    if (!['drawing', 'cursive'].includes(signatureType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid signature type'
      });
    }

    const result = await simpleSignatureService.saveSignature({
      contractId,
      party,
      signatureData,
      signatureType,
      signerName
    });

    console.log(`✅ [SIMPLE-SIGNATURE-API] Signature saved successfully`);
    res.json(result);

  } catch (error) {
    console.error('❌ [SIMPLE-SIGNATURE-API] Error saving signature:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save signature'
    });
  }
});

/**
 * GET /api/simple-signature/:contractId/status
 * Check signature status
 */
router.get('/:contractId/status', async (req, res) => {
  try {
    const { contractId } = req.params;
    console.log(`📊 [SIMPLE-SIGNATURE-API] Checking status: ${contractId}`);

    const contract = await simpleSignatureService.getContractForSigning(contractId);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }

    res.json({
      success: true,
      status: {
        contractId: contract.contractId,
        status: contract.status,
        contractorSigned: contract.contractorSigned,
        clientSigned: contract.clientSigned,
        contractorSignedAt: contract.contractorSignedAt,
        clientSignedAt: contract.clientSignedAt,
        emailSent: contract.emailSent,
        emailSentAt: contract.emailSentAt,
        bothPartiesSigned: contract.contractorSigned && contract.clientSigned
      }
    });

  } catch (error) {
    console.error('❌ [SIMPLE-SIGNATURE-API] Error checking status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check status'
    });
  }
});

export default router;
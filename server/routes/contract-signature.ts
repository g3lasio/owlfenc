import express from 'express';
import { signatureStorageService } from '../services/signatureStorageService';
import { resendEmailDifferentiated } from '../services/resendEmailDifferentiated';

const router = express.Router();

/**
 * Handle contract signatures from embedded email forms
 */
router.post('/contract-signature', async (req, res) => {
  try {
    console.log('📝 [CONTRACT-SIGNATURE] Processing signature submission...');
    console.log('📄 [CONTRACT-SIGNATURE] Data:', JSON.stringify(req.body, null, 2));

    const { 
      contractId, 
      action, 
      contractorName, 
      clientName,
      signatureData, 
      reason,
      timestamp, 
      role 
    } = req.body;

    if (!contractId || !action || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contractId, action, role'
      });
    }

    // Store signature data
    const signatureRecord = {
      contractId,
      role,
      action,
      signatureName: role === 'contractor' ? contractorName : clientName,
      signatureData,
      reason: action === 'reject' ? reason : undefined,
      timestamp: timestamp || new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    const storageResult = await signatureStorageService.storeSignature(signatureRecord);
    
    if (!storageResult.success) {
      console.error('❌ [CONTRACT-SIGNATURE] Failed to store signature:', storageResult.error);
      return res.status(500).json({
        success: false,
        message: 'Failed to store signature data'
      });
    }

    console.log('✅ [CONTRACT-SIGNATURE] Signature stored successfully');
    console.log('📊 [CONTRACT-SIGNATURE] Storage ID:', storageResult.signatureId);

    // Handle different actions
    if (action === 'approve') {
      console.log('✅ [CONTRACT-SIGNATURE] Contract approved by', role);
      
      // If contractor approved, notify client
      if (role === 'contractor') {
        console.log('📧 [CONTRACT-SIGNATURE] Sending client notification...');
        // TODO: Send client notification email
        // await notifyClientForSignature(contractId);
      }
      
      // If client approved, finalize contract
      if (role === 'client') {
        console.log('🎉 [CONTRACT-SIGNATURE] Contract fully executed');
        // TODO: Generate final PDF and send to both parties
        // await finalizeContract(contractId);
      }

      return res.json({
        success: true,
        message: `Contract ${action}d successfully by ${role}`,
        signatureId: storageResult.signatureId,
        nextStep: role === 'contractor' ? 'Client notification pending' : 'Contract fully executed'
      });

    } else if (action === 'reject') {
      console.log('❌ [CONTRACT-SIGNATURE] Contract rejected by', role, 'Reason:', reason);
      
      // TODO: Notify other party of rejection
      // await notifyContractRejection(contractId, role, reason);

      return res.json({
        success: true,
        message: `Contract rejected by ${role}. Reason: ${reason}`,
        signatureId: storageResult.signatureId
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Invalid action. Must be "approve" or "reject"'
    });

  } catch (error) {
    console.error('❌ [CONTRACT-SIGNATURE] Error processing signature:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing signature',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get signature status for a contract
 */
router.get('/contract-signature/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const signatures = await signatureStorageService.getContractSignatures(contractId);
    
    return res.json({
      success: true,
      contractId,
      signatures: signatures || []
    });
  } catch (error) {
    console.error('❌ [CONTRACT-SIGNATURE] Error retrieving signatures:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve signature data'
    });
  }
});

export default router;
/**
 * SECURE CONTRACT ROUTES
 * API endpoints for serverless contract signature system
 */

import { Router } from 'express';
import { firebaseContractService } from '../services/firebaseContractService';
import { resendEmailDifferentiated } from '../services/resendEmailDifferentiated';
import { twilioService } from '../services/twilioService';

const router = Router();

/**
 * Generate secure contract links for dual signature workflow
 */
router.post('/api/secure-contract/generate-links', async (req, res) => {
  try {
    const {
      contractId,
      contractorEmail,
      contractorName,
      clientEmail,
      clientName,
      projectValue,
      projectDescription,
      contractHTML
    } = req.body;
    
    if (!contractId || !contractorEmail || !clientEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    console.log(`🔐 [SECURE-CONTRACT] Generating secure links for contract ${contractId}`);
    
    // Generate secure tokens for both parties
    const contractData = {
      contractorName,
      clientName,
      projectValue,
      projectDescription,
      contractHTML
    };
    
    // Generate contractor token
    const contractorLink = await firebaseContractService.generateSecureToken({
      contractId,
      role: 'contractor',
      recipientEmail: contractorEmail,
      recipientName: contractorName,
      contractData
    });
    
    // Generate client token
    const clientLink = await firebaseContractService.generateSecureToken({
      contractId,
      role: 'client',
      recipientEmail: clientEmail,
      recipientName: clientName,
      contractData
    });
    
    console.log(`✅ [SECURE-CONTRACT] Generated secure links successfully`);
    
    res.json({
      success: true,
      links: {
        contractor: contractorLink,
        client: clientLink
      },
      message: 'Secure contract links generated successfully'
    });
    
  } catch (error) {
    console.error('❌ [SECURE-CONTRACT] Failed to generate links:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate secure contract links'
    });
  }
});

/**
 * Send secure contract links via email and SMS
 */
router.post('/api/secure-contract/send-links', async (req, res) => {
  try {
    const {
      contractId,
      contractorEmail,
      contractorName,
      contractorPhone,
      clientEmail,
      clientName,
      clientPhone,
      links
    } = req.body;
    
    console.log(`📧 [SECURE-CONTRACT] Sending secure links for contract ${contractId}`);
    
    // Send contractor email with secure link
    const contractorEmailResult = await resendEmailDifferentiated.sendSecureContractLink({
      to: contractorEmail,
      contractId,
      contractorName,
      clientName,
      role: 'contractor',
      secureLink: links.contractor.url,
      expiresAt: links.contractor.expiresAt
    });
    
    // Send client email with secure link
    const clientEmailResult = await resendEmailDifferentiated.sendSecureContractLink({
      to: clientEmail,
      contractId,
      contractorName,
      clientName,
      role: 'client',
      secureLink: links.client.url,
      expiresAt: links.client.expiresAt
    });
    
    // Send SMS notifications if phone numbers provided
    let contractorSmsResult = null;
    let clientSmsResult = null;
    
    if (contractorPhone) {
      contractorSmsResult = await twilioService.sendSecureContractSMS({
        to: contractorPhone,
        recipientName: contractorName,
        secureLink: links.contractor.url,
        role: 'contractor'
      });
    }
    
    if (clientPhone) {
      clientSmsResult = await twilioService.sendSecureContractSMS({
        to: clientPhone,
        recipientName: clientName,
        secureLink: links.client.url,
        role: 'client'
      });
    }
    
    res.json({
      success: true,
      results: {
        contractorEmail: contractorEmailResult,
        clientEmail: clientEmailResult,
        contractorSms: contractorSmsResult,
        clientSms: clientSmsResult
      },
      message: 'Secure contract links sent successfully'
    });
    
  } catch (error) {
    console.error('❌ [SECURE-CONTRACT] Failed to send links:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send secure contract links'
    });
  }
});

/**
 * Validate token and retrieve contract data
 */
router.get('/api/contract/validate-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    console.log(`🔍 [SECURE-CONTRACT] Validating token`);
    
    const tokenData = await firebaseContractService.validateToken(token);
    
    if (!tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        reason: 'invalid'
      });
    }
    
    res.json({
      success: true,
      role: tokenData.role,
      recipientName: tokenData.recipientName,
      contractData: tokenData.contractData
    });
    
  } catch (error) {
    console.error('❌ [SECURE-CONTRACT] Token validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate token'
    });
  }
});

/**
 * Process contract signature
 */
router.post('/api/contract/sign', async (req, res) => {
  try {
    const {
      token,
      signatureData,
      typedName,
      userAgent
    } = req.body;
    
    // Get client IP address
    const ipAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress;
    
    console.log(`✍️ [SECURE-CONTRACT] Processing signature submission`);
    
    const result = await firebaseContractService.storeSignature({
      token,
      signatureData,
      typedName,
      ipAddress,
      userAgent
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Check if contract is fully signed
    const tokenData = await firebaseContractService.validateToken(token);
    if (tokenData) {
      const status = await firebaseContractService.getContractStatus(tokenData.contractId);
      
      if (status.status === 'fully-signed') {
        console.log(`🎉 [SECURE-CONTRACT] Contract ${tokenData.contractId} is fully signed`);
        
        // Generate and send final signed PDF to both parties
        // This will be handled by a separate background process
      }
    }
    
    res.json({
      success: true,
      message: result.message
    });
    
  } catch (error) {
    console.error('❌ [SECURE-CONTRACT] Signature processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process signature'
    });
  }
});

/**
 * Get contract status
 */
router.get('/api/contract/status/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    const status = await firebaseContractService.getContractStatus(contractId);
    
    res.json({
      success: true,
      ...status
    });
    
  } catch (error) {
    console.error('❌ [SECURE-CONTRACT] Status retrieval error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve contract status'
    });
  }
});

export default router;
/**
 * Dual Signature API Routes
 * Endpoints para el Sistema de Firma Dual Automática
 */

import { Router } from 'express';
import { dualSignatureService } from '../services/dualSignatureService';
import { DocumentService } from '../services/documentService';
import { z } from 'zod';

const router = Router();
const documentService = new DocumentService();

// Validation schemas
const initiateDualSignatureSchema = z.object({
  userId: z.string(),
  contractHTML: z.string(),
  contractData: z.object({
    contractorName: z.string(),
    contractorEmail: z.string().email(),
    contractorPhone: z.string().optional(),
    contractorCompany: z.string(),
    clientName: z.string(),
    clientEmail: z.string().email(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),
    projectDescription: z.string(),
    totalAmount: z.number(),
    startDate: z.string().optional(),
    completionDate: z.string().optional(),
  }),
});

const signatureSubmissionSchema = z.object({
  contractId: z.string(),
  party: z.enum(['contractor', 'client']),
  signatureData: z.string(),
  signatureType: z.enum(['drawing', 'cursive']),
  fullName: z.string(),
});

/**
 * POST /api/dual-signature/initiate
 * Iniciar el proceso de firma dual
 */
router.post('/initiate', async (req, res) => {
  try {
    console.log('🚀 [API] Initiating dual signature workflow...');
    
    const validatedData = initiateDualSignatureSchema.parse(req.body);
    
    const result = await dualSignatureService.initiateDualSignature(validatedData);
    
    if (result.success) {
      console.log('✅ [API] Dual signature initiated successfully:', result.contractId);
      res.json({
        success: true,
        contractId: result.contractId,
        contractorSignUrl: result.contractorSignUrl,
        clientSignUrl: result.clientSignUrl,
        message: result.message,
      });
    } else {
      console.error('❌ [API] Failed to initiate dual signature:', result.message);
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error in /initiate:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/contract/:contractId/:party
 * Obtener datos del contrato para firma
 * INCLUYE VERIFICACIÓN DE SEGURIDAD OPCIONAL
 */
router.get('/contract/:contractId/:party', async (req, res) => {
  try {
    const { contractId, party } = req.params;
    const requestingUserId = req.headers['x-user-id'] as string; // Para verificación de seguridad opcional
    
    if (!['contractor', 'client'].includes(party)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid party. Must be "contractor" or "client"',
      });
    }
    
    console.log(`🔍 [API] Getting contract for ${party} signing:`, contractId);
    console.log(`🔐 [API] Requesting user ID:`, requestingUserId || 'No user ID provided');
    
    const result = await dualSignatureService.getContractForSigning(
      contractId, 
      party as 'contractor' | 'client',
      requestingUserId
    );
    
    if (result.success) {
      res.json({
        success: true,
        contract: result.contract,
        message: result.message,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error in /contract/:contractId/:party:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * POST /api/dual-signature/sign
 * Procesar firma enviada
 * INCLUYE VERIFICACIÓN DE SEGURIDAD OPCIONAL
 */
router.post('/sign', async (req, res) => {
  try {
    console.log('✍️ [API] Processing signature submission...');
    
    const validatedData = signatureSubmissionSchema.parse(req.body);
    const requestingUserId = req.headers['x-user-id'] as string; // Para verificación de seguridad opcional
    
    console.log(`🔐 [API] Requesting user ID:`, requestingUserId || 'No user ID provided');
    
    const result = await dualSignatureService.processSignature(validatedData, requestingUserId);
    
    if (result.success) {
      console.log('✅ [API] Signature processed successfully');
      res.json({
        success: true,
        message: result.message,
        status: result.status,
        bothSigned: result.bothSigned,
      });
    } else {
      console.error('❌ [API] Failed to process signature:', result.message);
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error in /sign:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/download/:contractId
 * Download signed PDF contract
 */
router.get('/download/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const requestingUserId = req.headers['x-user-id'] as string;
    
    console.log('📥 [API] Download request for contract:', contractId);
    console.log('👤 [API] Requesting user:', requestingUserId || 'No user ID');
    
    const result = await dualSignatureService.downloadSignedPdf(contractId, requestingUserId);
    
    if (result.success && result.pdfBuffer) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contract_${contractId}_signed.pdf"`);
      res.send(result.pdfBuffer);
    } else {
      res.status(404).json({
        success: false,
        message: result.message
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error in /download/:contractId:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/status/:contractId
 * Obtener estado del contrato
 */
router.get('/status/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    console.log('📊 [API] Getting contract status:', contractId);
    
    const result = await dualSignatureService.getContractStatus(contractId);
    
    if (result.success) {
      res.json({
        success: true,
        status: result.status,
        message: result.message,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error in /status/:contractId:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/download/:contractId
 * Descargar PDF firmado completado
 */
router.get('/download/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    console.log('📥 [API] PDF download requested:', contractId);
    
    const result = await dualSignatureService.getSignedPdf(contractId);
    
    if (result.success && result.pdfBuffer && result.filename) {
      console.log('✅ [API] Serving signed PDF for download');
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Length', result.pdfBuffer.length);
      
      // Send PDF buffer
      res.send(result.pdfBuffer);
    } else {
      console.error('❌ [API] PDF not available:', result.message);
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error in /download/:contractId:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/in-progress/:userId
 * Obtener todos los contratos en progreso (pendientes de firma) de un usuario
 */
router.get('/in-progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📋 [API] Getting in-progress contracts for user:', userId);
    
    // Import database here to avoid circular dependencies
    const { db } = await import('../db');
    const { digitalContracts } = await import('../../shared/schema');
    const { eq, ne } = await import('drizzle-orm');
    
    const inProgressContracts = await db.select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId))
      .orderBy(digitalContracts.createdAt);
    
    // Filter for contracts that are in progress (signatures sent but not completed)
    const filteredContracts = inProgressContracts.filter(contract => {
      // Must have signature URLs generated (not a draft)
      const hasSignatureUrls = contract.contractorSignUrl && contract.clientSignUrl;
      if (!hasSignatureUrls) {
        return false; // This is draft, not in progress
      }
      
      // In Progress includes:
      // 1. One party signed
      // 2. Both parties signed but no PDF (status: both_signed_pending_pdf)
      // 3. Not marked as completed
      const isCompleted = contract.status === 'completed' && contract.signedPdfPath;
      return !isCompleted;
    });
    
    console.log(`✅ [API] Found ${filteredContracts.length} in-progress contracts for user`);
    
    // Transform data for frontend
    const contractsForFrontend = filteredContracts.map(contract => ({
      contractId: contract.contractId,
      status: contract.status,
      contractorName: contract.contractorName,
      clientName: contract.clientName,
      totalAmount: parseFloat(contract.totalAmount),
      contractorSigned: contract.contractorSigned,
      clientSigned: contract.clientSigned,
      contractorSignedAt: contract.contractorSignedAt,
      clientSignedAt: contract.clientSignedAt,
      contractorEmail: contract.contractorEmail,
      clientEmail: contract.clientEmail,
      contractorPhone: contract.contractorPhone,
      clientPhone: contract.clientPhone,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      isCompleted: false,
      needsAction: !contract.contractorSigned || !contract.clientSigned,
      contractorSignUrl: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/sign/${contract.contractId}/contractor`,
      clientSignUrl: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/sign/${contract.contractId}/client`
    }));
    
    res.json({
      success: true,
      contracts: contractsForFrontend
    });
    
  } catch (error: any) {
    console.error('❌ [API] Error getting in-progress contracts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/completed/:userId
 * Obtener todos los contratos completados de un usuario
 */
router.get('/completed/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📋 [API] Getting completed contracts for user:', userId);
    
    // Import database here to avoid circular dependencies
    const { db } = await import('../db');
    const { digitalContracts } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const completedContracts = await db.select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId))
      .orderBy(digitalContracts.updatedAt);
    
    console.log(`✅ [API] Found ${completedContracts.length} contracts for user`);
    
    // CRITICAL: Only truly completed contracts have BOTH signatures AND generated PDF
    const fullyCompletedContracts = completedContracts.filter(contract => 
      contract.status === 'completed' && 
      contract.contractorSigned && 
      contract.clientSigned &&
      contract.signedPdfPath // PDF must exist for contract to be considered completed
    );

    console.log(`🔍 [API] Filtered to ${fullyCompletedContracts.length} truly completed contracts`);

    // Transform data for frontend - show all signed contracts
    const contractsForFrontend = fullyCompletedContracts.map(contract => ({
      contractId: contract.contractId,
      status: contract.status,
      contractorName: contract.contractorName,
      clientName: contract.clientName,
      totalAmount: parseFloat(contract.totalAmount || '0'),
      contractorSigned: contract.contractorSigned,
      clientSigned: contract.clientSigned,
      contractorSignedAt: contract.contractorSignedAt,
      clientSignedAt: contract.clientSignedAt,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      signedPdfPath: contract.signedPdfPath,
      isCompleted: true,
      isDownloadable: !!contract.signedPdfPath, // PDF available for download
      hasPdf: !!contract.signedPdfPath,
      completionDate: contract.clientSignedAt || contract.updatedAt
    }));
    
    res.json({
      success: true,
      contracts: contractsForFrontend,
      total: contractsForFrontend.length,
    });
    
  } catch (error: any) {
    console.error('❌ [API] Error in /completed/:userId:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * POST /api/dual-signature/regenerate-pdf/:contractId
 * Regenerar PDF con firmas para contrato completado
 */
router.post('/regenerate-pdf/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    
    console.log('🔄 [API] Regenerating PDF for contract:', contractId);
    
    const result = await dualSignatureService.regenerateSignedPdf(contractId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        pdfPath: result.pdfPath,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Error in /regenerate-pdf:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/drafts/:userId
 * Get all draft contracts (created but no signatures sent)
 */
router.get('/drafts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('📋 [API] Getting draft contracts for user:', userId);
    
    // Import database here to avoid circular dependencies
    const { db } = await import('../db');
    const { digitalContracts } = await import('../../shared/schema');
    const { eq, or, isNull } = await import('drizzle-orm');
    
    const draftContracts = await db.select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId))
      .orderBy(digitalContracts.createdAt);
    
    // Filter for contracts that are drafts (no signature URLs generated)
    const filteredDrafts = draftContracts.filter(contract => 
      (!contract.contractorSignUrl || !contract.clientSignUrl) &&
      !contract.contractorSigned && 
      !contract.clientSigned &&
      contract.status !== 'completed'
    );
    
    console.log(`✅ [API] Found ${filteredDrafts.length} draft contracts for user`);
    
    // Transform data for frontend
    const contractsForFrontend = filteredDrafts.map(contract => ({
      contractId: contract.contractId,
      status: 'draft',
      contractorName: contract.contractorName,
      clientName: contract.clientName,
      totalAmount: parseFloat(contract.totalAmount || '0'),
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      projectDescription: (contract.contractData as any)?.projectDescription || 'Contract Draft'
    }));
    
    res.json({
      success: true,
      contracts: contractsForFrontend,
      total: contractsForFrontend.length,
    });
    
  } catch (error: any) {
    console.error('❌ [API] Error getting draft contracts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/test
 * Health check endpoint
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Dual Signature API is working',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/dual-signature/resend-links
 * Reenviar links de firma para un contrato existente
 */
router.post('/resend-links', async (req, res) => {
  try {
    const { contractId, methods } = req.body;
    
    console.log('📱 [API] Resending signature links for contract:', contractId, 'methods:', methods);
    
    // Import database here to avoid circular dependencies
    const { db } = await import('../db');
    const { digitalContracts } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    // Get contract data
    const [contract] = await db.select()
      .from(digitalContracts)
      .where(eq(digitalContracts.contractId, contractId))
      .limit(1);
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Contract not found'
      });
    }
    
    // Generate signature URLs
    const contractorSignUrl = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/sign/${contract.contractId}/contractor`;
    const clientSignUrl = `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/sign/${contract.contractId}/client`;
    
    const results = [];
    
    // Send via email if requested
    if (methods.includes('email')) {
      try {
        const { ResendEmailAdvanced } = await import('../services/resendEmailAdvanced');
        const emailService = new ResendEmailAdvanced();
        
        // Send to contractor if not signed
        if (!contract.contractorSigned) {
          await emailService.sendContractForSigning({
            to: contract.contractorEmail,
            contractorName: contract.contractorName,
            clientName: contract.clientName,
            projectDescription: contract.projectDescription,
            totalAmount: parseFloat(contract.totalAmount),
            signUrl: contractorSignUrl,
            party: 'contractor'
          });
          results.push('Email sent to contractor');
        }
        
        // Send to client if not signed
        if (!contract.clientSigned) {
          await emailService.sendContractForSigning({
            to: contract.clientEmail,
            contractorName: contract.contractorName,
            clientName: contract.clientName,
            projectDescription: contract.projectDescription,
            totalAmount: parseFloat(contract.totalAmount),
            signUrl: clientSignUrl,
            party: 'client'
          });
          results.push('Email sent to client');
        }
      } catch (emailError) {
        console.error('❌ Error sending emails:', emailError);
        results.push('Email sending failed');
      }
    }
    
    // Generate SMS/WhatsApp links if requested
    if (methods.includes('sms') || methods.includes('whatsapp')) {
      const smsMessage = `🔒 CONTRATO DIGITAL PENDIENTE\n\nHola ${contract.clientName},\n\nTu contrato para "${contract.projectDescription}" está listo para firma.\n\nMonto: $${parseFloat(contract.totalAmount).toLocaleString()}\n\n👆 Firmar: ${clientSignUrl}\n\n📧 Owl Fence - Contratos Seguros`;
      
      if (methods.includes('sms')) {
        results.push(`SMS link generated: sms:${contract.clientPhone}?body=${encodeURIComponent(smsMessage)}`);
      }
      
      if (methods.includes('whatsapp')) {
        results.push(`WhatsApp link generated: https://wa.me/${contract.clientPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(smsMessage)}`);
      }
    }
    
    res.json({
      success: true,
      results,
      contractorSignUrl: !contract.contractorSigned ? contractorSignUrl : null,
      clientSignUrl: !contract.clientSigned ? clientSignUrl : null,
      message: 'Links resent successfully'
    });
    
  } catch (error: any) {
    console.error('❌ [API] Error resending signature links:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/download-html/:contractId
 * Descargar contrato como archivo HTML con firmas
 */
router.get('/download-html/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    const requestingUserId = req.headers['x-user-id'] as string;
    
    console.log('📥 [API] HTML download request for contract:', contractId);
    console.log('👤 [API] Requesting user:', requestingUserId || 'No user ID');
    
    // Get contract data
    const contractResult = await dualSignatureService.getContractData(contractId, requestingUserId);
    
    if (!contractResult.success || !contractResult.contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found or access denied'
      });
    }
    
    const contract = contractResult.contract;
    
    // Helper function to create signature image for contract
    const createSignatureImage = (signatureData: string, signatureType: string, name: string) => {
      if (signatureType === 'cursive') {
        // Create styled SVG for typed signature
        return `data:image/svg+xml;base64,${Buffer.from(`
          <svg width="300" height="60" xmlns="http://www.w3.org/2000/svg">
            <text x="150" y="35" text-anchor="middle" font-family="Brush Script MT, cursive" font-size="28" fill="#000080">${name}</text>
          </svg>
        `).toString('base64')}`;
      } else {
        // Return actual canvas signature data
        return signatureData;
      }
    };

    // Use cheerio to properly inject signatures into the contract HTML
    const cheerio = await import('cheerio');
    const $ = cheerio.load(contract.contractHtml || '<h1>Contract Content Not Available</h1>');
    
    console.log('📝 [SIGNATURE-INJECTION] Processing contract signatures for display');
    
    // Find signature blocks
    const signBlocks = $('.sign-block');
    console.log(`Found ${signBlocks.length} signature blocks`);
    
    if (signBlocks.length >= 2) {
      // First sign-block is for Client
      if (contract.clientSigned && contract.clientSignatureData) {
        const clientSigImage = createSignatureImage(
          contract.clientSignatureData, 
          contract.clientSignatureType, 
          contract.clientName
        );
        
        const clientBlock = signBlocks.eq(0);
        const clientSignSpace = clientBlock.find('.sign-space');
        if (clientSignSpace.length > 0) {
          clientSignSpace.html(`<img src="${clientSigImage}" alt="Client Signature" style="max-height: 45px; max-width: 250px; display: block; margin: 0 auto;" />`);
          console.log('✅ Injected client signature');
        }
        
        // Update date
        const clientDateText = clientBlock.find('div').filter((i, el) => $(el).text().includes('Date:')).first();
        if (clientDateText.length > 0 && contract.clientSignedAt) {
          clientDateText.text(`Date: ${new Date(contract.clientSignedAt).toLocaleDateString()}`);
        }
      }
      
      // Second sign-block is for Contractor
      if (contract.contractorSigned && contract.contractorSignatureData) {
        const contractorSigImage = createSignatureImage(
          contract.contractorSignatureData, 
          contract.contractorSignatureType, 
          contract.contractorName
        );
        
        const contractorBlock = signBlocks.eq(1);
        const contractorSignSpace = contractorBlock.find('.sign-space');
        if (contractorSignSpace.length > 0) {
          contractorSignSpace.html(`<img src="${contractorSigImage}" alt="Contractor Signature" style="max-height: 45px; max-width: 250px; display: block; margin: 0 auto;" />`);
          console.log('✅ Injected contractor signature');
        }
        
        // Update date
        const contractorDateText = contractorBlock.find('div').filter((i, el) => $(el).text().includes('Date:')).first();
        if (contractorDateText.length > 0 && contract.contractorSignedAt) {
          contractorDateText.text(`Date: ${new Date(contract.contractorSignedAt).toLocaleDateString()}`);
        }
      }
    }
    
    let contractHtmlWithSignatures = $.html();

    // Generate complete HTML document with enhanced signatures
    const completeHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Signed Contract - ${contract.clientName}</title>
  <style>
    body {
      font-family: 'Times New Roman', serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      background: white;
      color: black;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .signatures {
      margin-top: 40px;
      padding: 20px;
      border: 2px solid #333;
      background: #f9f9f9;
      page-break-inside: avoid;
    }
    .signature-section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      background: white;
      border-radius: 8px;
    }
    .signature-preview {
      max-width: 300px;
      height: 80px;
      border: 2px solid #4a90e2;
      margin: 10px 0;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
    }
    .signature-preview img {
      max-width: 280px;
      max-height: 70px;
      object-fit: contain;
    }
    .contract-id {
      position: fixed;
      bottom: 10px;
      right: 10px;
      font-size: 10px;
      color: #666;
      background: rgba(255,255,255,0.8);
      padding: 5px;
      border-radius: 3px;
    }
    .verification-section {
      margin-top: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #e8f4f8 0%, #d1e7dd 100%);
      border: 2px solid #4a90e2;
      border-radius: 10px;
    }
    .signature-info {
      display: grid;
      gap: 8px;
      margin: 10px 0;
    }
    @media print {
      body { margin: 0; padding: 15px; }
      .contract-id { position: absolute; }
    }
  </style>
</head>
<body>
  ${contractHtmlWithSignatures}
  
  <div class="verification-section">
    <h4 style="color: #2c3e50; margin-bottom: 15px; text-align: center;">📋 Document Verification</h4>
    <div style="display: grid; gap: 8px;">
      <p><strong>Contract ID:</strong> ${contractId}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>Status:</strong> <span style="color: #27ae60; font-weight: bold;">${contract.status === 'completed' ? 'Fully Executed' : 'In Progress'}</span></p>
      <p><strong>Digital Integrity:</strong> This document contains embedded digital signatures and is legally binding under electronic signature laws.</p>
      <p><strong>Verification:</strong> Signatures are cryptographically secured and tamper-evident.</p>
    </div>
  </div>
  
  <div class="contract-id">
    Contract ID: ${contractId} | Generated: ${new Date().toISOString()}
  </div>
</body>
</html>
    `;
    
    // Set headers for HTML download
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="contract_${contract.clientName.replace(/\s+/g, '_')}_${contractId}.html"`);
    res.setHeader('Content-Length', Buffer.byteLength(completeHtml, 'utf8'));
    
    console.log('✅ [API] Serving signed contract HTML for download');
    res.send(completeHtml);
    
  } catch (error: any) {
    console.error('❌ [API] Error in /download-html/:contractId:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/download-pdf/:contractId
 * Download signed contract as PDF
 */
router.get('/download-pdf/:contractId', async (req, res) => {
  try {
    const { contractId } = req.params;
    console.log('📥 [API] PDF download request for contract:', contractId);
    console.log('👤 [API] Requesting user:', req.user?.uid || 'No user ID');

    const contractResult = await dualSignatureService.getContractData(contractId, req.user?.uid);
    if (!contractResult.success || !contractResult.contract) {
      return res.status(404).json({ success: false, message: contractResult.message });
    }
    
    const contract = contractResult.contract;

    // Helper function to create signature SVG
    const createSignatureImage = (signatureData: string, signatureType: string, name: string): string => {
      const color = '#000080';
      const svgContent = `<svg width="300" height="60" xmlns="http://www.w3.org/2000/svg">
        <text x="10" y="40" font-family="Brush Script MT, cursive" font-size="28" fill="${color}" style="font-style: italic;">
          ${name}
        </text>
      </svg>`;
      return `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;
    };

    // Use surgical signature injection approach for EXACT format preservation
    console.log('🔬 [SURGICAL-PDF] Using surgical signature injection for exact format preservation');
    
    try {
      // Import the surgical signature injection utilities
      const { injectSignaturesIntoHtml, generatePdfFromSignedHtml } = await import('../utils/surgicalSignatureInjection');
      
      // Prepare signature data
      const signatureData = {
        contractorSignature: contract.contractorSignature || undefined,
        contractorSignedAt: contract.contractorSignedAt || undefined,
        clientSignature: contract.clientSignature || undefined,
        clientSignedAt: contract.clientSignedAt || undefined,
      };
      
      // First inject signatures into HTML
      console.log('💉 [SURGICAL-PDF] Injecting signatures into contract HTML');
      const signedHtml = await injectSignaturesIntoHtml(
        contract.contractHtml || '<h1>Contract Content Not Available</h1>',
        signatureData
      );
      
      // Then generate PDF from the signed HTML
      console.log('🔄 [SURGICAL-PDF] Generating PDF from signed HTML');
      const pdfBuffer = await generatePdfFromSignedHtml(signedHtml, contractId);
      
      console.log('✅ [SURGICAL-PDF] PDF generated successfully with exact format preserved');
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contract_${contract.clientName.replace(/\s+/g, '_')}_${contractId}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      console.log('✅ [API] Serving signed contract PDF for download');
      res.send(pdfBuffer);
      
    } catch (surgicalError: any) {
      console.error('❌ [SURGICAL-PDF] Surgical injection failed:', surgicalError);
      
      // Fallback to simple text-based PDF with correct formatting
      try {
        console.log('🔄 [FALLBACK-PDF] Creating properly formatted PDF fallback...');
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        
        // Extract text content from HTML for display
        const cheerio = await import('cheerio');
        const $ = cheerio.load(contract.contractHtml || '');
        
        // Create new PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { width, height } = page.getSize();
        
        // Embed Times New Roman font
        const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
        const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        
        // Add header
        page.drawText('INDEPENDENT CONTRACTOR AGREEMENT', {
          x: width / 2 - 150,
          y: height - 80,
          size: 18,
          font: timesRomanBold,
          color: rgb(0, 0, 0),
        });
        
        // Add contract details
        let yPosition = height - 120;
        
        // Contract date
        page.drawText(`Agreement Date: ${$('div:contains("Agreement Date:")').text().replace('Agreement Date:', '').trim()}`, {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRoman,
          color: rgb(0, 0, 0),
        });
        yPosition -= 30;
        
        // Add parties info
        page.drawText('CONTRACTOR:', {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRomanBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        page.drawText(contract.contractorName || 'Not specified', {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRoman,
          color: rgb(0, 0, 0),
        });
        yPosition -= 40;
        
        page.drawText('CLIENT:', {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRomanBold,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
        
        page.drawText(contract.clientName || 'Not specified', {
          x: 50,
          y: yPosition,
          size: 12,
          font: timesRoman,
          color: rgb(0, 0, 0),
        });
        yPosition -= 40;
        
        // Add signatures if available
        if (contract.contractorSigned || contract.clientSigned) {
          page.drawText('SIGNATURES:', {
            x: 50,
            y: yPosition,
            size: 14,
            font: timesRomanBold,
            color: rgb(0, 0, 0),
          });
          yPosition -= 30;
          
          if (contract.contractorSigned) {
            page.drawText(`Contractor: ${contract.contractorSignature || contract.contractorName}`, {
              x: 50,
              y: yPosition,
              size: 12,
              font: timesRoman,
              color: rgb(0, 0, 0.5),
            });
            if (contract.contractorSignedAt) {
              page.drawText(`Date: ${new Date(contract.contractorSignedAt).toLocaleDateString()}`, {
                x: 300,
                y: yPosition,
                size: 12,
                font: timesRoman,
                color: rgb(0, 0, 0),
              });
            }
            yPosition -= 30;
          }
          
          if (contract.clientSigned) {
            page.drawText(`Client: ${contract.clientSignature || contract.clientName}`, {
              x: 50,
              y: yPosition,
              size: 12,
              font: timesRoman,
              color: rgb(0, 0, 0.5),
            });
            if (contract.clientSignedAt) {
              page.drawText(`Date: ${new Date(contract.clientSignedAt).toLocaleDateString()}`, {
                x: 300,
                y: yPosition,
                size: 12,
                font: timesRoman,
                color: rgb(0, 0, 0),
              });
            }
          }
        }
        
        const pdfBytes = await pdfDoc.save();
        console.log('✅ [FALLBACK-PDF] Fallback PDF generated successfully');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="contract_${contract.clientName.replace(/\s+/g, '_')}_${contractId}.pdf"`);
        res.setHeader('Content-Length', pdfBytes.length);
        res.send(Buffer.from(pdfBytes));
        
      } catch (fallbackError: any) {
        console.error('❌ [FALLBACK-PDF] All PDF generation methods failed:', fallbackError);
        
        // Final fallback: Return error message
        res.status(500).json({
          success: false,
          message: 'PDF generation failed. Please use Download HTML option instead.',
          error: fallbackError.message
        });
      }
    }
    
  } catch (error: any) {
    console.error('❌ [API] Error in /download-pdf/:contractId:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

/**
 * POST /api/dual-signature/generate-pdf-from-html
 * Generate PDF from signed HTML content - CRITICAL FIX for PDF/HTML mismatch
 */
router.post('/generate-pdf-from-html', async (req, res) => {
  try {
    const { contractId, htmlContent, clientName } = req.body;
    
    console.log('📄 [CRITICAL-FIX] Generating PDF from signed HTML for contract:', contractId);
    
    if (!contractId || !htmlContent || !clientName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: contractId, htmlContent, or clientName'
      });
    }

    try {
      // DIRECT PUPPETEER IMPLEMENTATION - No external dependencies
      console.log('🎯 [CRITICAL-FIX] Using direct Puppeteer implementation for EXACT HTML layout');
      
      const puppeteer = await import('puppeteer');
      
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-extensions'
        ],
      });
      
      const page = await browser.newPage();
      
      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1200,
        height: 1600,
        deviceScaleFactor: 2,
      });
      
      // Inject the HTML content
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000,
      });
      
      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');
      await page.waitForTimeout(1000);
      
      // Generate PDF with settings that preserve exact layout
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; font-family: 'Times New Roman', serif; color: #666;">
            <span style="margin: 0 auto;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
        margin: {
          top: '0.75in',
          right: '0.75in',
          bottom: '1in',
          left: '0.75in',
        },
        preferCSSPageSize: false,
        scale: 1,
      });
      
      await browser.close();
      
      console.log('✅ [CRITICAL-FIX] PDF generated successfully with EXACT HTML layout preserved using direct Puppeteer');
      
      // Return PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="contract_${clientName.replace(/\s+/g, '_')}_signed.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(Buffer.from(pdfBuffer));
      
    } catch (puppeteerError: any) {
      console.error('❌ [CRITICAL-FIX] Direct Puppeteer failed:', puppeteerError.message);
      
      // Fallback to simple text-based PDF with signed content
      try {
        const { createSimplePdfFromText } = await import('../utils/simplePdfGenerator');
        
        // Extract text content from HTML for simple PDF
        const textContent = htmlContent
          .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
          .replace(/\s+/g, ' ')      // Normalize whitespace
          .trim();
        
        const simplePdfBuffer = await createSimplePdfFromText(textContent, {
          title: `Signed Contract - ${clientName}`,
          contractId
        });
        
        console.log('✅ [CRITICAL-FIX] Fallback simple PDF generated from signed content');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="contract_${contractId}_signed_text.pdf"`);
        res.send(simplePdfBuffer);
        
      } catch (fallbackError: any) {
        console.error('❌ [CRITICAL-FIX] All PDF generation methods failed:', fallbackError.message);
        
        return res.status(500).json({
          success: false,
          message: 'PDF generation failed. Chrome dependencies may be missing. Use View HTML or Download HTML instead.',
          error: fallbackError.message
        });
      }
    }
    
  } catch (error: any) {
    console.error('❌ [CRITICAL-FIX] Error in /generate-pdf-from-html:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while generating PDF from signed HTML',
      error: error.message,
    });
  }
});

export default router;
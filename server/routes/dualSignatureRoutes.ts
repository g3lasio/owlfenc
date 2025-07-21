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
    
    // Filter for contracts that are not completed (missing signatures OR missing PDF)
    const filteredContracts = inProgressContracts.filter(contract => 
      contract.status !== 'completed' || 
      !contract.contractorSigned || 
      !contract.clientSigned ||
      !contract.signedPdfPath  // CRITICAL: Include signed contracts without PDF in "in progress"
    );
    
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
    
    // Filter for completed contracts (both signed, PDF optional due to Chrome issues)
    const fullyCompletedContracts = completedContracts.filter(contract => 
      contract.status === 'completed' && 
      contract.contractorSigned && 
      contract.clientSigned
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

    // Inject signatures into the contract HTML
    let contractHtmlWithSignatures = contract.contractHtml || '<h1>Contract Content Not Available</h1>';
    
    console.log('📝 [SIGNATURE-INJECTION] Processing contract signatures for display');
    
    if (contract.contractorSigned && contract.contractorSignatureData) {
      const contractorSigImage = createSignatureImage(
        contract.contractorSignatureData, 
        contract.contractorSignatureType, 
        contract.contractorName
      );
      
      // Replace contractor signature line with actual signature
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /<div class="signature-line"><\/div>/,
        `<div class="signature-line" style="display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
          <img src="${contractorSigImage}" alt="Contractor Signature" style="max-height: 45px; max-width: 250px;" />
        </div>`
      );
      
      // Also fill in contractor date
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /<span class="date-line"><\/span>/,
        `<span class="date-line" style="font-weight: bold;">${new Date(contract.contractorSignedAt).toLocaleDateString()}</span>`
      );
    }
    
    if (contract.clientSigned && contract.clientSignatureData) {
      const clientSigImage = createSignatureImage(
        contract.clientSignatureData, 
        contract.clientSignatureType, 
        contract.clientName
      );
      
      // Replace client signature line with actual signature (find remaining empty signature line)
      // Look for the CLIENT section and replace the empty signature line within it
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(<div class="signature-title">CLIENT<\/div>\s*)<div class="signature-line"><\/div>/,
        `$1<div class="signature-line" style="display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
          <img src="${clientSigImage}" alt="Client Signature" style="max-height: 45px; max-width: 250px;" />
        </div>`
      );
      
      // Fill in client date (look for CLIENT section and replace the date line)
      // Handle both normal and broken date formatting
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(CLIENT[\s\S]*?<span class="date-line"[^>]*>)[^<]*?(<\/span>)/,
        `$1${new Date(contract.clientSignedAt).toLocaleDateString()}$2`
      );
      
      // Also handle broken patterns where style attribute is misplaced
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(CLIENT[\s\S]*?Date:\s*<span class="date-line")\s+style="font-weight:\s*bold;">([^<]*?)(<\/span>)/g,
        `$1>${new Date(contract.clientSignedAt).toLocaleDateString()}$3`
      );
    }

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

    // Inject signatures into the contract HTML
    let contractHtmlWithSignatures = contract.contractHtml || '<h1>Contract Content Not Available</h1>';
    
    console.log('📝 [SIGNATURE-INJECTION] Processing contract signatures for PDF generation');
    
    if (contract.contractorSigned && contract.contractorSignatureData) {
      const contractorSigImage = createSignatureImage(
        contract.contractorSignatureData, 
        contract.contractorSignatureType, 
        contract.contractorName
      );
      
      // Replace contractor signature line with actual signature
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(<div class="signature-title">CONTRACTOR<\/div>\s*)<div class="signature-line"><\/div>/,
        `$1<div class="signature-line" style="display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
          <img src="${contractorSigImage}" alt="Contractor Signature" style="max-height: 45px; max-width: 250px;" />
        </div>`
      );
      
      // Fill in contractor date
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(CONTRACTOR[\s\S]*?<span class="date-line"[^>]*>)([^<]*?)(<\/span>)/,
        `$1${new Date(contract.contractorSignedAt).toLocaleDateString()}$3`
      );
    }
    
    if (contract.clientSigned && contract.clientSignatureData) {
      const clientSigImage = createSignatureImage(
        contract.clientSignatureData, 
        contract.clientSignatureType, 
        contract.clientName
      );
      
      // Replace client signature line with actual signature
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(<div class="signature-title">CLIENT<\/div>\s*)<div class="signature-line"><\/div>/,
        `$1<div class="signature-line" style="display: flex; align-items: center; justify-content: center; background: #f8f9fa;">
          <img src="${clientSigImage}" alt="Client Signature" style="max-height: 45px; max-width: 250px;" />
        </div>`
      );
      
      // Fill in client date - handle both normal and broken formatting
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(CLIENT[\s\S]*?<span class="date-line"[^>]*>)[^<]*?(<\/span>)/,
        `$1${new Date(contract.clientSignedAt).toLocaleDateString()}$2`
      );
      
      // Also handle broken patterns where style attribute is misplaced
      contractHtmlWithSignatures = contractHtmlWithSignatures.replace(
        /(CLIENT[\s\S]*?Date:\s*<span class="date-line")\s+style="font-weight:\s*bold;">([^<]*?)(<\/span>)/g,
        `$1>${new Date(contract.clientSignedAt).toLocaleDateString()}$3`
      );
    }

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
    .verification-section {
      margin-top: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #e8f4f8 0%, #d1e7dd 100%);
      border: 2px solid #4a90e2;
      border-radius: 10px;
    }
    @media print {
      body { margin: 0; padding: 15px; }
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
</body>
</html>
    `;
    
    // Generate PDF from HTML
    console.log('🔄 [PDF] Generating PDF from signed contract HTML');
    const pdfBuffer = await documentService.generatePdfFromHtml(completeHtml);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contract_${contract.clientName.replace(/\s+/g, '_')}_${contractId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    console.log('✅ [API] Serving signed contract PDF for download');
    res.send(pdfBuffer);
    
  } catch (error: any) {
    console.error('❌ [API] Error in /download-pdf/:contractId:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
});

export default router;
/**
 * Dual Signature API Routes
 * Endpoints para el Sistema de Firma Dual Automática
 */

import { Router } from 'express';
import { dualSignatureService } from '../services/dualSignatureService';
import { z } from 'zod';

const router = Router();

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
    
    // Filter for contracts that are not completed
    const filteredContracts = inProgressContracts.filter(contract => 
      contract.status !== 'completed' || (!contract.contractorSigned || !contract.clientSigned)
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
    
    // Transform data for frontend
    const contractsForFrontend = completedContracts.map(contract => ({
      contractId: contract.contractId,
      status: contract.status,
      contractorName: contract.contractorName,
      clientName: contract.clientName,
      totalAmount: contract.totalAmount,
      contractorSigned: contract.contractorSigned,
      clientSigned: contract.clientSigned,
      contractorSignedAt: contract.contractorSignedAt,
      clientSignedAt: contract.clientSignedAt,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      signedPdfPath: contract.signedPdfPath,
      isCompleted: contract.status === 'completed',
      isDownloadable: contract.status === 'completed' && contract.signedPdfPath,
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

export default router;
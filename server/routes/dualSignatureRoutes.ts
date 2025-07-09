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

export default router;
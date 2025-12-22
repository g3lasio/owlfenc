/**
 * Rutas optimizadas para generación rápida de PDF
 * Sistema modular reutilizable para estimados y contratos
 */

import { Router, Request, Response, NextFunction } from 'express';
import { modernPdfService } from '../services/ModernPdfService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';
import { 
  requireLegalDefenseAccess,
  validateUsageLimit,
  incrementUsageOnSuccess 
} from '../middleware/subscription-auth';

const router = Router();

/**
 * Endpoint principal para generación rápida de PDF
 * Reemplaza completamente el sistema anterior
 */
router.post('/generate-pdf', verifyFirebaseAuth, async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('🚀 [MODERN-ENDPOINT] Nueva solicitud de PDF recibida');

  try {
    const { html, title, estimateId, type = 'estimate' } = req.body;

    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML requerido para generar PDF'
      });
    }

    const firebaseUid = (req as any).firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false, 
        error: 'Usuario no autenticado' 
      });
    }
    
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    
    if (!userId) {
      const createResult = await userMappingService.createMapping(
        firebaseUid, 
        (req as any).firebaseUser?.email || `${firebaseUid}@firebase.auth`
      );
      if (createResult) {
        userId = createResult.id;
      }
    }
    
    if (!userId) {
      return res.status(500).json({ 
        success: false, 
        error: 'Error creando mapeo de usuario' 
      });
    }
    
    console.log(`🔐 [SECURITY] Generating PDF for REAL user_id: ${userId}`);
    console.log(`📄 [MODERN-ENDPOINT] Generando PDF tipo: ${type}`);
    console.log(`📏 [MODERN-ENDPOINT] Tamaño HTML: ${html.length} caracteres`);

    if (type === 'contract') {
      console.warn(`⚠️ [SECURITY] Rejected contract generation via /generate-pdf for user: ${userId}`);
      return res.status(403).json({
        success: false,
        error: 'Contract generation not allowed through this endpoint',
        message: 'Use /api/modern-pdf/generate-contract endpoint for contracts',
        code: 'CONTRACT_GUARD_REQUIRED'
      });
    }

    const result = await modernPdfService.generateEstimatePdf(html, estimateId || 'estimate');

    if (!result.success || !result.buffer) {
      console.error('❌ [MODERN-ENDPOINT] Error generando PDF:', result.error);
      return res.status(500).json({
        success: false,
        error: result.error || 'Error desconocido'
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ [MODERN-ENDPOINT] PDF generado exitosamente en ${totalTime}ms`);
    console.log(`📊 [MODERN-ENDPOINT] Tiempo de procesamiento: ${result.processingTime}ms`);
    console.log(`📦 [MODERN-ENDPOINT] Tamaño del PDF: ${result.buffer.length} bytes`);

    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : 'documento.pdf';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('X-Generation-Time', totalTime.toString());
    res.setHeader('X-Processing-Time', result.processingTime.toString());

    res.send(result.buffer);

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ [MODERN-ENDPOINT] Error inesperado:', error);
    
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      processingTime: totalTime
    });
  }
});

/**
 * Endpoint específico para estimados (compatibilidad)
 */
router.post('/generate-estimate', verifyFirebaseAuth, async (req: Request, res: Response) => {
  console.log('📊 [MODERN-ENDPOINT] Solicitud específica de estimado');
  req.body.type = 'estimate';
  
  const { html, title, estimateId } = req.body;
  
  if (!html) {
    return res.status(400).json({
      success: false,
      error: 'HTML requerido para generar PDF'
    });
  }

  try {
    const result = await modernPdfService.generateEstimatePdf(html, estimateId || 'estimate');
    
    if (!result.success || !result.buffer) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Error generando PDF'
      });
    }

    const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : 'estimado.pdf';
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', result.buffer.length);
    
    res.send(result.buffer);
  } catch (error) {
    console.error('❌ [MODERN-ENDPOINT] Error en generate-estimate:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
});

/**
 * Endpoint específico para contratos con protección completa
 */
router.post('/generate-contract', 
  verifyFirebaseAuth, 
  requireLegalDefenseAccess,
  validateUsageLimit('contracts'),
  incrementUsageOnSuccess('contracts'),
  async (req: Request, res: Response) => {
    console.log('📋 [MODERN-ENDPOINT] Solicitud específica de contrato');
    
    const { html, title, contractId } = req.body;
    
    if (!html) {
      return res.status(400).json({
        success: false,
        error: 'HTML requerido para generar PDF'
      });
    }

    try {
      const result = await modernPdfService.generateContractPdf(html, contractId || 'contract');
      
      if (!result.success || !result.buffer) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Error generando PDF'
        });
      }

      const filename = title ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf` : 'contrato.pdf';
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', result.buffer.length);
      
      res.send(result.buffer);
    } catch (error) {
      console.error('❌ [MODERN-ENDPOINT] Error en generate-contract:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor'
      });
    }
  }
);

/**
 * Health check del servicio PDF
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthResult = await modernPdfService.healthCheck();

    res.json({
      status: healthResult.healthy ? 'healthy' : 'unhealthy',
      service: 'ModernPdfService',
      ...healthResult.details,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'ModernPdfService',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

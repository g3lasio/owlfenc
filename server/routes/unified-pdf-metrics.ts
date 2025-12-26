/**
 * Unified PDF Engine Metrics Endpoint
 * 
 * Endpoint para monitorear el rendimiento y uso del sistema Dual-Engine de PDFs
 */

import { Router, Request, Response } from 'express';
import { unifiedPdfEngine } from '../services/unifiedPdfEngine';

const router = Router();

/**
 * GET /api/pdf-metrics
 * Obtiene métricas del Unified PDF Engine
 */
router.get('/api/pdf-metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = unifiedPdfEngine.getMetrics();
    const report = unifiedPdfEngine.getMetricsReport();
    
    res.status(200).json({
      success: true,
      metrics,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/pdf-metrics/reset
 * Resetea las métricas (útil para testing)
 */
router.post('/api/pdf-metrics/reset', async (_req: Request, res: Response) => {
  try {
    unifiedPdfEngine.resetMetrics();
    
    res.status(200).json({
      success: true,
      message: 'Metrics reset successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

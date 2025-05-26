/**
 * Labor DeepSearch API Routes
 * 
 * Endpoints para el análisis inteligente de labor y servicios usando IA.
 * Funciona independientemente del DeepSearch de materiales.
 */

import { Request, Response, Express } from 'express';
import { z } from 'zod';
import { laborDeepSearchService } from '../services/laborDeepSearchService';

// Schema para validación de entrada - Labor únicamente
const LaborAnalysisSchema = z.object({
  projectDescription: z.string().min(10, 'La descripción del proyecto debe tener al menos 10 caracteres'),
  location: z.string().optional(),
  projectType: z.string().optional(),
  estimateId: z.string().optional()
});

// Schema para análisis combinado (materiales + labor)
const CombinedAnalysisSchema = z.object({
  projectDescription: z.string().min(10, 'La descripción del proyecto debe tener al menos 10 caracteres'),
  location: z.string().optional(),
  projectType: z.string().optional(),
  includeMaterials: z.boolean().default(true),
  includeLabor: z.boolean().default(true),
  estimateId: z.string().optional()
});

export function registerLaborDeepSearchRoutes(app: Express): void {
  
  /**
   * POST /api/labor-deepsearch/analyze
   * Analiza un proyecto y genera únicamente lista de tareas de labor/servicios
   */
  app.post('/api/labor-deepsearch/analyze', async (req: Request, res: Response) => {
    try {
      console.log('🔧 Labor DeepSearch API: Recibiendo solicitud de análisis de labor', req.body);

      // Validar entrada
      const validatedData = LaborAnalysisSchema.parse(req.body);
      
      // Procesar con el servicio Labor DeepSearch
      const laborResult = await laborDeepSearchService.analyzeLaborRequirements(
        validatedData.projectDescription,
        validatedData.location,
        validatedData.projectType
      );

      console.log('✅ Labor DeepSearch API: Análisis de labor completado', {
        laborItemsCount: laborResult.laborItems.length,
        totalHours: laborResult.totalHours,
        totalCost: laborResult.totalLaborCost
      });

      res.json({
        success: true,
        labor: laborResult,
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-3-7-sonnet-20250219',
          type: 'labor-only'
        }
      });

    } catch (error: any) {
      console.error('❌ Labor DeepSearch API Error:', error);
      
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.name || 'LABOR_ANALYSIS_ERROR'
      });
    }
  });

  /**
   * POST /api/labor-deepsearch/generate-items
   * Genera lista de items de labor compatible con el sistema de estimados
   */
  app.post('/api/labor-deepsearch/generate-items', async (req: Request, res: Response) => {
    try {
      console.log('🔧 Labor DeepSearch API: Generando items de labor compatibles');

      // Validar entrada
      const validatedData = LaborAnalysisSchema.parse(req.body);
      
      // Generar lista compatible de labor
      const laborItems = await laborDeepSearchService.generateCompatibleLaborList(
        validatedData.projectDescription,
        validatedData.location,
        validatedData.projectType
      );

      console.log('✅ Labor DeepSearch API: Items de labor generados', {
        laborItemsCount: laborItems.length
      });

      res.json({
        success: true,
        items: laborItems,
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-3-7-sonnet-20250219',
          type: 'labor-items'
        }
      });

    } catch (error: any) {
      console.error('❌ Labor DeepSearch Items API Error:', error);
      
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.name || 'LABOR_ITEMS_GENERATION_ERROR'
      });
    }
  });

  /**
   * POST /api/labor-deepsearch/combined
   * Genera análisis combinado de materiales Y labor
   */
  app.post('/api/labor-deepsearch/combined', async (req: Request, res: Response) => {
    try {
      console.log('🔧🔨 Combined DeepSearch API: Recibiendo solicitud de análisis combinado', req.body);

      // Validar entrada
      const validatedData = CombinedAnalysisSchema.parse(req.body);
      
      // Procesar con el servicio combinado
      const combinedResult = await laborDeepSearchService.generateCombinedEstimate(
        validatedData.projectDescription,
        validatedData.includeMaterials,
        validatedData.includeLabor,
        validatedData.location,
        validatedData.projectType
      );

      console.log('✅ Combined DeepSearch API: Análisis combinado completado', {
        materialsCount: combinedResult.materials.length,
        laborCount: combinedResult.labor.length,
        totalMaterialsCost: combinedResult.totalMaterialsCost,
        totalLaborCost: combinedResult.totalLaborCost,
        grandTotal: combinedResult.grandTotal
      });

      res.json({
        success: true,
        materials: combinedResult.materials,
        labor: combinedResult.labor,
        costs: {
          materials: combinedResult.totalMaterialsCost,
          labor: combinedResult.totalLaborCost,
          total: combinedResult.grandTotal
        },
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-3-7-sonnet-20250219',
          type: 'combined-analysis',
          includedMaterials: validatedData.includeMaterials,
          includedLabor: validatedData.includeLabor
        }
      });

    } catch (error: any) {
      console.error('❌ Combined DeepSearch API Error:', error);
      
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.name || 'COMBINED_ANALYSIS_ERROR'
      });
    }
  });

  /**
   * GET /api/labor-deepsearch/health
   * Endpoint de salud para verificar el estado del servicio de labor
   */
  app.get('/api/labor-deepsearch/health', async (req: Request, res: Response) => {
    try {
      // Verificar que la API key de Anthropic esté disponible
      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      
      if (!hasApiKey) {
        return res.status(503).json({
          status: 'error',
          message: 'API key de Anthropic no configurada para Labor DeepSearch',
          available: false
        });
      }

      res.json({
        status: 'healthy',
        message: 'Labor DeepSearch IA funcionando correctamente',
        available: true,
        model: 'claude-3-7-sonnet-20250219',
        capabilities: [
          'labor-analysis',
          'service-estimation',
          'combined-analysis',
          'cost-calculation'
        ]
      });

    } catch (error: any) {
      console.error('❌ Labor DeepSearch Health Check Error:', error);
      
      res.status(500).json({
        status: 'error',
        message: 'Error verificando estado del Labor DeepSearch',
        available: false,
        error: error.message
      });
    }
  });

  console.log('🔧 Labor DeepSearch API Routes registradas correctamente');
}
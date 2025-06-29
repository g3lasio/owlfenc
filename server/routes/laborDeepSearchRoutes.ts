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
   * POST /api/labor-deepsearch/labor-only
   * LABOR COSTS ONLY: Genera únicamente costos de labor sin materiales
   */
  app.post('/api/labor-deepsearch/labor-only', async (req: Request, res: Response) => {
    try {
      console.log('🔧 LABOR ONLY DeepSearch: Recibiendo solicitud', req.body);

      // Validar entrada
      const validatedData = LaborAnalysisSchema.parse(req.body);
      
      // Procesar únicamente labor
      const laborResult = await laborDeepSearchService.analyzeLaborRequirements(
        validatedData.projectDescription,
        validatedData.location,
        validatedData.projectType
      );

      // Estructura de respuesta compatible con DeepSearchResult
      const laborOnlyResult = {
        projectType: laborResult.projectType || 'Labor Analysis',
        projectScope: `Labor cost analysis for: ${validatedData.projectDescription.substring(0, 100)}...`,
        materials: [], // LABOR ONLY: Sin materiales
        laborCosts: laborResult.laborItems || [],
        additionalCosts: [],
        totalMaterialsCost: 0, // LABOR ONLY: $0 en materiales
        totalLaborCost: laborResult.totalCost || 0,
        totalAdditionalCost: 0,
        grandTotal: laborResult.totalCost || 0,
        confidence: 0.85,
        recommendations: ['Análisis enfocado únicamente en costos de labor'],
        warnings: laborResult.laborItems?.length === 0 ? ['No se encontraron tareas de labor específicas'] : []
      };

      console.log('✅ LABOR ONLY: Análisis completado', {
        laborItemsCount: laborResult.laborItems?.length || 0,
        totalCost: laborResult.totalCost || 0
      });

      res.json({
        success: true,
        data: laborOnlyResult,
        timestamp: new Date().toISOString(),
        searchType: 'labor_only'
      });

    } catch (error: any) {
      console.error('❌ Error en LABOR ONLY DeepSearch:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
        searchType: 'labor_only'
      });
    }
  });

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

      // Formatear respuesta compatible con DeepSearchResult para FULL COSTS
      const fullCostsResult = {
        projectType: combinedResult.projectType || 'Combined Analysis',
        projectScope: `Complete analysis: ${validatedData.projectDescription.substring(0, 100)}...`,
        materials: combinedResult.materials || [],
        laborCosts: combinedResult.labor || [],
        additionalCosts: [],
        totalMaterialsCost: combinedResult.totalMaterialsCost || 0,
        totalLaborCost: combinedResult.totalLaborCost || 0,
        totalAdditionalCost: 0,
        grandTotal: combinedResult.grandTotal || 0,
        confidence: 0.90,
        recommendations: ['Análisis completo con materiales y labor'],
        warnings: []
      };

      console.log('✅ OPTIMIZED Combined estimate generated:', {
        materialsCount: fullCostsResult.materials.length,
        laborCount: fullCostsResult.laborCosts.length,
        totalMaterialsCost: fullCostsResult.totalMaterialsCost,
        totalLaborCost: fullCostsResult.totalLaborCost,
        grandTotal: fullCostsResult.grandTotal
      });

      res.json({
        success: true,
        data: fullCostsResult,
        timestamp: new Date().toISOString(),
        searchType: 'full_costs'
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
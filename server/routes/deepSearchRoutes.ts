/**
 * Rutas de la API para el módulo DeepSearch IA - SIN AUTENTICACION
 * 
 * Proporciona endpoints para analizar proyectos y generar
 * automáticamente listas de materiales con IA.
 */

import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { deepSearchService } from '../services/deepSearchService';
import { smartMaterialCacheService } from '../services/smartMaterialCacheService';
import { deepSearchRefinementService } from '../services/deepSearchRefinementService';

// Esquemas de validación
const ProjectAnalysisSchema = z.object({
  projectDescription: z.string().min(10, 'La descripción del proyecto debe tener al menos 10 caracteres'),
  location: z.string().optional(),
  userId: z.string().optional(),
  includeLabor: z.boolean().default(true),
  includeAdditionalCosts: z.boolean().default(true)
});

const MaterialsGenerationSchema = z.object({
  projectDescription: z.string().min(10, 'La descripción del proyecto debe tener al menos 10 caracteres'),
  location: z.string().optional(),
  estimateId: z.string().optional()
});

export function registerDeepSearchRoutes(app: Express): void {
  
  /**
   * POST /api/deepsearch/refine
   * CHAT INTERACTIVO: Procesa solicitudes de refinamiento de DeepSearch
   */
  app.post('/api/deepsearch/refine', async (req: Request, res: Response) => {
    console.log('🔍 [DEEPSEARCH-REFINE] Nueva solicitud de refinamiento');
    
    try {
      const { userRequest, currentResult, projectDescription, location, conversationHistory } = req.body;

      // Validar datos requeridos
      if (!userRequest || !currentResult || !projectDescription) {
        return res.status(400).json({
          success: false,
          error: 'Faltan datos requeridos: userRequest, currentResult, projectDescription'
        });
      }

      console.log('📝 [DEEPSEARCH-REFINE] Procesando:', {
        userRequest: userRequest.substring(0, 100) + '...',
        location,
        materialsCount: currentResult.materials?.length || 0,
        currentTotal: currentResult.grandTotal || 0
      });

      // Procesar refinamiento
      const refinementResult = await deepSearchRefinementService.processRefinementRequest({
        userRequest,
        currentResult,
        projectDescription,
        location,
        conversationHistory
      });

      console.log('✅ [DEEPSEARCH-REFINE] Refinamiento completado:', {
        success: refinementResult.success,
        hasUpdatedResult: !!refinementResult.updatedResult,
        suggestedActionsCount: refinementResult.suggestedActions?.length || 0
      });

      res.json(refinementResult);

    } catch (error: any) {
      console.error('❌ [DEEPSEARCH-REFINE] Error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor procesando refinamiento',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });

  /**
   * POST /api/deepsearch/materials
   * ONLY MATERIALS: Genera únicamente materiales sin costos de labor
   */
  app.post('/api/deepsearch/materials', async (req: Request, res: Response) => {
    try {
      console.log('📦 MATERIALS ONLY DeepSearch: Recibiendo solicitud', req.body);

      // Validar entrada
      const validatedData = ProjectAnalysisSchema.parse(req.body);
      
      // Procesar con el servicio DeepSearch
      const analysisResult = await deepSearchService.analyzeProject(
        validatedData.projectDescription,
        validatedData.location
      );

      // ONLY MATERIALS: Eliminar todos los costos de labor
      analysisResult.laborCosts = [];
      analysisResult.totalLaborCost = 0;
      analysisResult.grandTotal = analysisResult.totalMaterialsCost + analysisResult.totalAdditionalCost;

      console.log('✅ MATERIALS ONLY: Análisis completado', {
        materialsCount: analysisResult.materials.length,
        totalCost: analysisResult.grandTotal
      });

      res.json({
        success: true,
        data: analysisResult,
        timestamp: new Date().toISOString(),
        searchType: 'materials_only'
      });

    } catch (error: any) {
      console.error('❌ Error en MATERIALS ONLY DeepSearch:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error interno del servidor',
        searchType: 'materials_only'
      });
    }
  });

  /**
   * POST /api/deepsearch/analyze
   * Analiza un proyecto y genera lista completa de materiales, labor y costos
   */
  app.post('/api/deepsearch/analyze', async (req: Request, res: Response) => {
    try {
      console.log('🔍 DeepSearch API: Recibiendo solicitud de análisis', req.body);

      // Validar entrada
      const validatedData = ProjectAnalysisSchema.parse(req.body);
      
      // Procesar con el servicio DeepSearch
      const analysisResult = await deepSearchService.analyzeProject(
        validatedData.projectDescription,
        validatedData.location
      );

      // Filtrar resultados según preferencias
      if (!validatedData.includeLabor) {
        analysisResult.laborCosts = [];
        analysisResult.totalLaborCost = 0;
      }

      if (!validatedData.includeAdditionalCosts) {
        analysisResult.additionalCosts = [];
        analysisResult.totalAdditionalCost = 0;
      }

      // Recalcular total si se filtraron secciones
      if (!validatedData.includeLabor || !validatedData.includeAdditionalCosts) {
        analysisResult.grandTotal = analysisResult.totalMaterialsCost + 
                                   analysisResult.totalLaborCost + 
                                   analysisResult.totalAdditionalCost;
      }

      console.log('✅ DeepSearch API: Análisis completado exitosamente', {
        materialsCount: analysisResult.materials.length,
        totalCost: analysisResult.grandTotal,
        confidence: analysisResult.confidence
      });

      res.json({
        success: true,
        data: analysisResult,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - req.body.startTime || 0,
          model: 'claude-3-7-sonnet-20250219'
        }
      });

    } catch (error: any) {
      console.error('❌ DeepSearch API Error:', error);
      
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.name || 'DEEPSEARCH_ERROR',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  /**
   * POST /api/deepsearch/materials-only
   * Genera solo la lista de materiales compatible con el sistema existente
   */
  app.post('/api/deepsearch/materials-only', async (req: Request, res: Response) => {
    try {
      console.log('🔍 DeepSearch API: Generando lista de materiales únicamente');

      // Validar entrada
      const validatedData = MaterialsGenerationSchema.parse(req.body);
      
      // Generar lista compatible de materiales
      const materialsList = await deepSearchService.generateCompatibleMaterialsList(
        validatedData.projectDescription,
        validatedData.location
      );

      console.log('✅ DeepSearch API: Lista de materiales generada', {
        materialsCount: materialsList.length
      });

      res.json({
        success: true,
        materials: materialsList,
        metadata: {
          timestamp: new Date().toISOString(),
          model: 'claude-3-7-sonnet-20250219'
        }
      });

    } catch (error: any) {
      console.error('❌ DeepSearch Materials API Error:', error);
      
      res.status(400).json({
        success: false,
        error: error.message,
        code: error.name || 'MATERIALS_GENERATION_ERROR'
      });
    }
  });

  /**
   * GET /api/deepsearch/health
   * Endpoint de salud para verificar el estado del servicio
   */
  app.get('/api/deepsearch/health', async (req: Request, res: Response) => {
    try {
      // Verificar que la API key de Anthropic esté disponible
      const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
      
      if (!hasApiKey) {
        return res.status(503).json({
          status: 'error',
          message: 'API key de Anthropic no configurada',
          available: false
        });
      }

      res.json({
        status: 'healthy',
        message: 'DeepSearch service operativo',
        available: true,
        model: 'claude-3-7-sonnet-20250219',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('DeepSearch Health Check Error:', error);
      res.status(503).json({
        status: 'error',
        message: 'Error en health check',
        available: false
      });
    }
  });

  /**
   * POST /api/deepsearch/estimate-integration
   * Integra resultados de DeepSearch directamente en un estimado existente
   */
  app.post('/api/deepsearch/estimate-integration', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        projectDescription: z.string().min(10),
        location: z.string().optional(),
        estimateId: z.string(),
        replaceExisting: z.boolean().default(false)
      });

      const validatedData = schema.parse(req.body);

      // Generar análisis completo
      const analysisResult = await deepSearchService.analyzeProject(
        validatedData.projectDescription,
        validatedData.location
      );

      // Formatear para integración con el sistema de estimados existente
      const integrationData = {
        materials: analysisResult.materials,
        laborCosts: analysisResult.laborCosts,
        additionalCosts: analysisResult.additionalCosts,
        totals: {
          materials: analysisResult.totalMaterialsCost,
          labor: analysisResult.totalLaborCost,
          additional: analysisResult.totalAdditionalCost,
          grand: analysisResult.grandTotal
        },
        metadata: {
          confidence: analysisResult.confidence,
          recommendations: analysisResult.recommendations,
          warnings: analysisResult.warnings,
          generatedAt: new Date().toISOString()
        }
      };

      console.log('✅ DeepSearch Integration: Datos preparados para estimado', validatedData.estimateId);

      res.json({
        success: true,
        integrationData,
        message: `${analysisResult.materials.length} materiales generados automáticamente`
      });

    } catch (error: any) {
      console.error('❌ DeepSearch Integration Error:', error);
      
      res.status(400).json({
        success: false,
        error: error.message,
        code: 'INTEGRATION_ERROR'
      });
    }
  });
}
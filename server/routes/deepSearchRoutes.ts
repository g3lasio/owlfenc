/**
 * 🔍 DEEPSEARCH ROUTES - PROTEGIDO CON AUTENTICACIÓN Y CONTEO
 * 
 * Sistema robusto de análisis de proyectos con IA:
 * - ✅ Autenticación Firebase requerida en TODOS los endpoints
 * - ✅ Conteo automático de uso con Redis
 * - ✅ Rate limiting por usuario
 * - ✅ Límites por plan respetados
 * 
 * Límites por plan:
 * - Free Trial (ID 4): ILIMITADO (14 días gratis)
 * - Primo Chambeador (ID 5): 3 búsquedas/mes
 * - Mero Patrón (ID 9): 50 búsquedas/mes
 * - Master Contractor (ID 6): ILIMITADO
 */

import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { deepSearchService } from '../services/deepSearchService';
import { smartMaterialCacheService } from '../services/smartMaterialCacheService';
import { deepSearchRefinementService } from '../services/deepSearchRefinementService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { requireAuth } from '../middleware/unified-session-auth';
import { requireCredits, deductFeatureCredits } from '../middleware/credit-check';

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
   * 🔒 PROTEGIDO: Chat interactivo para refinamiento de DeepSearch
   * 
   * Seguridad:
   * - Autenticación Firebase requerida
   * - Conteo automático de uso
   * - Rate limiting: 200 requests/hora
   */
  app.post('/api/deepsearch/refine', 
    verifyFirebaseAuth,
    protectDeepSearch(),
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      console.log(`🔍 [DEEPSEARCH-REFINE] User: ${userId} - Nueva solicitud`);
      
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
          userId,
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

        // ✅ CONTEO AUTOMÁTICO DE USO
        if (req.trackUsage) {
          await req.trackUsage();
        }

        console.log('✅ [DEEPSEARCH-REFINE] Refinamiento completado:', {
          userId,
          success: refinementResult.success,
          hasUpdatedResult: !!refinementResult.updatedResult,
          suggestedActionsCount: refinementResult.suggestedActions?.length || 0
        });

        res.json(refinementResult);

      } catch (error: any) {
        console.error(`❌ [DEEPSEARCH-REFINE] User: ${userId} - Error:`, error);
        
        res.status(500).json({
          success: false,
          error: 'Error interno del servidor procesando refinamiento',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
  );

  /**
   * POST /api/deepsearch/materials
   * 🔒 PROTEGIDO: Genera únicamente materiales sin costos de labor
   * 
   * Seguridad:
   * - Autenticación Firebase requerida
   * - Conteo automático de uso
   * - Rate limiting: 200 requests/hora
   */
  app.post('/api/deepsearch/materials',
    requireAuth,
    requireCredits({ featureName: 'deepSearchPartial' }), // 💳 10 créditos — Materials only
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        console.log(`📦 [MATERIALS ONLY] User: ${userId} - Nueva solicitud`);

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

        // 💳 DEDUCIR CRÉDITOS TRAS ÉXITO
        await deductFeatureCredits(req, undefined, 'DeepSearch Materials Only');

        console.log(`✅ [MATERIALS ONLY] User: ${userId} - Completado:`, {
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
        console.error(`❌ [MATERIALS-ONLY] User: ${userId} - Error:`, error);
        
        // Identificar tipo específico de error
        let errorMessage = 'Error interno del servidor';
        let errorCode = 'INTERNAL_ERROR';
        let statusCode = 500;
        
        if (error.message?.includes('API key') || error.message?.includes('api_key') || error.message?.includes('Invalid API Key')) {
          errorMessage = 'Error de configuración de API de IA. Contacte al administrador.';
          errorCode = 'API_KEY_ERROR';
          statusCode = 503;
        } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
          errorMessage = 'La búsqueda tardó demasiado. Intenta con una descripción más corta.';
          errorCode = 'TIMEOUT_ERROR';
          statusCode = 504;
        } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
          errorMessage = 'Se alcanzó el límite de búsquedas. Intenta más tarde.';
          errorCode = 'RATE_LIMIT_ERROR';
          statusCode = 429;
        } else if (error.name === 'ZodError') {
          errorMessage = 'Datos de entrada inválidos. Verifica la descripción del proyecto.';
          errorCode = 'VALIDATION_ERROR';
          statusCode = 400;
        }
        
        res.status(statusCode).json({
          success: false,
          error: errorMessage,
          code: errorCode,
          searchType: 'materials_only',
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
        });
      }
    }
  );

  /**
   * POST /api/deepsearch/analyze
   * 🔒 PROTEGIDO: Análisis completo de proyecto (materiales + labor + costos)
   * 
   * Seguridad:
   * - Autenticación Firebase requerida
   * - Conteo automático de uso
   * - Rate limiting: 200 requests/hora
   */
  app.post('/api/deepsearch/analyze',
    requireAuth,
    requireCredits({ featureName: 'deepSearchFull' }), // 💳 20 créditos — Full Costs (Materials + Labor)
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        console.log(`🔍 [DEEPSEARCH-ANALYZE] User: ${userId} - Nueva solicitud`);

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

        // 💳 DEDUCIR CRÉDITOS TRAS ÉXITO
        await deductFeatureCredits(req, undefined, 'DeepSearch Full Costs Analysis');

        console.log(`✅ [DEEPSEARCH-ANALYZE] User: ${userId} - Completado:`, {
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
        console.error(`❌ [DEEPSEARCH-ANALYZE] User: ${userId} - Error:`, error);
        
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.name || 'DEEPSEARCH_ERROR',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }
  );

  /**
   * POST /api/deepsearch/materials-only
   * 🔒 PROTEGIDO: Genera lista de materiales compatible con sistema existente
   * 
   * Seguridad:
   * - Autenticación Firebase requerida
   * - Conteo automático de uso
   * - Rate limiting: 200 requests/hora
   */
  app.post('/api/deepsearch/materials-only',
    verifyFirebaseAuth,
    protectDeepSearch(),
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        console.log(`🔍 [MATERIALS-ONLY] User: ${userId} - Generando lista de materiales`);

        // Validar entrada
        const validatedData = MaterialsGenerationSchema.parse(req.body);
        
        // Generar lista compatible de materiales
        const materialsList = await deepSearchService.generateCompatibleMaterialsList(
          validatedData.projectDescription,
          validatedData.location
        );

        // ✅ CONTEO AUTOMÁTICO DE USO
        if (req.trackUsage) {
          await req.trackUsage();
        }

        console.log(`✅ [MATERIALS-ONLY] User: ${userId} - Completado:`, {
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
        console.error(`❌ [MATERIALS-ONLY] User: ${userId} - Error:`, error);
        
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.name || 'MATERIALS_GENERATION_ERROR'
        });
      }
    }
  );

  /**
   * GET /api/deepsearch/health
   * ⚠️ SIN PROTECCIÓN: Endpoint público de health check
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
   * 🔒 PROTEGIDO: Integra resultados directamente en estimado existente
   * 
   * Seguridad:
   * - Autenticación Firebase requerida
   * - Conteo automático de uso
   * - Rate limiting: 200 requests/hora
   */
  app.post('/api/deepsearch/estimate-integration',
    verifyFirebaseAuth,
    protectDeepSearch(),
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        const schema = z.object({
          projectDescription: z.string().min(10),
          location: z.string().optional(),
          estimateId: z.string(),
          replaceExisting: z.boolean().default(false)
        });

        const validatedData = schema.parse(req.body);

        console.log(`🔍 [ESTIMATE-INTEGRATION] User: ${userId} - Estimate: ${validatedData.estimateId}`);

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

        // ✅ CONTEO AUTOMÁTICO DE USO
        if (req.trackUsage) {
          await req.trackUsage();
        }

        console.log(`✅ [ESTIMATE-INTEGRATION] User: ${userId} - Completado`);

        res.json({
          success: true,
          integrationData,
          message: `${analysisResult.materials.length} materiales generados automáticamente`
        });

      } catch (error: any) {
        console.error(`❌ [ESTIMATE-INTEGRATION] User: ${userId} - Error:`, error);
        
        res.status(400).json({
          success: false,
          error: error.message,
          code: 'INTEGRATION_ERROR'
        });
      }
    }
  );
}

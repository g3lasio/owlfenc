/**
 * 🔧 LABOR DEEPSEARCH ROUTES - PROTEGIDO CON AUTENTICACIÓN Y CONTEO
 * 
 * Sistema robusto de análisis de labor con IA:
 * - ✅ Autenticación Firebase requerida en TODOS los endpoints
 * - ✅ Conteo automático de uso con Redis (comparte límite con DeepSearch)
 * - ✅ Rate limiting por usuario
 * - ✅ Límites por plan respetados
 * 
 * Límites por plan (compartidos con DeepSearch):
 * - Free Trial (ID 4): ILIMITADO (14 días gratis)
 * - Primo Chambeador (ID 5): 3 búsquedas/mes
 * - Mero Patrón (ID 9): 50 búsquedas/mes
 * - Master Contractor (ID 6): ILIMITADO
 */

import { Request, Response, Express } from 'express';
import { z } from 'zod';
import { laborDeepSearchService } from '../services/laborDeepSearchService';
import { deepSearchService } from '../services/deepSearchService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { protectDeepSearch } from '../middleware/subscription-protection';

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
   * 🔒 PROTEGIDO: Genera únicamente costos de labor sin materiales
   */
  app.post('/api/labor-deepsearch/labor-only',
    verifyFirebaseAuth,
    protectDeepSearch(),
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        console.log(`🔧 [LABOR ONLY] User: ${userId} - Nueva solicitud`);

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
          projectType: 'Labor Analysis',
          projectScope: `Labor cost analysis for: ${validatedData.projectDescription.substring(0, 100)}...`,
          materials: [], // LABOR ONLY: Sin materiales
          laborCosts: laborResult.laborItems || [],
          additionalCosts: [],
          totalMaterialsCost: 0, // LABOR ONLY: $0 en materiales
          totalLaborCost: laborResult.totalLaborCost || 0,
          totalAdditionalCost: 0,
          grandTotal: laborResult.totalLaborCost || 0,
          confidence: 0.85,
          recommendations: ['Análisis enfocado únicamente en costos de labor'],
          warnings: laborResult.laborItems?.length === 0 ? ['No se encontraron tareas de labor específicas'] : []
        };

        // ✅ CONTEO AUTOMÁTICO DE USO
        if (req.trackUsage) {
          await req.trackUsage();
        }

        console.log(`✅ [LABOR ONLY] User: ${userId} - Completado:`, {
          laborItemsCount: laborResult.laborItems?.length || 0,
          totalCost: laborResult.totalLaborCost || 0
        });

        res.json({
          success: true,
          data: laborOnlyResult,
          timestamp: new Date().toISOString(),
          searchType: 'labor_only'
        });

      } catch (error: any) {
        console.error(`❌ [LABOR ONLY] User: ${userId} - Error:`, error);
        res.status(500).json({
          success: false,
          error: error.message || 'Error interno del servidor',
          searchType: 'labor_only'
        });
      }
    }
  );

  /**
   * POST /api/labor-deepsearch/analyze
   * 🔒 PROTEGIDO: Analiza labor requirements únicamente
   */
  app.post('/api/labor-deepsearch/analyze',
    verifyFirebaseAuth,
    protectDeepSearch(),
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        console.log(`🔧 [LABOR-ANALYZE] User: ${userId} - Nueva solicitud`);

        // Validar entrada
        const validatedData = LaborAnalysisSchema.parse(req.body);
        
        // Procesar con el servicio Labor DeepSearch
        const laborResult = await laborDeepSearchService.analyzeLaborRequirements(
          validatedData.projectDescription,
          validatedData.location,
          validatedData.projectType
        );

        // ✅ CONTEO AUTOMÁTICO DE USO
        if (req.trackUsage) {
          await req.trackUsage();
        }

        console.log(`✅ [LABOR-ANALYZE] User: ${userId} - Completado:`, {
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
        console.error(`❌ [LABOR-ANALYZE] User: ${userId} - Error:`, error);
        
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.name || 'LABOR_ANALYSIS_ERROR'
        });
      }
    }
  );

  /**
   * POST /api/labor-deepsearch/generate-items
   * 🔒 PROTEGIDO: Genera lista de items de labor compatible con estimados
   */
  app.post('/api/labor-deepsearch/generate-items',
    verifyFirebaseAuth,
    protectDeepSearch(),
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        console.log(`🔧 [LABOR-ITEMS] User: ${userId} - Generando items de labor`);

        // Validar entrada
        const validatedData = LaborAnalysisSchema.parse(req.body);
        
        // Generar lista compatible de labor
        const laborItems = await laborDeepSearchService.generateCompatibleLaborList(
          validatedData.projectDescription,
          validatedData.location,
          validatedData.projectType
        );

        // ✅ CONTEO AUTOMÁTICO DE USO
        if (req.trackUsage) {
          await req.trackUsage();
        }

        console.log(`✅ [LABOR-ITEMS] User: ${userId} - Completado:`, {
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
        console.error(`❌ [LABOR-ITEMS] User: ${userId} - Error:`, error);
        
        res.status(400).json({
          success: false,
          error: error.message,
          code: error.name || 'LABOR_ITEMS_GENERATION_ERROR'
        });
      }
    }
  );

  /**
   * POST /api/labor-deepsearch/combined
   * 🔒 PROTEGIDO: Análisis COMPLETO usando AMBOS DeepSearch especializados
   * 
   * Este es el endpoint principal de FULL COSTS:
   * - Materials: deepSearchService (materiales inteligentes con multiplicadores geográficos)
   * - Labor: laborDeepSearchService (análisis de labor especializado)
   */
  app.post('/api/labor-deepsearch/combined',
    verifyFirebaseAuth,
    protectDeepSearch(),
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;
      
      try {
        console.log(`🔍 [FULL COSTS] User: ${userId} - Nueva solicitud combinada (DUAL DEEPSEARCH)`);

        const validatedData = CombinedAnalysisSchema.parse(req.body);
        
        console.log(`🔍 [FULL COSTS] Ejecutando AMBOS DeepSearch en paralelo...`);
        
        const [materialsResult, laborResult] = await Promise.all([
          deepSearchService.analyzeProject(
            validatedData.projectDescription,
            validatedData.location
          ),
          laborDeepSearchService.analyzeLaborRequirements(
            validatedData.projectDescription,
            validatedData.location,
            validatedData.projectType
          )
        ]);

        console.log(`✅ [FULL COSTS] Materials: ${materialsResult.materials.length} items, Labor: ${laborResult.laborItems.length} items`);

        const laborCosts = laborResult.laborItems.map(item => ({
          category: item.category,
          description: item.description,
          hours: item.quantity,
          rate: item.unitPrice,
          total: item.totalCost
        }));

        const totalMaterialsCost = materialsResult.materials.reduce((sum, m) => sum + (m.totalPrice || 0), 0);
        const totalLaborCost = laborResult.totalLaborCost || laborCosts.reduce((sum, l) => sum + l.total, 0);
        const grandTotal = totalMaterialsCost + totalLaborCost;

        const fullCostsResult = {
          projectType: materialsResult.projectType,
          projectScope: materialsResult.projectScope,
          materials: materialsResult.materials,
          laborCosts: laborCosts,
          additionalCosts: materialsResult.additionalCosts || [],
          totalMaterialsCost,
          totalLaborCost,
          totalAdditionalCost: materialsResult.totalAdditionalCost || 0,
          grandTotal,
          confidence: Math.min(materialsResult.confidence, 0.85),
          recommendations: [
            ...materialsResult.recommendations,
            `Labor: ${laborResult.laborItems.length} servicios detectados`,
            `Duración estimada: ${laborResult.estimatedDuration}`,
            `Crew size: ${laborResult.crewSize} trabajadores`
          ],
          warnings: [
            ...materialsResult.warnings,
            ...(laborResult.safetyConsiderations || []).map(s => `⚠️ ${s}`)
          ]
        };

        if (req.trackUsage) {
          await req.trackUsage();
        }

        console.log(`✅ [FULL COSTS] User: ${userId} - Completado:`, {
          materialsCount: materialsResult.materials.length,
          laborCount: laborCosts.length,
          grandTotal
        });

        res.json({
          success: true,
          data: fullCostsResult,
          timestamp: new Date().toISOString(),
          searchType: 'dual_deepsearch'
        });

      } catch (error: any) {
        console.error(`❌ [FULL COSTS] User: ${userId} - Error:`, error);
        
        res.status(500).json({
          success: false,
          error: error.message || 'Combined DeepSearch analysis failed',
          code: 'DUAL_DEEPSEARCH_ERROR'
        });
      }
    }
  );

  /**
   * GET /api/labor-deepsearch/health
   * ⚠️ SIN PROTECCIÓN: Endpoint público de health check
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

  console.log('🔧 Labor DeepSearch API Routes registradas correctamente con protección completa');
}

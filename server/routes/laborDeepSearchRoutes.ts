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
import { universalIntelligenceEngine } from '../services/universalIntelligenceEngine';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { requireAuth } from '../middleware/unified-session-auth';
import { requireCredits, deductFeatureCredits } from '../middleware/credit-check';

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
  estimateId: z.string().optional(),
  // Pricing / Tax / Margin fields (all from user's EstimateSettings)
  // profitMarginPercent: contractor desired profit margin (e.g., 20 = 20%)
  // targetPrice: specific agreed price with the client (overrides profitMarginPercent)
  // taxRate: sales tax rate (e.g., 8.5 = 8.5%) — NATIONWIDE, no CA default
  // taxOnMaterialsOnly: true = tax only on materials (most US states), false = tax on all
  // overheadPercent: overhead to add on top of direct costs (e.g., 15 = 15%)
  // markupPercent: markup to add on top of costs + overhead (e.g., 20 = 20%)
  profitMarginPercent: z.number().min(0).max(500).optional(),
  targetPrice: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(30).optional(),
  taxOnMaterialsOnly: z.boolean().optional().default(true),
  overheadPercent: z.number().min(0).max(200).optional(),
  markupPercent: z.number().min(0).max(500).optional()
});

export function registerLaborDeepSearchRoutes(app: Express): void {
  
  /**
   * POST /api/labor-deepsearch/labor-only
   * 🔒 PROTEGIDO: Genera únicamente costos de labor sin materiales
   */
  app.post('/api/labor-deepsearch/labor-only',
    verifyFirebaseAuth,
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
    requireAuth,
    requireCredits({ featureName: 'deepSearchPartial' }), // 💳 10 créditos — Labor Costs only
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

        // 💳 DEDUCIR CRÉDITOS TRAS ÉXITO
        await deductFeatureCredits(req, undefined, 'DeepSearch Labor Costs Only');

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
        
        // Identificar tipo específico de error
        let errorMessage = error.message || 'Error generando items de labor';
        let errorCode = 'LABOR_ITEMS_GENERATION_ERROR';
        let statusCode = 500;
        
        if (error.message?.includes('API key') || error.message?.includes('api_key') || error.message?.includes('Invalid API Key')) {
          errorMessage = 'Error de configuración de API de IA. Contacte al administrador.';
          errorCode = 'API_KEY_ERROR';
          statusCode = 503;
        } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
          errorMessage = 'La búsqueda tardó demasiado. Intenta con una descripción más corta.';
          errorCode = 'TIMEOUT_ERROR';
          statusCode = 504;
        } else if (error.name === 'ZodError') {
          errorMessage = 'Datos de entrada inválidos. Verifica la descripción del proyecto.';
          errorCode = 'VALIDATION_ERROR';
          statusCode = 400;
        }
        
        res.status(statusCode).json({
          success: false,
          error: errorMessage,
          code: errorCode,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
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
    requireAuth,
    requireCredits({ featureName: 'deepSearchFull' }), // 💳 20 créditos — Full Costs (Materials + Labor)
    async (req: Request, res: Response) => {
      const userId = req.firebaseUser?.uid;

      // ═══════════════════════════════════════════════════════════════════════
      // UNIVERSAL INTELLIGENCE ENGINE — Primary path
      // Uses Claude Opus (highest reasoning) for any industry / project type.
      // No hardcoded material lists. No rigid validation rules.
      // Falls back to legacy dual-deepsearch only if UIE throws.
      // ═══════════════════════════════════════════════════════════════════════
      try {
        console.log(`🧠 [UIE FULL COSTS] User: ${userId} - Universal Intelligence Engine starting`);

        const validatedData = CombinedAnalysisSchema.parse(req.body);

        const uieResult = await universalIntelligenceEngine.estimate(
          validatedData.projectDescription,
          validatedData.location || '',
          'full',
          {
            profitMarginPercent: validatedData.profitMarginPercent ?? 0,
            targetPrice: validatedData.targetPrice ?? 0,
            taxRate: validatedData.taxRate ?? 0,
            taxOnMaterialsOnly: validatedData.taxOnMaterialsOnly ?? true,
            overheadPercent: validatedData.overheadPercent ?? 0,
            markupPercent: validatedData.markupPercent ?? 0,
          }
        );

        const legacyResult = universalIntelligenceEngine.toLegacyFormat(uieResult);

        // 💳 DEDUCIR CRÉDITOS TRAS ÉXITO
        await deductFeatureCredits(req, undefined, 'DeepSearch Full Costs (UIE — Universal Intelligence Engine)');

        console.log(`✅ [UIE FULL COSTS] User: ${userId} - Completed`, {
          projectType: uieResult.projectType,
          industry: uieResult.industryCategory,
          materials: uieResult.materials.length,
          labor: uieResult.laborCosts.length,
          grandTotal: uieResult.grandTotal,
          model: uieResult.aiModel,
        });

        return res.json({
          success: true,
          data: legacyResult,
          timestamp: new Date().toISOString(),
          searchType: 'universal_intelligence_engine',
          engine: 'UIE-v1',
          model: uieResult.aiModel,
        });

      } catch (uieError: any) {
        console.error(`❌ [UIE FULL COSTS] User: ${userId} - UIE failed, falling back to legacy dual-deepsearch:`, uieError.message);
      }

      // ═══════════════════════════════════════════════════════════════════════
      // LEGACY FALLBACK — Only runs if UIE throws an unrecoverable error
      // ═══════════════════════════════════════════════════════════════════════
      try {
        const validatedData = CombinedAnalysisSchema.parse(req.body);

        console.log(`🔍 [FULL COSTS LEGACY] User: ${userId} - Running legacy dual DeepSearch`);

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

        const laborCosts = laborResult.laborItems.map(item => ({
          id: item.id,
          name: item.name,
          category: item.category,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          hours: item.quantity,
          rate: item.unitPrice,
          total: item.totalCost,
          totalCost: item.totalCost,
        }));

        const totalMaterialsCost = materialsResult.materials.reduce((sum: number, m: any) => sum + (m.totalPrice || 0), 0);
        const totalLaborCost = laborResult.totalLaborCost || laborCosts.reduce((sum: number, l: any) => sum + l.total, 0);
        const baseSubtotal = totalMaterialsCost + totalLaborCost;

        const taxRateDecimal = (validatedData.taxRate !== undefined ? validatedData.taxRate : 0) / 100;
        const taxOnMaterialsOnly = validatedData.taxOnMaterialsOnly !== false;
        const taxableBase = taxOnMaterialsOnly ? totalMaterialsCost : baseSubtotal;
        const taxAmount = taxableBase * taxRateDecimal;

        const overheadPercent = validatedData.overheadPercent ?? 0;
        const markupPercent = validatedData.markupPercent ?? 0;
        const overheadAmount = baseSubtotal * (overheadPercent / 100);
        const markupBase = baseSubtotal + overheadAmount;
        const markupAmount = markupBase * (markupPercent / 100);
        const adjustedSubtotal = markupBase + markupAmount;
        const baseTotalWithTax = adjustedSubtotal + taxAmount;

        let grandTotal = baseTotalWithTax;
        let profitMarginData: any = null;

        if (validatedData.targetPrice && validatedData.targetPrice > 0) {
          const profitAmount = validatedData.targetPrice - baseTotalWithTax;
          const profitPercent = baseTotalWithTax > 0 ? (profitAmount / baseTotalWithTax) * 100 : 0;
          profitMarginData = { mode: 'flat_rate', targetPrice: validatedData.targetPrice, baseCost: baseTotalWithTax, profitAmount, profitPercent, scalingFactor: baseTotalWithTax > 0 ? validatedData.targetPrice / baseTotalWithTax : 1 };
          grandTotal = validatedData.targetPrice;
        } else if (validatedData.profitMarginPercent && validatedData.profitMarginPercent > 0) {
          const profitAmount = baseTotalWithTax * (validatedData.profitMarginPercent / 100);
          profitMarginData = { mode: 'margin', profitPercent: validatedData.profitMarginPercent, profitAmount, baseCost: baseTotalWithTax, priceToClient: baseTotalWithTax + profitAmount, scalingFactor: 1 + (validatedData.profitMarginPercent / 100) };
          grandTotal = baseTotalWithTax + profitAmount;
        }

        const contractorView = {
          baseMaterialsCost: Math.round(totalMaterialsCost * 100) / 100,
          baseLaborCost: Math.round(totalLaborCost * 100) / 100,
          baseSubtotal: Math.round(baseSubtotal * 100) / 100,
          overheadPercent, overheadAmount: Math.round(overheadAmount * 100) / 100,
          markupPercent, markupAmount: Math.round(markupAmount * 100) / 100,
          adjustedSubtotal: Math.round(adjustedSubtotal * 100) / 100,
          taxOnMaterials: Math.round(taxAmount * 100) / 100,
          taxRate: (taxRateDecimal * 100).toFixed(2) + '%',
          taxAppliedTo: taxOnMaterialsOnly ? 'materials_only' : 'full_subtotal',
          baseTotalWithTax: Math.round(baseTotalWithTax * 100) / 100,
          profitAmount: profitMarginData ? Math.round(profitMarginData.profitAmount * 100) / 100 : 0,
          profitPercent: profitMarginData ? profitMarginData.profitPercent : 0,
          finalPriceToClient: Math.round(grandTotal * 100) / 100,
        };

        const fullCostsResult = {
          projectType: materialsResult.projectType,
          projectScope: materialsResult.projectScope,
          materials: materialsResult.materials,
          laborCosts,
          additionalCosts: materialsResult.additionalCosts || [],
          totalMaterialsCost: Math.round(totalMaterialsCost * 100) / 100,
          totalLaborCost: Math.round(totalLaborCost * 100) / 100,
          totalAdditionalCost: materialsResult.totalAdditionalCost || 0,
          taxAmount: Math.round(taxAmount * 100) / 100,
          taxRate: taxRateDecimal,
          taxAppliedTo: 'materials_only',
          baseSubtotal: Math.round(baseSubtotal * 100) / 100,
          baseTotalWithTax: Math.round(baseTotalWithTax * 100) / 100,
          grandTotal: Math.round(grandTotal * 100) / 100,
          profitMargin: profitMarginData,
          contractorView,
          confidence: Math.min(materialsResult.confidence, 0.85),
          recommendations: [...materialsResult.recommendations, `Labor: ${laborResult.laborItems.length} servicios detectados`],
          warnings: [...materialsResult.warnings, ...(laborResult.safetyConsiderations || []).map((s: string) => `⚠️ ${s}`)]
        };

        await deductFeatureCredits(req, undefined, 'DeepSearch Full Costs (Legacy Fallback)');

        return res.json({
          success: true,
          data: fullCostsResult,
          timestamp: new Date().toISOString(),
          searchType: 'dual_deepsearch_legacy'
        });

      } catch (error: any) {
        console.error(`❌ [FULL COSTS] User: ${userId} - All engines failed:`, error);

        let errorMessage = 'Error en análisis combinado de materiales y labor';
        let errorCode = 'DUAL_DEEPSEARCH_ERROR';
        let statusCode = 500;

        if (error.message?.includes('API key') || error.message?.includes('api_key')) {
          errorMessage = 'Error de configuración de API de IA. Contacte al administrador.';
          errorCode = 'API_KEY_ERROR'; statusCode = 503;
        } else if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
          errorMessage = 'La búsqueda tardó demasiado. Intenta con una descripción más corta.';
          errorCode = 'TIMEOUT_ERROR'; statusCode = 504;
        } else if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
          errorMessage = 'Se alcanzó el límite de búsquedas. Intenta más tarde.';
          errorCode = 'RATE_LIMIT_ERROR'; statusCode = 429;
        } else if (error.name === 'ZodError') {
          errorMessage = 'Datos de entrada inválidos. Verifica la descripción del proyecto.';
          errorCode = 'VALIDATION_ERROR'; statusCode = 400;
        }

        return res.status(statusCode).json({
          success: false,
          error: errorMessage,
          code: errorCode,
          searchType: 'dual_deepsearch',
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { details: error.message })
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

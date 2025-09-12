/**
 * Labor DeepSearch API Routes
 * 
 * Endpoints para el análisis inteligente de labor y servicios usando IA.
 * Funciona independientemente del DeepSearch de materiales.
 */

import { Request, Response, Express } from 'express';
import { z } from 'zod';
import { laborDeepSearchService } from '../services/laborDeepSearchService';
import { aduConstructionExpertService } from '../services/aduConstructionExpertService';
import { realityValidationService } from '../services/realityValidationService';
// Removed authentication - DeepSearch now open to all users

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

      console.log('✅ LABOR ONLY: Análisis completado', {
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

      // DeepSearch now available to all users - no authentication required

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

      // 🎯 PLAN-BASED ACCESS: Verificar plan del usuario
      const firebaseUid = req.authUser?.uid;
      let userId = null;
      
      if (firebaseUid) {
        // No authentication required - DeepSearch available to all users
        console.log(`🔐 [SECURITY] Labor items generation for user_id: ${userId}`);
      } else {
        // Usuario no autenticado - mostrar mensaje de upgrade
        return res.status(403).json({
          success: false,
          error: 'Esta función requiere un plan premium. Upgradea tu cuenta para acceder a DeepSearch.',
          requiresUpgrade: true,
          code: 'PREMIUM_FEATURE_REQUIRED'
        });
      }

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
   * Genera análisis combinado de materiales Y labor con especialización ADU
   */
  app.post('/api/labor-deepsearch/combined', async (req: Request, res: Response) => {
    try {
      console.log('🔧🔨 Combined DeepSearch API: Recibiendo solicitud de análisis combinado', req.body);

      // DeepSearch now available to all users - no authentication required

      // Validar entrada
      const validatedData = CombinedAnalysisSchema.parse(req.body);
      
      // DETECCIÓN ESPECIALIZADA: Verificar si es un proyecto ADU
      const isADUProject = /\b(?:adu|accessory dwelling unit|new construction|new building|dwelling unit|1200\s*sqft|1200\s*square\s*feet)\b/i.test(validatedData.projectDescription);
      
      if (isADUProject) {
        console.log('🏗️ PROYECTO ADU DETECTADO: Activando servicio especializado');
        
        try {
          // Usar el servicio especializado ADU
          const aduResult = await aduConstructionExpertService.generateADUEstimate(
            validatedData.projectDescription,
            validatedData.location || 'California'
          );

          // Convertir resultado ADU al formato DeepSearch esperado
          const materials = aduResult.materialCategories.flatMap(category => 
            category.materials.map(material => ({
              id: material.id,
              name: material.name,
              description: material.description,
              category: material.category,
              quantity: material.quantity,
              unit: material.unit,
              unitPrice: material.unitPrice,
              totalPrice: material.totalPrice,
              supplier: material.supplier,
              specifications: material.specifications
            }))
          );

          const laborCosts = aduResult.laborTasks.map(task => ({
            category: task.phase,
            description: `${task.task}: ${task.description}`,
            hours: parseInt(task.duration.split('-')[0]) * 8, // Estimación de horas
            rate: Math.round(task.laborCost / (parseInt(task.duration.split('-')[0]) * 8)),
            total: task.laborCost
          }));

          const fullCostsResult = {
            projectType: `ADU Construction - ${aduResult.specifications.squareFeet} sqft`,
            projectScope: `New ${aduResult.specifications.squareFeet} sqft ADU with ${aduResult.specifications.bedrooms} bed, ${aduResult.specifications.bathrooms} bath`,
            materials,
            laborCosts,
            additionalCosts: [
              {
                category: 'permits',
                description: 'ADU construction permits and inspections',
                cost: aduResult.costs.permits,
                required: true
              }
            ],
            totalMaterialsCost: aduResult.costs.materials,
            totalLaborCost: aduResult.costs.labor,
            totalAdditionalCost: aduResult.costs.permits,
            grandTotal: aduResult.costs.total,
            confidence: 0.95, // Alta confianza con servicio especializado
            recommendations: aduResult.recommendations,
            warnings: [`⏱️ Estimated construction time: ${aduResult.timeline.totalDays} days`]
          };

          console.log('✅ ADU SPECIALIZED: Análisis completado', {
            materialsCount: materials.length,
            laborCount: laborCosts.length,
            totalCost: aduResult.costs.total,
            timeline: `${aduResult.timeline.totalDays} days`
          });

          return res.json({
            success: true,
            data: fullCostsResult,
            timestamp: new Date().toISOString(),
            searchType: 'adu_specialized_construction',
            specialization: 'ADU Construction Expert'
          });

        } catch (aduError) {
          console.error('❌ Error en servicio ADU especializado, usando fallback:', aduError);
          // Continuar con el servicio normal si falla el especializado
        }
      }

      // SERVICIO NORMAL: Para proyectos no-ADU o como fallback
      const combinedResult = await laborDeepSearchService.generateCombinedEstimate(
        validatedData.projectDescription,
        validatedData.includeMaterials,
        validatedData.includeLabor,
        validatedData.location,
        validatedData.projectType
      );

      // Formatear respuesta compatible con DeepSearchResult para FULL COSTS
      const fullCostsResult = {
        projectType: 'Combined Analysis',
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

      // 🚨 REALITY VALIDATION: Verificar si el resultado es realista usando General Contractor Intelligence
      try {
        console.log('🔍 [REALITY-CHECK] Starting validation for combined result...');
        
        const clientAddress = validatedData.location || 'Estados Unidos';
        const realityCheck = await realityValidationService.validateDeepSearchResult(
          fullCostsResult,
          validatedData.projectDescription,
          clientAddress
        );

        console.log(`🔍 [REALITY-CHECK] Validation result: ${realityCheck.isValid ? 'PASSED' : 'FAILED'} (confidence: ${realityCheck.confidence})`);
        
        if (!realityCheck.isValid) {
          console.log('🚨 [REALITY-CHECK] Red flags detected:', realityCheck.redFlags);
        }

        // Usar resultado validado si el original falló la validación de realidad
        const finalResult = realityCheck.validatedResult || fullCostsResult;
        
        // Añadir información de validación al resultado
        finalResult.warnings = [
          ...(finalResult.warnings || []),
          ...realityCheck.redFlags.map(flag => `⚠️ ${flag}`)
        ] as string[];
        
        finalResult.recommendations = [
          ...(finalResult.recommendations || []),
          ...realityCheck.recommendations
        ] as string[];
        
        // Ajustar confianza basado en validación
        finalResult.confidence = realityCheck.confidence;

        console.log('✅ [REALITY-CHECK] Final result prepared', {
          originalTotal: fullCostsResult.grandTotal,
          validatedTotal: finalResult.grandTotal,
          wasReplaced: !!realityCheck.validatedResult,
          confidence: finalResult.confidence
        });

        res.json({
          success: true,
          data: finalResult,
          timestamp: new Date().toISOString(),
          searchType: 'full_costs',
          realityValidation: {
            isValid: realityCheck.isValid,
            confidence: realityCheck.confidence,
            redFlagsCount: realityCheck.redFlags.length,
            wasValidated: true
          }
        });

      } catch (validationError) {
        console.warn('⚠️ [REALITY-CHECK] Validation failed, using original result:', validationError);
        
        // Fallback: Usar resultado original con advertencia
        fullCostsResult.warnings = [
          ...(fullCostsResult.warnings || []),
          '⚠️ Reality validation unavailable - results may need manual review'
        ] as string[];
        
        res.json({
          success: true,
          data: fullCostsResult,
          timestamp: new Date().toISOString(),
          searchType: 'full_costs',
          realityValidation: {
            isValid: false,
            confidence: 0.5,
            redFlagsCount: 0,
            wasValidated: false
          }
        });
      }

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
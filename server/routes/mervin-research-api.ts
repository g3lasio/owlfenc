/**
 * MERVIN AI RESEARCH API - FASE 2
 * 
 * Endpoints API para las nuevas funcionalidades de investigación súper rápida 
 * optimizada específicamente para contratistas ocupados.
 * 
 * NUEVAS FUNCIONALIDADES:
 * - Investigación express (< 5 segundos)
 * - Búsquedas paralelas para máxima eficiencia
 * - Estadísticas de rendimiento en tiempo real
 * - Invalidación inteligente de caché
 * - Investigación especializada para estimados
 */

import express from 'express';
import { WebResearchService } from '../ai/unified-chat/WebResearchService';
import { MervinChatOrchestrator } from '../ai/MervinChatOrchestrator';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';

const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const webResearchService = new WebResearchService(anthropic);
const mervinOrchestrator = new MervinChatOrchestrator();

/**
 * INVESTIGACIÓN EXPRESS - SÚPER RÁPIDA (< 5 segundos)
 * Para consultas urgentes de contratistas
 * 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger investigación de IA
 */
router.post('/express-research', verifyFirebaseAuth, async (req, res) => {
  console.log('⚡ [RESEARCH-API] Solicitud de investigación express recibida');
  
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar investigación de IA costosa
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Express research for REAL user_id: ${userId}`);
    
    const { query, topic, location } = req.body;
    
    if (!query || !topic) {
      return res.status(400).json({
        error: 'Query y topic son requeridos',
        required: ['query', 'topic']
      });
    }
    
    const startTime = Date.now();
    const result = await webResearchService.expressResearch(query, topic, location);
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ [RESEARCH-API] Investigación express completada en ${responseTime}ms`);
    
    res.json({
      success: true,
      data: result,
      performance: {
        responseTime: `${responseTime}ms`,
        method: 'express',
        cached: responseTime < 1000 // Probablemente del caché si es muy rápido
      }
    });
    
  } catch (error) {
    console.error('❌ [RESEARCH-API] Error en investigación express:', error);
    res.status(500).json({
      error: 'Error en investigación express',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * BÚSQUEDAS PARALELAS - MÚLTIPLES CONSULTAS SIMULTÁNEAS
 * Para contratistas que necesitan información sobre varios temas a la vez
 * 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger investigación paralela
 */
router.post('/parallel-research', verifyFirebaseAuth, async (req, res) => {
  console.log('🚀 [RESEARCH-API] Solicitud de investigación paralela recibida');
  
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar investigación paralela costosa
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Parallel research for REAL user_id: ${userId}`);
    
    const { queries } = req.body;
    
    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({
        error: 'Se requiere un array de queries',
        format: 'queries: [{query: string, topic: string, location?: string}]'
      });
    }
    
    const startTime = Date.now();
    const results = await webResearchService.researchMultipleTopics(queries);
    const responseTime = Date.now() - startTime;
    
    // Convertir Map a Object para JSON
    const resultsObject = Object.fromEntries(results);
    
    console.log(`✅ [RESEARCH-API] Investigación paralela completada: ${queries.length} consultas en ${responseTime}ms`);
    
    res.json({
      success: true,
      data: resultsObject,
      performance: {
        totalQueries: queries.length,
        responseTime: `${responseTime}ms`,
        averagePerQuery: `${Math.round(responseTime / queries.length)}ms`,
        method: 'parallel'
      }
    });
    
  } catch (error) {
    console.error('❌ [RESEARCH-API] Error en investigación paralela:', error);
    res.status(500).json({
      error: 'Error en investigación paralela',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * INVESTIGACIÓN PARA ESTIMADOS - ESPECIALIZADA
 * Información específica que contratistas necesitan para crear estimados
 */
router.post('/estimate-research', verifyFirebaseAuth, async (req, res) => {
  console.log('💰 [RESEARCH-API] Solicitud de investigación para estimado recibida');
  
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar investigación de estimados
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Estimate research for REAL user_id: ${userId}`);
    
    const { projectType, materials, location } = req.body;
    
    if (!projectType || !materials || !Array.isArray(materials)) {
      return res.status(400).json({
        error: 'Datos de estimado incompletos',
        required: {
          projectType: 'string - Tipo de proyecto',
          materials: 'array - Lista de materiales',
          location: 'string - Ubicación del proyecto'
        }
      });
    }
    
    const startTime = Date.now();
    const result = await mervinOrchestrator.researchForEstimateCreation(
      projectType, 
      materials, 
      location || 'California'
    );
    const responseTime = Date.now() - startTime;
    
    console.log(`✅ [RESEARCH-API] Investigación para estimado completada en ${responseTime}ms`);
    
    res.json({
      success: true,
      data: result,
      performance: {
        responseTime: `${responseTime}ms`,
        relevanceScore: result.relevanceScore,
        method: 'estimate-specialized'
      }
    });
    
  } catch (error) {
    console.error('❌ [RESEARCH-API] Error en investigación para estimado:', error);
    res.status(500).json({
      error: 'Error en investigación para estimado',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * ESTADÍSTICAS DE RENDIMIENTO - DASHBOARD PARA CONTRATISTAS
 * Muestra qué tan eficiente está siendo el sistema
 */
router.get('/performance-stats', async (req, res) => {
  console.log('📊 [RESEARCH-API] Solicitud de estadísticas de rendimiento');
  
  try {
    const stats = await mervinOrchestrator.getSystemPerformanceStats();
    
    res.json({
      success: true,
      stats: stats,
      summary: {
        efficiency: stats.cacheStats.efficiency || 'Excelente',
        timesSaved: stats.timesSaved,
        hitRate: `${stats.cacheStats.hitRate || 0}%`,
        status: 'Sistema optimizado para máxima velocidad'
      }
    });
    
  } catch (error) {
    console.error('❌ [RESEARCH-API] Error obteniendo estadísticas:', error);
    res.status(500).json({
      error: 'Error obteniendo estadísticas',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * INVALIDACIÓN INTELIGENTE - LIMPIAR DATOS DESACTUALIZADOS
 * Permite a los contratistas actualizar información cuando hay cambios de mercado
 */
router.post('/invalidate-cache', verifyFirebaseAuth, async (req, res) => {
  console.log('🔄 [RESEARCH-API] Solicitud de invalidación de caché');
  
  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden invalidar caché
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Cache invalidation for REAL user_id: ${userId}`);
    
    const { changeType } = req.body;
    
    const validTypes = ['prices', 'regulations', 'materials', 'all'];
    if (!changeType || !validTypes.includes(changeType)) {
      return res.status(400).json({
        error: 'Tipo de cambio inválido',
        validTypes: validTypes,
        description: {
          prices: 'Invalidar información de precios',
          regulations: 'Invalidar regulaciones y códigos',
          materials: 'Invalidar disponibilidad de materiales',
          all: 'Invalidar todo el caché (usar con precaución)'
        }
      });
    }
    
    await mervinOrchestrator.invalidateOutdatedData(changeType);
    
    res.json({
      success: true,
      message: `Caché invalidado para: ${changeType}`,
      action: 'Las próximas consultas obtendrán información actualizada',
      changeType: changeType
    });
    
  } catch (error) {
    console.error('❌ [RESEARCH-API] Error invalidando caché:', error);
    res.status(500).json({
      error: 'Error invalidando caché',
      message: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * HEALTH CHECK - VERIFICAR ESTADO DEL SISTEMA DE INVESTIGACIÓN
 */
router.get('/health', async (req, res) => {
  try {
    const stats = await webResearchService.getPerformanceStats();
    
    res.json({
      status: 'healthy',
      system: 'Mervin AI Research - Fase 2',
      optimizations: [
        '✅ Caché inteligente activado',
        '✅ Investigación express disponible', 
        '✅ Búsquedas paralelas habilitadas',
        '✅ Filtros de relevancia para contratistas',
        '✅ Timeouts optimizados para velocidad'
      ],
      performance: {
        cacheHitRate: `${stats.cacheStats.hitRate || 0}%`,
        averageResponseTime: `${stats.averageResearchTime || 0}ms`,
        timesSaved: stats.timesSaved
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      status: 'degraded',
      error: error instanceof Error ? error.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
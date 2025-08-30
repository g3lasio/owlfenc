/**
 * API ENDPOINTS PARA OPENROUTER - VERIFICACIÓN Y DIAGNÓSTICOS
 * 
 * Endpoints para verificar el estado de OpenRouter y ayudar al usuario
 * con la configuración y troubleshooting
 */

import { Router } from 'express';
import { OpenRouterValidator } from '../ai/utils/OpenRouterValidator.js';
import { OpenRouterClient } from '../ai/OpenRouterClient.js';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';

const router = Router();

/**
 * GET /api/openrouter/health
 * Verificación completa de salud de OpenRouter
 */
router.get('/health', async (req, res) => {
  try {
    console.log('🔍 [OPENROUTER-API] Verificando salud de OpenRouter...');
    
    const healthCheck = await OpenRouterValidator.checkHealth();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      openrouter: healthCheck,
      message: healthCheck.isAvailable && healthCheck.keyValid 
        ? '✅ OpenRouter está funcionando correctamente'
        : '⚠️ OpenRouter no está disponible - revisa configuración'
    });
    
  } catch (error: any) {
    console.error('❌ [OPENROUTER-API] Error en health check:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Error verificando OpenRouter'
    });
  }
});

/**
 * GET /api/openrouter/diagnostic
 * Reporte completo de diagnóstico para troubleshooting
 */
router.get('/diagnostic', async (req, res) => {
  try {
    console.log('📋 [OPENROUTER-API] Generando reporte de diagnóstico...');
    
    const report = await OpenRouterValidator.generateDiagnosticReport();
    const setupInstructions = OpenRouterValidator.getSetupInstructions();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      report,
      setupInstructions,
      message: '📋 Reporte de diagnóstico generado'
    });
    
  } catch (error: any) {
    console.error('❌ [OPENROUTER-API] Error generando diagnóstico:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Error generando diagnóstico'
    });
  }
});

/**
 * POST /api/openrouter/test
 * Test básico de conversación con OpenRouter
 * 🔐 SECURITY FIX: Agregado verifyFirebaseAuth para proteger test de IA
 */
router.post('/test', verifyFirebaseAuth, async (req, res) => {
  try {
    const { message = 'Hola, soy un test de OpenRouter' } = req.body;
    
    // 🔐 SECURITY FIX: Solo usuarios autenticados pueden hacer tests de IA
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Testing OpenRouter for REAL user_id: ${userId}`);
    
    console.log('🧪 [OPENROUTER-API] Ejecutando test de conversación...');
    
    // Verificar que OpenRouter esté disponible
    const isHealthy = await OpenRouterValidator.quickCheck();
    if (!isHealthy) {
      return res.status(400).json({
        success: false,
        message: '⚠️ OpenRouter no está disponible. Configura OPENROUTER_API_KEY en Secrets.',
        needsSetup: true
      });
    }
    
    // Crear cliente y hacer test
    const client = new OpenRouterClient({
      apiKey: process.env.OPENROUTER_API_KEY || '',
      enableFailover: true
    });
    
    const response = await client.generateConversationalResponse(
      message,
      [],
      { company: 'Test Company', location: 'California' }
    );
    
    if (response.success) {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        model: response.model,
        response: response.content,
        usage: response.usage,
        message: `✅ Test exitoso con modelo: ${response.model}`
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.error,
        message: '❌ Test falló - revisa configuración'
      });
    }
    
  } catch (error: any) {
    console.error('❌ [OPENROUTER-API] Error en test:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Error ejecutando test'
    });
  }
});

/**
 * GET /api/openrouter/models
 * Lista de modelos disponibles en OpenRouter
 */
router.get('/models', async (req, res) => {
  try {
    console.log('📋 [OPENROUTER-API] Obteniendo lista de modelos...');
    
    const isHealthy = await OpenRouterValidator.quickCheck();
    if (!isHealthy) {
      return res.status(400).json({
        success: false,
        message: '⚠️ OpenRouter no está disponible',
        models: []
      });
    }
    
    const client = new OpenRouterClient({
      apiKey: process.env.OPENROUTER_API_KEY || ''
    });
    
    const models = await client.getAvailableModels();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      models,
      count: models.length,
      message: `📋 ${models.length} modelos disponibles`
    });
    
  } catch (error: any) {
    console.error('❌ [OPENROUTER-API] Error obteniendo modelos:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Error obteniendo modelos'
    });
  }
});

/**
 * GET /api/openrouter/status
 * Estado rápido para uso en frontend
 */
router.get('/status', async (req, res) => {
  try {
    const hasApiKey = !!process.env.OPENROUTER_API_KEY;
    const isValidFormat = hasApiKey && (process.env.OPENROUTER_API_KEY || '').startsWith('sk-or-');
    
    let isWorking = false;
    if (hasApiKey && isValidFormat) {
      isWorking = await OpenRouterValidator.quickCheck();
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: {
        hasApiKey,
        isValidFormat,
        isWorking,
        ready: hasApiKey && isValidFormat && isWorking
      },
      message: hasApiKey && isValidFormat && isWorking 
        ? '✅ OpenRouter listo'
        : hasApiKey && isValidFormat 
          ? '⚠️ OpenRouter configurado pero no responde'
          : hasApiKey 
            ? '❌ API key con formato inválido'
            : '❌ OpenRouter no configurado'
    });
    
  } catch (error: any) {
    console.error('❌ [OPENROUTER-API] Error verificando status:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      message: '❌ Error verificando status'
    });
  }
});

console.log('🚀 [OPENROUTER-API] Rutas registradas: /health, /diagnostic, /test, /models, /status');

export default router;
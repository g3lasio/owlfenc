import { Router } from 'express';
import { intelligentImportService } from '../services/intelligentImportService';

const router = Router();

/**
 * POST /api/intelligent-import/csv
 * Procesa un CSV con mapeo inteligente usando IA
 */
router.post('/csv', async (req, res) => {
  try {
    console.log('🤖 [INTELLIGENT-IMPORT-API] Recibida solicitud de importación CSV inteligente');
    
    const { csvContent, userId } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el contenido del CSV'
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el ID del usuario'
      });
    }

    console.log('📊 [INTELLIGENT-IMPORT-API] Procesando CSV con IA...');
    const result = await intelligentImportService.processCSVWithAI(csvContent);
    
    if (!result.success) {
      console.error('❌ [INTELLIGENT-IMPORT-API] Error en procesamiento:', result.error);
      return res.status(400).json(result);
    }

    console.log('✅ [INTELLIGENT-IMPORT-API] Procesamiento exitoso:', {
      clientsProcessed: result.mappedClients.length,
      detectedFormat: result.detectedFormat
    });

    // Agregar userId a cada cliente mapeado
    const clientsWithUserId = result.mappedClients.map(client => ({
      ...client,
      userId,
      source: result.detectedFormat || 'Intelligent CSV Import',
      clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }));

    res.json({
      ...result,
      mappedClients: clientsWithUserId
    });

  } catch (error) {
    console.error('❌ [INTELLIGENT-IMPORT-API] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor durante la importación inteligente'
    });
  }
});

/**
 * GET /api/intelligent-import/test
 * Endpoint de prueba para verificar que el servicio funciona
 */
router.get('/test', async (req, res) => {
  try {
    // CSV de prueba desordenado
    const testCSV = `Cliente,Tel,Correo Electrónico,Ubicación
Juan Pérez,555-1234,juan@test.com,"123 Main St, Los Angeles, CA"
María García,555-5678,maria@test.com,"456 Oak Ave, San Diego, CA"
Robert Smith,555-9012,robert@test.com,"789 Pine St, Sacramento, CA"`;

    console.log('🧪 [INTELLIGENT-IMPORT-TEST] Ejecutando prueba...');
    const result = await intelligentImportService.processCSVWithAI(testCSV);
    
    res.json({
      success: true,
      message: 'Prueba de importación inteligente completada',
      testResult: result
    });

  } catch (error) {
    console.error('❌ [INTELLIGENT-IMPORT-TEST] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error en la prueba de importación inteligente'
    });
  }
});

export default router;
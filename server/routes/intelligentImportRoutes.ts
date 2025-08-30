import { Router } from 'express';
import { intelligentImportService } from '../services/intelligentImportService';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { DatabaseStorage } from '../DatabaseStorage';
import { UserMappingService } from '../services/UserMappingService';

const router = Router();

// Crear instancia del servicio de mapeo de usuarios
const storage = new DatabaseStorage();
const userMappingService = UserMappingService.getInstance(storage);

/**
 * POST /api/intelligent-import/csv
 * Procesa un CSV con mapeo inteligente usando IA
 */
router.post('/csv', verifyFirebaseAuth, async (req, res) => {
  try {
    console.log('🤖 [INTELLIGENT-IMPORT-API] Recibida solicitud de importación CSV inteligente');
    
    // Obtener el usuario autenticado del middleware Firebase
    if (!req.firebaseUser) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    // Mapear Firebase UID a userId de PostgreSQL
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(
      req.firebaseUser.uid,
      req.firebaseUser.email
    );
    const { csvContent } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el contenido del CSV'
      });
    }

    console.log('🔐 [INTELLIGENT-IMPORT-API] Usuario autenticado:', userId);

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
router.get('/test', verifyFirebaseAuth, async (req, res) => {
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

/**
 * GET /api/intelligent-import/test-messy
 * Endpoint de prueba con CSVs mal organizados para verificar la IA
 */
router.get('/test-messy', async (req, res) => {
  try {
    console.log('🧪 [INTELLIGENT-IMPORT-MESSY] Ejecutando pruebas con CSVs mal organizados...');
    
    // CSV mal organizado #1: Columnas mezcladas, headers en español e inglés
    const messyCSV1 = `Nombre Completo,Phone Number,Dir Completa,Email Address,Notas Extra
"García, María Elena",(555) 123-4567,"Calle Falsa 123, Ciudad de México, CDMX 12345",maria.garcia@email.com,"Cliente preferente - no llamar después de 6pm"
"Smith John",555.987.6543,"456 Oak Street Apt 2B Sacramento CA 95814",j.smith@company.org,"Referido por Juan - urgente"
"López Rosa María",+1-555-234-5678,"789 Pine Ave, Los Angeles, California 90210",rosa.lopez@gmail.com,"Habla solo español"
"Johnson, Mike",5551112233,"321 Elm Dr, San Diego, CA",mike@example.com,""`;

    // CSV mal organizado #2: Sin headers claros, datos en posiciones incorrectas
    const messyCSV2 = `Col1,Col2,Col3,Col4,Col5,Col6
Ana Torres,555-444-3333,,ana@test.com,"567 Main St",Notas varias
,Pedro Morales,(619) 555-7890,pedro.morales@email.com,"890 Broadway Los Angeles CA 90012",Cliente VIP
Carlos Vega,,,carlos@company.com,555-333-2222,"123 Center St San Francisco CA"
"Incomplete Record",,555-111-9999,,,"Missing data everywhere"`;

    // CSV mal organizado #3: Datos en orden incorrecto, columnas faltantes
    const messyCSV3 = `email,full_name,notes,contact_info,location_info
luis.martinez@email.com,"Martínez, Luis Eduardo","Cliente desde 2020","Tel: (555) 876-5432","456 Valley Road, Oakland, CA 94601"
jennifer@company.org,"Jennifer Wilson","Contactar solo por email","Phone: 555-654-3210 / Fax: 555-654-3211","789 Hill Street, San Francisco, CA 94102"
,,"Roberto Jiménez","Nuevo cliente","555-456-7890","123 Oak Avenue, San Jose, CA 95110"
admin@business.com,"Business Admin Account","Cuenta empresarial","Multiple contacts","Various locations"`;

    const service = intelligentImportService;
    const results = [];
    
    // Probar cada CSV problemático
    const testCases = [
      { name: 'CSV Mezclado Español-Inglés', csv: messyCSV1 },
      { name: 'CSV Sin Headers Claros', csv: messyCSV2 },
      { name: 'CSV Orden Incorrecto', csv: messyCSV3 }
    ];
    
    for (const testCase of testCases) {
      console.log(`🔍 [INTELLIGENT-IMPORT-MESSY] Probando: ${testCase.name}`);
      const result = await service.processCSVWithAI(testCase.csv);
      results.push({
        testName: testCase.name,
        success: result.success,
        clientsFound: result.mappedClients.length,
        detectedFormat: result.detectedFormat,
        originalHeaders: result.originalHeaders,
        sampleMappedClient: result.mappedClients[0] || null,
        error: result.error || null
      });
    }

    res.json({
      success: true,
      message: 'Pruebas de CSVs mal organizados completadas',
      testResults: results,
      summary: {
        totalTests: results.length,
        successfulTests: results.filter(r => r.success).length,
        totalClientsExtracted: results.reduce((sum, r) => sum + r.clientsFound, 0)
      }
    });

  } catch (error) {
    console.error('❌ [INTELLIGENT-IMPORT-MESSY] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
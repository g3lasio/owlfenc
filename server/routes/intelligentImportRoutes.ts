import { Router } from 'express';
import { intelligentImportService } from '../services/intelligentImportService';
import { intelligentImportPipeline, type ImportJobResult } from '../services/intelligentImportPipeline';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { DatabaseStorage } from '../DatabaseStorage';
import { userMappingService } from '../services/userMappingService';
import { getFirebaseManager } from '../storage-firebase-only';
import { NormalizationToolkit } from '../services/autoCleanService';

const router = Router();

// Crear instancia del servicio de mapeo de usuarios
const storage = new DatabaseStorage();
// Using singleton userMappingService from import

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

    // Aplicar limpieza automática de datos a cada cliente
    console.log('🧹 [INTELLIGENT-IMPORT-API] Aplicando limpieza automática de datos...');
    const cleanedClients = result.mappedClients.map(client => {
      const cleaned = { ...client };
      
      // Normalizar teléfono
      if (cleaned.phone) {
        cleaned.phone = NormalizationToolkit.normalizePhone(cleaned.phone);
      }
      if (cleaned.mobilePhone) {
        cleaned.mobilePhone = NormalizationToolkit.normalizePhone(cleaned.mobilePhone);
      }
      
      // Normalizar email (eliminar errores tipográficos comunes)
      if (cleaned.email) {
        cleaned.email = NormalizationToolkit.normalizeEmail(cleaned.email);
        // Corregir errores comunes en dominios
        cleaned.email = cleaned.email
          .replace(/\.comn$/, '.com')
          .replace(/\.cpm$/, '.com')
          .replace(/\.ocm$/, '.com')
          .replace(/@gmial\./, '@gmail.')
          .replace(/@gmal\./, '@gmail.')
          .replace(/@yaho\./, '@yahoo.')
          .replace(/@hotmal\./, '@hotmail.');
      }
      
      // Normalizar estado (CA, ca, California -> CA)
      if (cleaned.state) {
        const stateCheck = NormalizationToolkit.isState(cleaned.state);
        if (stateCheck.isState) {
          cleaned.state = stateCheck.normalized;
        }
      }
      
      // Detectar y separar datos concatenados en address
      if (cleaned.address && !cleaned.city) {
        const concatCheck = NormalizationToolkit.detectConcatenatedData(cleaned.address);
        if (concatCheck.isConcatenated && concatCheck.suggestedSplit) {
          if (concatCheck.suggestedSplit.address) {
            cleaned.address = concatCheck.suggestedSplit.address;
          }
          if (concatCheck.suggestedSplit.city) {
            cleaned.city = concatCheck.suggestedSplit.city;
          }
          if (concatCheck.suggestedSplit.state) {
            cleaned.state = concatCheck.suggestedSplit.state;
          }
          if (concatCheck.suggestedSplit.zip) {
            cleaned.zipCode = concatCheck.suggestedSplit.zip;
          }
        }
      }
      
      // Detectar y separar datos concatenados en city (como "229 Jordan St\nVallejo CA 94591")
      if (cleaned.city && cleaned.city.includes('\n')) {
        const lines = cleaned.city.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length >= 2) {
          cleaned.address = lines[0];
          const secondLine = lines[1];
          const cityStateZipMatch = secondLine.match(/^([A-Za-z\s]+)\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/);
          if (cityStateZipMatch) {
            cleaned.city = cityStateZipMatch[1].trim();
            cleaned.state = cityStateZipMatch[2];
            cleaned.zipCode = cityStateZipMatch[3];
          } else {
            cleaned.city = secondLine;
          }
        }
      }
      
      // Corregir errores tipográficos comunes en ciudades de California
      if (cleaned.city) {
        const cityCorrections: Record<string, string> = {
          'barkeley': 'Berkeley',
          'berkley': 'Berkeley',
          'oackland': 'Oakland',
          'oakalnd': 'Oakland',
          'san fracisco': 'San Francisco',
          'san fransico': 'San Francisco',
          'sacremento': 'Sacramento',
          'los angelas': 'Los Angeles',
          'los angles': 'Los Angeles',
        };
        const lowerCity = cleaned.city.toLowerCase().trim();
        if (cityCorrections[lowerCity]) {
          cleaned.city = cityCorrections[lowerCity];
        }
      }
      
      // Limpiar nombre (remover caracteres extra, normalizar formato)
      if (cleaned.name) {
        cleaned.name = cleaned.name
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
      
      return cleaned;
    });

    console.log('✅ [INTELLIGENT-IMPORT-API] Limpieza completada para', cleanedClients.length, 'clientes');

    // Obtener clientes existentes para detectar duplicados
    console.log('🔍 [INTELLIGENT-IMPORT-API] Verificando duplicados...');
    const firebaseManager = getFirebaseManager();
    const existingClients = await firebaseManager.getClients(req.firebaseUser.uid);
    
    // Crear sets de identificadores existentes para búsqueda rápida
    const existingEmails = new Set(
      existingClients
        .filter(c => c.email)
        .map(c => c.email!.toLowerCase().trim())
    );
    const existingPhones = new Set(
      existingClients
        .filter(c => c.phone)
        .map(c => c.phone!.replace(/\D/g, '')) // Solo dígitos para comparación
    );
    const existingNames = new Set(
      existingClients
        .filter(c => c.name)
        .map(c => c.name.toLowerCase().trim())
    );
    
    // Filtrar duplicados
    const duplicates: any[] = [];
    const uniqueClients = cleanedClients.filter(client => {
      const isDuplicate = 
        // Duplicado por email (el más confiable)
        (client.email && existingEmails.has(client.email.toLowerCase().trim())) ||
        // Duplicado por teléfono
        (client.phone && existingPhones.has(client.phone.replace(/\D/g, ''))) ||
        // Duplicado por nombre exacto (menos confiable, pero útil)
        (client.name && existingNames.has(client.name.toLowerCase().trim()));
      
      if (isDuplicate) {
        duplicates.push({
          name: client.name,
          email: client.email,
          phone: client.phone,
          reason: client.email && existingEmails.has(client.email.toLowerCase().trim()) 
            ? 'Email duplicado' 
            : client.phone && existingPhones.has(client.phone.replace(/\D/g, ''))
              ? 'Teléfono duplicado'
              : 'Nombre duplicado'
        });
        return false;
      }
      return true;
    });
    
    // También detectar duplicados dentro del mismo archivo
    const seenInFile = new Set<string>();
    const internalDuplicates: any[] = [];
    const finalClients = uniqueClients.filter(client => {
      const emailKey = client.email ? client.email.toLowerCase().trim() : null;
      const phoneKey = client.phone ? client.phone.replace(/\D/g, '') : null;
      const nameKey = client.name ? client.name.toLowerCase().trim() : null;
      
      // Crear una key única combinando email o teléfono (los más confiables)
      const uniqueKey = emailKey || phoneKey || nameKey;
      
      if (uniqueKey && seenInFile.has(uniqueKey)) {
        internalDuplicates.push({
          name: client.name,
          email: client.email,
          phone: client.phone,
          reason: 'Duplicado en el archivo'
        });
        return false;
      }
      
      if (uniqueKey) seenInFile.add(uniqueKey);
      return true;
    });

    const totalDuplicates = duplicates.length + internalDuplicates.length;
    console.log(`🚫 [INTELLIGENT-IMPORT-API] ${duplicates.length} duplicados con BD existente, ${internalDuplicates.length} duplicados internos`);
    console.log(`✅ [INTELLIGENT-IMPORT-API] ${finalClients.length} clientes únicos para importar`);

    // Agregar userId a cada cliente único
    const clientsWithUserId = finalClients.map(client => ({
      ...client,
      userId,
      source: result.detectedFormat || 'Intelligent CSV Import',
      clientId: `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    }));

    res.json({
      ...result,
      mappedClients: clientsWithUserId,
      duplicatesRejected: totalDuplicates,
      duplicateDetails: [...duplicates, ...internalDuplicates].slice(0, 10), // Solo primeros 10 para no sobrecargar
      originalCount: cleanedClients.length,
      finalCount: finalClients.length
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

/**
 * POST /api/intelligent-import/v2/process
 * Pipeline de importación inteligente multi-fase con limpieza automática
 * Maneja archivos corruptos, datos concatenados, y campos mezclados
 */
router.post('/v2/process', verifyFirebaseAuth, async (req, res) => {
  try {
    console.log('🚀 [INTELLIGENT-IMPORT-V2] Iniciando pipeline multi-fase');
    
    if (!req.firebaseUser) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const { csvContent, fileType = 'csv' } = req.body;
    
    if (!csvContent) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere el contenido del archivo'
      });
    }

    console.log(`🔐 [INTELLIGENT-IMPORT-V2] Usuario: ${req.firebaseUser.uid}`);
    console.log(`📊 [INTELLIGENT-IMPORT-V2] Tipo: ${fileType}, Tamaño: ${csvContent.length} chars`);

    const firebaseManager = getFirebaseManager();
    const existingClients = await firebaseManager.getClients(req.firebaseUser.uid);
    const existingContacts = existingClients.map((c: any) => ({
      email: c.email,
      phone: c.phone,
      name: c.name
    }));

    const result = await intelligentImportPipeline.processFile(
      csvContent,
      fileType as 'csv' | 'excel',
      existingContacts
    );

    console.log(`✅ [INTELLIGENT-IMPORT-V2] Resultado:`, {
      success: result.success,
      contactsImported: result.stats.validContacts,
      duplicatesFound: result.stats.duplicatesFound,
      autoCorrections: result.stats.autoCorrections,
      issues: result.stats.issuesFound
    });

    const contactsWithIds = result.normalizedContacts.map(contact => ({
      ...contact,
      id: `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: req.firebaseUser!.uid,
    }));

    res.json({
      success: result.success,
      jobId: result.jobId,
      phase: result.phase,
      contacts: contactsWithIds,
      structuralAnalysis: result.structuralAnalysis,
      columnAnalysis: result.columnAnalysis,
      issues: result.issues,
      duplicates: result.duplicates,
      stats: result.stats
    });

  } catch (error) {
    console.error('❌ [INTELLIGENT-IMPORT-V2] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/intelligent-import/v2/confirm
 * Confirma la importación y guarda los contactos en Firebase
 */
router.post('/v2/confirm', verifyFirebaseAuth, async (req, res) => {
  try {
    console.log('💾 [INTELLIGENT-IMPORT-V2-CONFIRM] Confirmando importación');
    
    if (!req.firebaseUser) {
      return res.status(401).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    const { contacts, includeDuplicates = false, duplicatesToInclude = [] } = req.body;
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No hay contactos para importar'
      });
    }

    let contactsToSave = [...contacts];
    
    if (includeDuplicates && duplicatesToInclude.length > 0) {
      contactsToSave = [...contactsToSave, ...duplicatesToInclude];
    }

    console.log(`📤 [INTELLIGENT-IMPORT-V2-CONFIRM] Guardando ${contactsToSave.length} contactos`);

    const firebaseManager = getFirebaseManager();
    let savedCount = 0;
    const errors: string[] = [];

    for (const contact of contactsToSave) {
      try {
        const clientData = {
          id: contact.id || `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: contact.name,
          email: contact.email || '',
          phone: contact.phone || '',
          mobilePhone: contact.mobilePhone || '',
          address: contact.address || '',
          city: contact.city || '',
          state: contact.state || '',
          zipCode: contact.zipCode || '',
          notes: contact.notes || '',
          source: contact.source || 'Pipeline Import V2',
          classification: contact.classification || 'cliente',
          createdAt: new Date().toISOString()
        };

        await firebaseManager.createClient(req.firebaseUser!.uid, clientData);
        savedCount++;
      } catch (err) {
        console.error(`❌ Error saving contact ${contact.name}:`, err);
        errors.push(`Failed to save: ${contact.name}`);
      }
    }

    console.log(`✅ [INTELLIGENT-IMPORT-V2-CONFIRM] ${savedCount}/${contactsToSave.length} contactos guardados`);

    res.json({
      success: true,
      savedCount,
      totalAttempted: contactsToSave.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('❌ [INTELLIGENT-IMPORT-V2-CONFIRM] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno del servidor'
    });
  }
});

/**
 * POST /api/intelligent-import/v2/analyze-row
 * Analiza una fila corrupta individualmente con IA
 */
router.post('/v2/analyze-row', verifyFirebaseAuth, async (req, res) => {
  try {
    const { row, headers } = req.body;
    
    if (!row || !headers) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la fila y los headers'
      });
    }

    const contact = await intelligentImportPipeline.processCorruptedRow(row, headers);
    
    if (contact) {
      res.json({
        success: true,
        contact,
        method: 'AI-assisted'
      });
    } else {
      res.json({
        success: false,
        error: 'No se pudo procesar la fila'
      });
    }

  } catch (error) {
    console.error('❌ [INTELLIGENT-IMPORT-V2-ROW] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error interno'
    });
  }
});

export default router;
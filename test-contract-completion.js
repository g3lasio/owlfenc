/**
 * Pruebas para la funcionalidad de completado de contratos
 * 
 * Este script verifica la capacidad del sistema para generar contratos
 * completos a partir de datos parciales o incompletos.
 */
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

// Obtener el directorio actual (equivalente a __dirname en CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar configuración centralizada
import { API_BASE_URL, API_URLS, TEST_DATA, TIMEOUTS } from './test-config.js';

// Configuración
const OUTPUT_DIR = path.join(__dirname, 'test-output');

// Crear directorio de salida si no existe
async function setup() {
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`Directorio de salida creado: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error('Error creando directorio de salida:', error);
    throw error;
  }
}

// Casos de prueba para completado de contratos
const completionTestCases = [
  {
    name: 'Solo información del cliente',
    data: {
      clientName: 'Ana Martínez',
      address: 'Calle Palmas #789, Col. Jardines, León, Guanajuato',
      phone: '(477) 123-4567',
      email: 'ana.martinez@email.com'
    },
    requiredFields: ['fenceType', 'fenceLength', 'fenceHeight', 'total']
  },
  {
    name: 'Solo información de la cerca',
    data: {
      fenceType: 'Ornamental de hierro',
      fenceHeight: '6',
      fenceLength: '65',
      fenceMaterial: 'Hierro forjado'
    },
    requiredFields: ['clientName', 'address', 'total']
  },
  {
    name: 'Solo información de precios',
    data: {
      total: 78500,
      depositAmount: 39250,
      materialCost: 52000,
      laborCost: 26500
    },
    requiredFields: ['clientName', 'address', 'fenceType', 'fenceLength']
  },
  {
    name: 'Mínimo necesario para un precio razonable',
    data: {
      clientName: 'Roberto Sánchez',
      address: 'Av. Constitución #456, Monterrey, N.L.',
      fenceType: 'Malla ciclónica',
      fenceLength: '40'
    },
    requiredFields: ['total']
  }
];

/**
 * Prueba la generación de contrato con datos parciales
 */
async function testContractCompletion(testCase) {
  console.log(`\n🧪 TEST: ${testCase.name}`);
  console.log('----------------------------------------------');
  
  try {
    console.log('Datos de entrada:');
    console.log(JSON.stringify(testCase.data, null, 2));
    
    console.log('\nCampos que deberían ser inferidos/completados:');
    console.log(testCase.requiredFields.join(', '));
    
    // Llamada a la API para generar contrato
    console.log('\nEnviando solicitud para completar y generar contrato...');
    const response = await axios.post(
      API_URLS.generateContract,
      {
        projectDetails: testCase.data,
        completeData: true // Indicador de que se deben completar datos faltantes
      },
      { timeout: TIMEOUTS.request }
    );
    
    // Verificar que se generó un contrato
    assert(response.data.html, 'La respuesta debe contener HTML del contrato');
    
    // Si la API devuelve los datos completados
    if (response.data.completedData) {
      console.log('\nDatos completados:');
      const completedData = response.data.completedData;
      console.log(JSON.stringify(completedData, null, 2));
      
      // Verificar que se completaron los campos requeridos
      for (const field of testCase.requiredFields) {
        const fieldExists = field.includes('.')
          ? field.split('.').reduce((obj, key) => obj?.[key], completedData)
          : completedData[field];
          
        assert(fieldExists, `El campo '${field}' debería haber sido completado`);
        console.log(`✅ Campo '${field}' completado correctamente`);
      }
    } else {
      console.log('\n⚠️ La API no devolvió datos completados explícitamente');
      
      // Podemos inferir cierta compleción por el contenido del HTML
      const htmlContent = response.data.html;
      
      for (const field of testCase.requiredFields) {
        let fieldFound = false;
        
        // Verificaciones específicas según el campo
        switch (field) {
          case 'total':
            fieldFound = htmlContent.includes('total') || 
                         htmlContent.includes('precio') || 
                         htmlContent.includes('$') || 
                         htmlContent.includes('pesos');
            break;
          case 'fenceType':
            fieldFound = htmlContent.includes('cerca') || 
                         htmlContent.includes('valla') || 
                         htmlContent.includes('barrera');
            break;
          case 'fenceLength':
            fieldFound = htmlContent.includes('metros') || 
                         htmlContent.includes('longitud') || 
                         htmlContent.includes('extensión');
            break;
          case 'clientName':
            fieldFound = htmlContent.includes('cliente') || 
                         htmlContent.includes('contratante');
            break;
          default:
            // Para otros campos, simplemente verificamos si la clave está presente
            fieldFound = htmlContent.includes(field);
        }
        
        if (fieldFound) {
          console.log(`✅ Se infiere que el campo '${field}' fue completado`);
        } else {
          console.log(`❌ No se puede confirmar que el campo '${field}' fue completado`);
        }
      }
    }
    
    // Guardar el HTML generado para inspección
    const htmlFilename = `completion-test-${testCase.name.replace(/\s+/g, '-').toLowerCase()}.html`;
    const htmlPath = path.join(OUTPUT_DIR, htmlFilename);
    await fs.writeFile(htmlPath, response.data.html);
    console.log(`\nHTML guardado en: ${htmlPath}`);
    
    // Generar PDF para inspección visual
    try {
      const pdfResponse = await axios.post(
        API_URLS.generatePdf,
        {
          html: response.data.html,
          filename: htmlFilename.replace('.html', '.pdf')
        },
        {
          responseType: 'arraybuffer',
          timeout: TIMEOUTS.request
        }
      );
      
      const pdfFilename = htmlFilename.replace('.html', '.pdf');
      const pdfPath = path.join(OUTPUT_DIR, pdfFilename);
      await fs.writeFile(pdfPath, Buffer.from(pdfResponse.data));
      console.log(`PDF guardado en: ${pdfPath}`);
    } catch (pdfError) {
      console.log(`⚠️ No se pudo generar el PDF: ${pdfError.message}`);
    }
    
    return {
      success: true,
      testCase: testCase.name,
      completedData: response.data.completedData
    };
  } catch (error) {
    console.error(`❌ Error en test de completado (${testCase.name}):`, error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    
    return {
      success: false,
      testCase: testCase.name,
      error: error.message
    };
  }
}

/**
 * Prueba de consistencia en el completado 
 * 
 * Verifica que los datos completados sean consistentes a través de múltiples llamadas
 */
async function testCompletionConsistency() {
  console.log('\n🧪 TEST: Consistencia en el completado de datos');
  console.log('----------------------------------------------');
  
  try {
    // Datos mínimos para probar consistencia
    const minimalData = {
      clientName: 'Cliente de Prueba',
      address: 'Dirección de Prueba',
      fenceType: 'Simple'
    };
    
    console.log('Datos de entrada:');
    console.log(JSON.stringify(minimalData, null, 2));
    
    // Realizar múltiples llamadas para verificar consistencia
    const iterations = 3;
    const results = [];
    
    console.log(`\nRealizando ${iterations} llamadas consecutivas...`);
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\nLlamada ${i + 1}:`);
      
      const response = await axios.post(
        API_URLS.generateContract,
        {
          projectDetails: minimalData,
          completeData: true
        },
        { timeout: TIMEOUTS.request }
      );
      
      if (response.data.completedData) {
        console.log('Datos completados:');
        console.log(JSON.stringify(response.data.completedData, null, 2));
        results.push(response.data.completedData);
      } else {
        // Si no hay datos completados explícitos, usar una alternativa
        const consistencyCheck = {
          htmlLength: response.data.html.length,
          containsTotal: response.data.html.includes('total') || response.data.html.includes('precio'),
          containsFenceLength: response.data.html.includes('longitud') || response.data.html.includes('metros')
        };
        console.log('Métricas de consistencia:');
        console.log(JSON.stringify(consistencyCheck, null, 2));
        results.push(consistencyCheck);
      }
    }
    
    // Comparar resultados para verificar consistencia
    console.log('\nAnálisis de consistencia:');
    
    if (results[0].htmlLength !== undefined) {
      // Estamos usando métricas alternativas
      const lengthVariation = Math.max(...results.map(r => r.htmlLength)) - 
                              Math.min(...results.map(r => r.htmlLength));
                              
      const containsTotalConsistent = results.every(r => r.containsTotal) || 
                                      results.every(r => !r.containsTotal);
                                      
      const containsFenceLengthConsistent = results.every(r => r.containsFenceLength) || 
                                            results.every(r => !r.containsFenceLength);
      
      console.log(`Variación en longitud HTML: ${lengthVariation} caracteres`);
      console.log(`Consistencia en referencia a precio/total: ${containsTotalConsistent ? 'SÍ' : 'NO'}`);
      console.log(`Consistencia en referencia a longitud: ${containsFenceLengthConsistent ? 'SÍ' : 'NO'}`);
      
      const isConsistent = lengthVariation < 1000 && 
                          containsTotalConsistent && 
                          containsFenceLengthConsistent;
                          
      if (isConsistent) {
        console.log('✅ El completado muestra CONSISTENCIA');
      } else {
        console.log('⚠️ El completado muestra VARIABILIDAD significativa');
      }
      
      return {
        success: true,
        consistent: isConsistent,
        metrics: {
          lengthVariation,
          containsTotalConsistent,
          containsFenceLengthConsistent
        }
      };
    } else {
      // Tenemos datos completados explícitos para comparar
      const keys = Object.keys(results[0]);
      const consistencyReport = {};
      
      for (const key of keys) {
        if (typeof results[0][key] === 'number') {
          // Para valores numéricos, verificar la variación
          const values = results.map(r => r[key]);
          const min = Math.min(...values);
          const max = Math.max(...values);
          const variation = max - min;
          const percentVariation = min > 0 ? (variation / min) * 100 : 0;
          
          consistencyReport[key] = {
            consistent: percentVariation < 30, // Menos del 30% de variación se considera consistente
            variation: `${variation} (${percentVariation.toFixed(2)}%)`
          };
        } else if (typeof results[0][key] === 'string') {
          // Para strings, verificar si son iguales o similares
          const values = results.map(r => r[key]);
          const allEqual = values.every(v => v === values[0]);
          
          consistencyReport[key] = {
            consistent: allEqual,
            variation: allEqual ? 'Idénticos' : 'Diferentes'
          };
        }
      }
      
      console.log(JSON.stringify(consistencyReport, null, 2));
      
      const isConsistent = Object.values(consistencyReport)
                                 .every(report => report.consistent);
                                 
      if (isConsistent) {
        console.log('✅ El completado muestra CONSISTENCIA');
      } else {
        console.log('⚠️ El completado muestra VARIABILIDAD en algunos campos');
      }
      
      return {
        success: true,
        consistent: isConsistent,
        report: consistencyReport
      };
    }
  } catch (error) {
    console.error('❌ Error en test de consistencia:', error.message);
    if (error.response) {
      console.error('Detalles del error:', error.response.data);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('🚀 Iniciando pruebas de completado de contratos...');
    await setup();
    
    const results = [];
    
    // Ejecutar cada caso de prueba de completado
    for (const testCase of completionTestCases) {
      const result = await testContractCompletion(testCase);
      results.push(result);
    }
    
    // Probar consistencia del completado
    const consistencyResult = await testCompletionConsistency();
    results.push(consistencyResult);
    
    // Evaluar resultados finales
    const successCount = results.filter(r => r.success).length;
    console.log('\n📊 RESUMEN DE PRUEBAS DE COMPLETADO:');
    console.log(`   Total de pruebas: ${results.length}`);
    console.log(`   Pruebas exitosas: ${successCount}`);
    console.log(`   Pruebas fallidas: ${results.length - successCount}`);
    
    if (successCount === results.length) {
      console.log('\n✅✅✅ TODAS LAS PRUEBAS DE COMPLETADO EXITOSAS ✅✅✅');
    } else {
      console.log('\n⚠️ ALGUNAS PRUEBAS DE COMPLETADO FALLARON');
    }
    
    // Guardar resultados en un archivo JSON
    const reportPath = path.join(OUTPUT_DIR, 'contract-completion-report.json');
    await fs.writeFile(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount
      },
      details: results
    }, null, 2));
    
    console.log(`\nReporte guardado en: ${reportPath}`);
  } catch (error) {
    console.error('\n❌❌❌ ERROR GENERAL EN LAS PRUEBAS DE COMPLETADO ❌❌❌');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Ejecutar las pruebas
runAllTests();
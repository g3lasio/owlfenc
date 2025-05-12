/**
 * Health Check del Sistema de Generación de Contratos
 * 
 * Este script realiza una verificación rápida de salud del sistema de generación
 * de contratos, comprobando los componentes críticos y sus dependencias.
 */
import axios from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual (equivalente a __dirname en CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar configuración centralizada
import { API_BASE_URL, API_URLS, TEST_NAMES, TEST_DATA, TIMEOUTS } from './test-config.js';

// Configuración
const OUTPUT_DIR = path.join(__dirname, 'health-check');

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

// Usar datos de prueba de la configuración centralizada
const minimalContractData = TEST_DATA.minimalContract;

// Verificar la API de generación de contratos
async function checkContractGeneration() {
  console.log('\n🔍 Verificando API de generación de contratos...');
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-contract`,
      { projectDetails: minimalContractData },
      { timeout: 10000 }
    );
    
    if (response.status === 200 && response.data.html) {
      console.log('✅ API de generación de contratos funciona correctamente');
      return { success: true, service: 'contract_generation' };
    } else {
      console.error('❌ La API respondió, pero sin datos de contrato válidos');
      return { success: false, service: 'contract_generation', error: 'No data' };
    }
  } catch (error) {
    console.error('❌ Error en la API de generación de contratos:', error.message);
    return { 
      success: false, 
      service: 'contract_generation', 
      error: error.message,
      details: error.response?.data
    };
  }
}

// Verificar la API de generación de PDF
async function checkPdfGeneration() {
  console.log('\n🔍 Verificando API de generación de PDF...');
  
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Contrato de Prueba</title>
    </head>
    <body>
      <h1>Contrato de Prueba</h1>
      <p>Este es un HTML simple para verificar la generación de PDF.</p>
      <p>Cliente: ${minimalContractData.clientName}</p>
      <p>Fecha: ${new Date().toLocaleDateString()}</p>
    </body>
    </html>
  `;
  
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/generate-pdf`,
      {
        html: sampleHtml,
        filename: 'health-check.pdf'
      },
      {
        responseType: 'arraybuffer',
        timeout: 10000
      }
    );
    
    if (response.status === 200 && response.headers['content-type'] === 'application/pdf') {
      // Guardar PDF para verificación
      const pdfPath = path.join(OUTPUT_DIR, 'health-check.pdf');
      await fs.writeFile(pdfPath, Buffer.from(response.data));
      
      console.log('✅ API de generación de PDF funciona correctamente');
      console.log(`   PDF guardado en: ${pdfPath}`);
      return { success: true, service: 'pdf_generation' };
    } else {
      console.error('❌ La API respondió, pero no con un PDF válido');
      return { success: false, service: 'pdf_generation', error: 'Invalid content type' };
    }
  } catch (error) {
    console.error('❌ Error en la API de generación de PDF:', error.message);
    return { 
      success: false, 
      service: 'pdf_generation', 
      error: error.message,
      details: error.response?.data
    };
  }
}

// Verificar la configuración de servicios de IA
async function checkAIServices() {
  console.log('\n🔍 Verificando configuración de servicios de IA...');
  
  try {
    // Intentar obtener la configuración de AI services si está disponible
    const response = await axios.get(
      `${API_BASE_URL}/api/ai-services/config`,
      { timeout: 5000 }
    );
    
    const config = response.data;
    
    if (config) {
      console.log('✅ API de configuración de IA accesible');
      
      if (config.openAIConfigured) {
        console.log('✅ OpenAI configurado');
      } else {
        console.log('⚠️ OpenAI no configurado');
      }
      
      if (config.mistralConfigured) {
        console.log('✅ Mistral AI configurado');
      } else {
        console.log('⚠️ Mistral AI no configurado');
      }
      
      return { 
        success: true, 
        service: 'ai_services',
        openAIConfigured: config.openAIConfigured,
        mistralConfigured: config.mistralConfigured
      };
    } else {
      console.log('⚠️ API de configuración de IA respondió sin datos');
      return { success: true, service: 'ai_services', configured: false };
    }
  } catch (error) {
    console.log('⚠️ API de configuración de IA no disponible');
    // Esto no es un error crítico, intentaremos con el método de respaldo
    return { 
      success: true, 
      service: 'ai_services', 
      available: false,
      error: error.message
    };
  }
}

// Verificar el procesamiento de PDF
async function checkPdfProcessing() {
  console.log('\n🔍 Verificando API de procesamiento de PDF...');
  
  try {
    // Esta es una verificación simple sin enviar un archivo real
    const response = await axios.get(
      `${API_BASE_URL}/api/pdf-processing/status`,
      { timeout: 5000 }
    );
    
    if (response.status === 200) {
      console.log('✅ API de procesamiento de PDF accesible');
      return { success: true, service: 'pdf_processing' };
    } else {
      console.log('⚠️ API de procesamiento de PDF respondió con estado no-ok');
      return { success: false, service: 'pdf_processing', statusCode: response.status };
    }
  } catch (error) {
    console.log('⚠️ API de procesamiento de PDF no disponible');
    // Esto no es un error crítico
    return { 
      success: false, 
      service: 'pdf_processing', 
      available: false,
      error: error.message
    };
  }
}

// Generar informe HTML con los resultados
async function generateReport(results) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const reportPath = path.join(OUTPUT_DIR, `health-check-report-${timestamp}.html`);
  
  const criticalServices = ['contract_generation', 'pdf_generation'];
  const allSuccess = results
    .filter(r => criticalServices.includes(r.service))
    .every(r => r.success);
  
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Health Check del Sistema de Generación de Contratos</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ddd;
        }
        .status {
          text-align: center;
          padding: 15px;
          margin-bottom: 20px;
          border-radius: 5px;
        }
        .success {
          background-color: #d4edda;
          color: #155724;
        }
        .failure {
          background-color: #f8d7da;
          color: #721c24;
        }
        .service {
          margin-bottom: 20px;
          padding: 15px;
          border: 1px solid #ddd;
          border-radius: 5px;
        }
        .service-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .service-name {
          font-weight: bold;
          font-size: 18px;
        }
        .service-status {
          padding: 5px 10px;
          border-radius: 3px;
          font-weight: bold;
        }
        .service-details {
          margin-top: 10px;
          font-family: monospace;
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 3px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Health Check del Sistema de Generación de Contratos</h1>
        <p>Generado el ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="status ${allSuccess ? 'success' : 'failure'}">
        <h2>Estado General: ${allSuccess ? 'FUNCIONANDO' : 'ERROR'}</h2>
        <p>${allSuccess 
          ? 'Todos los servicios críticos están funcionando correctamente.' 
          : 'Uno o más servicios críticos no están funcionando correctamente.'}</p>
      </div>
      
      ${results.map(result => `
        <div class="service">
          <div class="service-header">
            <div class="service-name">${getServiceName(result.service)}</div>
            <div class="service-status" style="background-color: ${result.success ? '#d4edda' : '#f8d7da'}; color: ${result.success ? '#155724' : '#721c24'}">
              ${result.success ? 'FUNCIONANDO' : 'ERROR'}
            </div>
          </div>
          
          ${result.error ? `
            <div>
              <strong>Error:</strong> ${result.error}
            </div>
          ` : ''}
          
          ${result.details ? `
            <div class="service-details">
              <pre>${JSON.stringify(result.details, null, 2)}</pre>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </body>
    </html>
  `;
  
  await fs.writeFile(reportPath, html);
  console.log(`\n📋 Reporte de health check guardado en: ${reportPath}`);
  
  return reportPath;
}

// Nombres amigables para los servicios
function getServiceName(serviceId) {
  const names = {
    contract_generation: 'Generación de Contratos',
    pdf_generation: 'Generación de PDF',
    ai_services: 'Servicios de IA',
    pdf_processing: 'Procesamiento de PDF'
  };
  
  return names[serviceId] || serviceId;
}

// Ejecutar todas las verificaciones
async function runHealthCheck() {
  try {
    console.log('🚀 Iniciando health check del sistema de generación de contratos...');
    await setup();
    
    const results = [];
    
    // Verificar generación de contratos
    results.push(await checkContractGeneration());
    
    // Verificar generación de PDF
    results.push(await checkPdfGeneration());
    
    // Verificar servicios de IA
    results.push(await checkAIServices());
    
    // Verificar procesamiento de PDF
    results.push(await checkPdfProcessing());
    
    // Evaluar resultados
    const criticalServices = ['contract_generation', 'pdf_generation'];
    const criticalResults = results.filter(r => criticalServices.includes(r.service));
    const criticalSuccess = criticalResults.every(r => r.success);
    
    // Generar informe
    const reportPath = await generateReport(results);
    
    // Mostrar resumen
    console.log('\n📊 Resumen del Health Check:');
    console.log(`   Servicios críticos: ${criticalSuccess ? '✅ FUNCIONANDO' : '❌ ERROR'}`);
    console.log(`   Servicios verificados: ${results.length}`);
    console.log(`   Servicios funcionando: ${results.filter(r => r.success).length}`);
    
    if (!criticalSuccess) {
      console.error('\n❌ Uno o más servicios críticos no están funcionando correctamente');
      process.exit(1);
    } else {
      console.log('\n✅ Todos los servicios críticos están funcionando correctamente');
    }
  } catch (error) {
    console.error('\n❌ Error general en el health check:', error.message);
    process.exit(1);
  }
}

// Ejecutar el health check
runHealthCheck();
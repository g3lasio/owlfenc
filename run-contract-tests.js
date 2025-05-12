/**
 * Script principal para ejecutar todas las pruebas del generador de contratos
 * 
 * Este script ejecuta las diferentes pruebas del generador de contratos
 * y genera un informe detallado de los resultados.
 */
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual (equivalente a __dirname en CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración
const TEST_SCRIPTS = [
  { 
    name: 'Generador de Contratos', 
    path: './test-contract-generator.js',
    description: 'Verifica la generación de contratos usando OpenAI y métodos de respaldo'
  },
  { 
    name: 'Procesamiento de PDF para Contratos', 
    path: './test-pdf-processing-for-contracts.js',
    description: 'Verifica la extracción de datos de PDFs y generación de contratos'
  },
  { 
    name: 'Procesamiento de Contratos Existentes', 
    path: './test-contract-upload-processing.js',
    description: 'Verifica la carga y procesamiento de contratos existentes en PDF'
  },
  { 
    name: 'Integración de Datos y Contratos', 
    path: './test-integration-data-contract.js',
    description: 'Verifica la integración entre procesamiento de datos y generación de contratos'
  },
  { 
    name: 'Validación de PDF', 
    path: './test-pdf-validation.js',
    description: 'Verifica la estructura, contenido y calidad del PDF generado'
  },
  { 
    name: 'Manejo de Errores', 
    path: './test-contract-error-handling.js',
    description: 'Verifica el manejo de errores en diferentes etapas del proceso'
  },
  { 
    name: 'Servicios de IA', 
    path: './test-ai-services.js',
    description: 'Verifica los servicios de OpenAI y Mistral utilizados en la generación de contratos'
  },
  { 
    name: 'Completado de Contratos', 
    path: './test-contract-completion.js',
    description: 'Verifica la capacidad de generar contratos completos a partir de datos parciales'
  }
];

const REPORTS_DIR = path.join(__dirname, 'test-reports');
const TIMESTAMP = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
const REPORT_FILE = path.join(REPORTS_DIR, `contract-tests-report-${TIMESTAMP}.html`);

// Crear directorio de reportes si no existe
async function setup() {
  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });
    console.log(`Directorio de reportes creado: ${REPORTS_DIR}`);
  } catch (error) {
    console.error('Error creando directorio de reportes:', error);
    throw error;
  }
}

// Ejecutar un script de prueba y capturar su salida
async function runTestScript(script) {
  console.log(`\n📋 Ejecutando prueba: ${script.name}`);
  
  try {
    const output = execSync(`node ${script.path}`, { encoding: 'utf8' });
    return {
      name: script.name,
      description: script.description,
      success: true,
      output: output
    };
  } catch (error) {
    console.error(`❌ Error ejecutando ${script.name}:`, error.message);
    return {
      name: script.name,
      description: script.description,
      success: false,
      output: error.stdout || error.message
    };
  }
}

// Generar HTML para el reporte
function generateReportHtml(results) {
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reporte de Pruebas del Generador de Contratos</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 1px solid #ddd;
        }
        .summary {
          display: flex;
          justify-content: space-around;
          margin-bottom: 30px;
        }
        .summary-item {
          text-align: center;
          padding: 15px;
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
        .neutral {
          background-color: #e2e3e5;
          color: #383d41;
        }
        .test-case {
          margin-bottom: 40px;
          border: 1px solid #ddd;
          border-radius: 5px;
          overflow: hidden;
        }
        .test-header {
          padding: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .test-success {
          background-color: #d4edda;
        }
        .test-failure {
          background-color: #f8d7da;
        }
        .test-details {
          padding: 0 15px;
        }
        .test-output {
          background-color: #f8f9fa;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
          white-space: pre-wrap;
          font-family: monospace;
          font-size: 14px;
          margin: 15px 0;
        }
        .test-description {
          font-style: italic;
          color: #6c757d;
        }
        .toggle-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          color: #007bff;
        }
        .hidden {
          display: none;
        }
        .success-label {
          background-color: #28a745;
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
        }
        .failure-label {
          background-color: #dc3545;
          color: white;
          padding: 5px 10px;
          border-radius: 3px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reporte de Pruebas del Generador de Contratos</h1>
        <p>Generado el ${new Date().toLocaleString()}</p>
      </div>
      
      <div class="summary">
        <div class="summary-item neutral">
          <h2>Total de Pruebas</h2>
          <p>${results.length}</p>
        </div>
        <div class="summary-item success">
          <h2>Exitosas</h2>
          <p>${successCount}</p>
        </div>
        <div class="summary-item failure">
          <h2>Fallidas</h2>
          <p>${failCount}</p>
        </div>
      </div>
      
      ${results.map((result, index) => `
        <div class="test-case">
          <div class="test-header ${result.success ? 'test-success' : 'test-failure'}">
            <h2>${result.name}</h2>
            <span class="${result.success ? 'success-label' : 'failure-label'}">
              ${result.success ? 'EXITOSO' : 'FALLIDO'}
            </span>
          </div>
          <div class="test-details">
            <p class="test-description">${result.description}</p>
            <button class="toggle-button" onclick="toggleOutput(${index})">Mostrar/Ocultar Detalles</button>
            <div class="test-output hidden" id="output-${index}">
${result.output}
            </div>
          </div>
        </div>
      `).join('')}
      
      <script>
        function toggleOutput(index) {
          const output = document.getElementById('output-' + index);
          if (output.classList.contains('hidden')) {
            output.classList.remove('hidden');
          } else {
            output.classList.add('hidden');
          }
        }
      </script>
    </body>
    </html>
  `;
}

// Ejecutar todas las pruebas
async function runAllTests() {
  try {
    console.log('🚀 Iniciando ejecución de todas las pruebas del generador de contratos...');
    await setup();
    
    const results = [];
    
    for (const script of TEST_SCRIPTS) {
      const result = await runTestScript(script);
      results.push(result);
    }
    
    // Generar reporte HTML
    const reportHtml = generateReportHtml(results);
    await fs.writeFile(REPORT_FILE, reportHtml);
    
    // Mostrar resumen
    const successCount = results.filter(r => r.success).length;
    console.log('\n📊 Resumen de Resultados:');
    console.log(`   Total de pruebas: ${results.length}`);
    console.log(`   Pruebas exitosas: ${successCount}`);
    console.log(`   Pruebas fallidas: ${results.length - successCount}`);
    console.log(`\n📝 Reporte HTML generado: ${REPORT_FILE}`);
    
  } catch (error) {
    console.error('\n❌ Error general en la ejecución de pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar todas las pruebas
runAllTests();
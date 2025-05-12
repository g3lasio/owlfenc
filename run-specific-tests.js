/**
 * Script para ejecutar pruebas específicas del generador de contratos
 * 
 * Este script permite ejecutar una o más categorías específicas de pruebas
 * en lugar de ejecutar todas las pruebas completas.
 * 
 * Uso:
 * node run-specific-tests.js [categoria1] [categoria2] ...
 * 
 * Categorías disponibles:
 * - contract: Pruebas del generador de contratos básico
 * - pdf: Pruebas de procesamiento de PDF
 * - upload: Pruebas de carga y procesamiento de contratos existentes
 * - integration: Pruebas de integración
 * - validation: Pruebas de validación de PDF
 * - errors: Pruebas de manejo de errores
 * - ai: Pruebas de servicios de IA
 * - all: Todas las pruebas
 */
import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Obtener el directorio actual (equivalente a __dirname en CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de categorías de prueba
const TEST_CATEGORIES = {
  contract: {
    name: 'Generador de Contratos',
    path: './test-contract-generator.js',
    description: 'Pruebas del generador de contratos básico'
  },
  pdf: {
    name: 'Procesamiento de PDF',
    path: './test-pdf-processing-for-contracts.js',
    description: 'Pruebas de procesamiento de PDF para contratos'
  },
  upload: {
    name: 'Procesamiento de Contratos Existentes',
    path: './test-contract-upload-processing.js',
    description: 'Pruebas de carga y procesamiento de contratos existentes'
  },
  integration: {
    name: 'Integración',
    path: './test-integration-data-contract.js',
    description: 'Pruebas de integración de datos y contratos'
  },
  validation: {
    name: 'Validación de PDF',
    path: './test-pdf-validation.js',
    description: 'Pruebas de validación de estructura y contenido del PDF'
  },
  errors: {
    name: 'Manejo de Errores',
    path: './test-contract-error-handling.js',
    description: 'Pruebas de manejo de errores en diferentes etapas'
  },
  ai: {
    name: 'Servicios de IA',
    path: './test-ai-services.js',
    description: 'Pruebas de servicios de OpenAI y Mistral'
  },
  completion: {
    name: 'Completado de Contratos',
    path: './test-contract-completion.js',
    description: 'Pruebas de generación de contratos a partir de datos parciales'
  },
  examples: {
    name: 'Ejemplos del Sistema',
    path: './contract-system-examples.js',
    description: 'Ejecuta ejemplos de uso del sistema de contratos'
  },
  health: {
    name: 'Verificación de Salud',
    path: './health-check-contract-system.js',
    description: 'Realiza una verificación rápida de salud del sistema'
  },
  all: {
    name: 'Todas las Pruebas',
    path: './run-contract-tests.js',
    description: 'Ejecuta todas las pruebas disponibles'
  }
};

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
📋 Categorías de pruebas disponibles:
${Object.entries(TEST_CATEGORIES)
  .map(([key, value]) => `  - ${key}: ${value.description}`)
  .join('\n')}

Uso: node run-specific-tests.js [categoria1] [categoria2] ...
Ejemplo: node run-specific-tests.js contract pdf
  `);
  process.exit(0);
}

// Validar argumentos
const categoriesToRun = [];
for (const arg of args) {
  if (TEST_CATEGORIES[arg]) {
    categoriesToRun.push(TEST_CATEGORIES[arg]);
  } else {
    console.error(`❌ Categoría desconocida: ${arg}`);
    process.exit(1);
  }
}

// Ejecutar cada categoría de prueba
async function runTests() {
  console.log('🚀 Iniciando ejecución de pruebas seleccionadas...\n');
  
  let successCount = 0;
  
  for (const category of categoriesToRun) {
    console.log(`📋 Ejecutando: ${category.name}`);
    console.log(`   Descripción: ${category.description}`);
    
    try {
      const output = execSync(`node ${category.path}`, { encoding: 'utf8' });
      console.log('✅ Prueba completada exitosamente\n');
      successCount++;
    } catch (error) {
      console.error(`❌ Error ejecutando ${category.name}:`);
      console.error(error.stdout || error.message);
      console.error('\n');
    }
  }
  
  // Mostrar resumen
  console.log('📊 Resumen de Resultados:');
  console.log(`   Total de categorías: ${categoriesToRun.length}`);
  console.log(`   Categorías exitosas: ${successCount}`);
  console.log(`   Categorías fallidas: ${categoriesToRun.length - successCount}`);
}

// Ejecutar las pruebas seleccionadas
runTests();
/**
 * TOOL VALIDATION SYSTEM
 * 
 * Valida que todas las herramientas estén correctamente conectadas:
 * - Definition existe
 * - Executor existe
 * - SystemAPIService tiene método correspondiente
 * - Metadata está registrada
 */

import { TOOL_DEFINITIONS, TOOL_REGISTRY } from './tools-registry';
import { TOOL_METADATA_REGISTRY } from './tool-metadata';
import { SystemAPIService } from '../mervin-v2/services/SystemAPIService';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface ToolValidationReport {
  toolName: string;
  hasDefinition: boolean;
  hasExecutor: boolean;
  hasMetadata: boolean;
  hasServiceMethod?: boolean;
  errors: string[];
}

/**
 * Valida que todas las herramientas estén correctamente configuradas
 */
export function validateToolRegistry(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Verificar que cada definition tenga executor
  TOOL_DEFINITIONS.forEach(def => {
    const toolName = def.function.name;
    
    if (!TOOL_REGISTRY[toolName]) {
      errors.push(`Tool "${toolName}" has definition but no executor in TOOL_REGISTRY`);
    }
    
    if (!TOOL_METADATA_REGISTRY[toolName]) {
      warnings.push(`Tool "${toolName}" missing metadata in TOOL_METADATA_REGISTRY`);
    }
  });

  // 2. Verificar que cada executor tenga definition
  Object.keys(TOOL_REGISTRY).forEach(toolName => {
    const hasDefinition = TOOL_DEFINITIONS.some(def => def.function.name === toolName);
    
    if (!hasDefinition) {
      errors.push(`Tool "${toolName}" has executor but no definition in TOOL_DEFINITIONS`);
    }
  });

  // 3. Verificar que herramientas críticas estén presentes
  const criticalTools = ['create_estimate', 'create_contract', 'verify_property'];
  criticalTools.forEach(toolName => {
    if (!TOOL_REGISTRY[toolName]) {
      errors.push(`CRITICAL: Tool "${toolName}" is missing from registry`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Genera reporte detallado de todas las herramientas
 */
export function generateToolReport(): ToolValidationReport[] {
  const allToolNames = new Set<string>();
  
  // Recopilar nombres de todas las fuentes
  TOOL_DEFINITIONS.forEach(def => allToolNames.add(def.function.name));
  Object.keys(TOOL_REGISTRY).forEach(name => allToolNames.add(name));
  Object.keys(TOOL_METADATA_REGISTRY).forEach(name => allToolNames.add(name));

  // Generar reporte para cada herramienta
  return Array.from(allToolNames).map(toolName => {
    const hasDefinition = TOOL_DEFINITIONS.some(def => def.function.name === toolName);
    const hasExecutor = toolName in TOOL_REGISTRY;
    const hasMetadata = toolName in TOOL_METADATA_REGISTRY;
    const errors: string[] = [];

    if (!hasDefinition) errors.push('Missing definition');
    if (!hasExecutor) errors.push('Missing executor');
    if (!hasMetadata) errors.push('Missing metadata');

    return {
      toolName,
      hasDefinition,
      hasExecutor,
      hasMetadata,
      errors
    };
  }).sort((a, b) => a.toolName.localeCompare(b.toolName));
}

/**
 * Imprime reporte de validación en consola
 */
export function printValidationReport(): void {
  console.log('\n🔍 [TOOL VALIDATION] Starting tool registry validation...\n');
  
  const validation = validateToolRegistry();
  const report = generateToolReport();

  // Mostrar resumen
  console.log(`📊 Total tools registered: ${report.length}`);
  console.log(`✅ Valid tools: ${report.filter(r => r.errors.length === 0).length}`);
  console.log(`⚠️  Tools with issues: ${report.filter(r => r.errors.length > 0).length}\n`);

  // Mostrar herramientas con problemas
  const problematicTools = report.filter(r => r.errors.length > 0);
  if (problematicTools.length > 0) {
    console.log('⚠️  TOOLS WITH ISSUES:\n');
    problematicTools.forEach(tool => {
      console.log(`  - ${tool.toolName}:`);
      tool.errors.forEach(err => console.log(`    ❌ ${err}`));
    });
    console.log('');
  }

  // Mostrar errores críticos
  if (validation.errors.length > 0) {
    console.log('❌ CRITICAL ERRORS:\n');
    validation.errors.forEach(err => console.log(`  - ${err}`));
    console.log('');
  }

  // Mostrar warnings
  if (validation.warnings.length > 0) {
    console.log('⚠️  WARNINGS:\n');
    validation.warnings.forEach(warn => console.log(`  - ${warn}`));
    console.log('');
  }

  // Resultado final
  if (validation.valid) {
    console.log('✅ [TOOL VALIDATION] All tools are correctly configured!\n');
  } else {
    console.log('❌ [TOOL VALIDATION] Validation failed. Please fix errors above.\n');
  }
}

/**
 * Valida que un método existe en SystemAPIService
 */
export function validateServiceMethod(toolName: string): boolean {
  const service = new SystemAPIService('test-user', {});
  
  // Convertir tool name a método esperado
  // Ej: create_estimate → createEstimate
  const methodName = toolName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  
  return typeof (service as any)[methodName] === 'function';
}

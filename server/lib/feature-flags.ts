/**
 * Feature Flags for Firebase → PostgreSQL Migration
 * 
 * Sistema profesional de feature flags para controlar la consolidación
 * de datos sin riesgos y con rollback inmediato disponible.
 */

export interface MigrationFlags {
  // Control de escrituras por módulo
  estimates: {
    WRITE_TO_PG: boolean;
    READ_SOURCE: 'pg' | 'firebase' | 'pg_with_fallback';
  };
  projects: {
    WRITE_TO_PG: boolean;
    READ_SOURCE: 'pg' | 'firebase' | 'pg_with_fallback';
  };
  materials: {
    WRITE_TO_PG: boolean;
    READ_SOURCE: 'pg' | 'firebase' | 'pg_with_fallback';
  };
  clients: {
    WRITE_TO_PG: boolean;
    READ_SOURCE: 'pg' | 'firebase' | 'pg_with_fallback';
  };
  permitHistory: {
    WRITE_TO_PG: boolean;
    READ_SOURCE: 'pg' | 'firebase' | 'pg_with_fallback';
  };
  userProfiles: {
    WRITE_TO_PG: boolean;
    READ_SOURCE: 'pg' | 'firebase' | 'pg_with_fallback';
  };
}

/**
 * Configuración actual de feature flags
 * FASE 1: Comenzando con estimates - PostgreSQL writes, Firebase fallback reads
 */
export const MIGRATION_FLAGS: MigrationFlags = {
  estimates: {
    WRITE_TO_PG: true,     // ✅ FASE 1: Eliminar dual-writes
    READ_SOURCE: 'pg_with_fallback'  // ✅ PostgreSQL con fallback durante transición
  },
  projects: {
    WRITE_TO_PG: false,    // 🔄 Pendiente - siguiente fase
    READ_SOURCE: 'firebase'
  },
  materials: {
    WRITE_TO_PG: false,    // 🔄 Pendiente 
    READ_SOURCE: 'firebase'
  },
  clients: {
    WRITE_TO_PG: false,    // 🔄 Pendiente
    READ_SOURCE: 'firebase'
  },
  permitHistory: {
    WRITE_TO_PG: false,    // 🔄 Pendiente
    READ_SOURCE: 'firebase'
  },
  userProfiles: {
    WRITE_TO_PG: true,     // ✅ Ya funcional con /api/profile
    READ_SOURCE: 'pg'      // ✅ Ya consolidado (problema que resolvimos antes)
  }
};

/**
 * Helper para verificar si un módulo debe escribir a PostgreSQL
 */
export function shouldWriteToPostgreSQL(module: keyof MigrationFlags): boolean {
  return MIGRATION_FLAGS[module].WRITE_TO_PG;
}

/**
 * Helper para obtener la fuente de lectura de un módulo
 */
export function getReadSource(module: keyof MigrationFlags): 'pg' | 'firebase' | 'pg_with_fallback' {
  return MIGRATION_FLAGS[module].READ_SOURCE;
}

/**
 * Logging estructurado para monitorear la migración
 */
export function logMigrationEvent(module: keyof MigrationFlags, action: 'read' | 'write', source: string, success: boolean, details?: any) {
  console.log(`🔄 [MIGRATION-${module.toUpperCase()}] ${action.toUpperCase()} from ${source}: ${success ? '✅' : '❌'}`, details ? JSON.stringify(details) : '');
}

/**
 * Función de emergencia para rollback inmediato
 */
export function emergencyRollbackModule(module: keyof MigrationFlags) {
  console.warn(`🚨 [EMERGENCY-ROLLBACK] Rolling back ${module} to Firebase-only`);
  MIGRATION_FLAGS[module].WRITE_TO_PG = false;
  MIGRATION_FLAGS[module].READ_SOURCE = 'firebase';
}
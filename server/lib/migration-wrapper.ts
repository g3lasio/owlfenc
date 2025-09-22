/**
 * Migration Wrapper - Abstracción profesional para reads con fallback
 * 
 * Este wrapper maneja la transición de Firebase → PostgreSQL de manera transparente
 * con fallback automático y logging detallado para monitoreo.
 */

import { getReadSource, logMigrationEvent, type MigrationFlags } from './feature-flags';

interface ReadOptions {
  module: keyof MigrationFlags;
  pgReader: () => Promise<any>;
  firebaseReader: () => Promise<any>;
  identifier?: string; // Para logging (ej: "user-123", "estimate-456")
}

/**
 * Wrapper unificado para reads con fallback automático durante migración
 */
export async function readWithFallback<T>({
  module,
  pgReader,
  firebaseReader,
  identifier = 'unknown'
}: ReadOptions): Promise<T | null> {
  const readSource = getReadSource(module);
  
  switch (readSource) {
    case 'pg':
      // PostgreSQL only - no fallback
      try {
        const result = await pgReader();
        logMigrationEvent(module, 'read', 'postgresql', true, { identifier });
        return result;
      } catch (error) {
        logMigrationEvent(module, 'read', 'postgresql', false, { identifier, error: error.message });
        throw error;
      }
      
    case 'firebase':
      // Firebase only - legacy mode
      try {
        const result = await firebaseReader();
        logMigrationEvent(module, 'read', 'firebase', true, { identifier });
        return result;
      } catch (error) {
        logMigrationEvent(module, 'read', 'firebase', false, { identifier, error: error.message });
        throw error;
      }
      
    case 'pg_with_fallback':
      // PostgreSQL with Firebase fallback - transition mode
      try {
        const result = await pgReader();
        if (result) {
          logMigrationEvent(module, 'read', 'postgresql', true, { identifier, fallbackUsed: false });
          return result;
        }
      } catch (error) {
        console.warn(`[MIGRATION-${module.toUpperCase()}] PostgreSQL read failed, trying Firebase fallback:`, error.message);
      }
      
      // Fallback a Firebase
      try {
        const fallbackResult = await firebaseReader();
        logMigrationEvent(module, 'read', 'firebase-fallback', true, { identifier, fallbackUsed: true });
        
        // TODO: Opcional - lazy upsert a PostgreSQL para warm up cache
        // if (fallbackResult) {
        //   await lazyUpsertToPostgreSQL(module, fallbackResult);
        // }
        
        return fallbackResult;
      } catch (fallbackError) {
        logMigrationEvent(module, 'read', 'firebase-fallback', false, { identifier, error: fallbackError.message });
        throw new Error(`Both PostgreSQL and Firebase reads failed for ${module}:${identifier}`);
      }
      
    default:
      throw new Error(`Invalid read source: ${readSource}`);
  }
}

/**
 * Wrapper para writes que respeta feature flags
 */
export async function writeWithFlag<T>({
  module,
  pgWriter,
  firebaseWriter,
  identifier = 'unknown'
}: {
  module: keyof MigrationFlags;
  pgWriter: () => Promise<T>;
  firebaseWriter?: () => Promise<any>;
  identifier?: string;
}): Promise<T> {
  const shouldWriteToPG = getReadSource(module) !== 'firebase'; // Si no es firebase-only, escribir a PG
  
  if (shouldWriteToPG) {
    try {
      const result = await pgWriter();
      logMigrationEvent(module, 'write', 'postgresql', true, { identifier });
      return result;
    } catch (error) {
      logMigrationEvent(module, 'write', 'postgresql', false, { identifier, error: error.message });
      throw error;
    }
  } else {
    // Legacy Firebase write (solo durante rollback)
    if (!firebaseWriter) {
      throw new Error(`Firebase writer required for ${module} in legacy mode`);
    }
    try {
      const result = await firebaseWriter();
      logMigrationEvent(module, 'write', 'firebase', true, { identifier });
      return result;
    } catch (error) {
      logMigrationEvent(module, 'write', 'firebase', false, { identifier, error: error.message });
      throw error;
    }
  }
}
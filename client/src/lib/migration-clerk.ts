/**
 * 🔄 CLERK MIGRATION UTILITIES
 * Utilidades del lado cliente para migración de Firebase a Clerk
 */

import { useUser } from '@clerk/clerk-react';

/**
 * Hook para manejar migración automática del usuario actual
 */
export const useMigrationFromFirebase = () => {
  const { user } = useUser();

  const checkMigrationNeeded = async () => {
    if (!user) return { needed: false, reason: 'No user authenticated' };
    
    try {
      // Verificar si el usuario ya tiene datos migrados
      const response = await fetch('/api/migration/check-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId: user.id,
          email: user.primaryEmailAddress?.emailAddress
        })
      });
      
      const result = await response.json();
      return result;
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error verificando migración:', error);
      return { needed: false, error: true };
    }
  };

  const migrateUserData = async (firebaseUid?: string) => {
    if (!user) {
      throw new Error('No hay usuario autenticado en Clerk');
    }
    
    try {
      console.log('🔄 [MIGRATION] Iniciando migración para usuario:', user.id);
      
      // Si no se proporciona firebaseUid, intentar detectarlo
      let detectedFirebaseUid = firebaseUid;
      
      if (!detectedFirebaseUid) {
        // Buscar en localStorage si hay datos de Firebase
        const firebaseUserId = localStorage.getItem('firebase_user_id');
        if (firebaseUserId) {
          detectedFirebaseUid = firebaseUserId;
        }
      }
      
      if (!detectedFirebaseUid) {
        throw new Error('No se pudo detectar Firebase UID para migración');
      }
      
      const response = await fetch('/api/migration/migrate-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: detectedFirebaseUid,
          clerkUserId: user.id,
          email: user.primaryEmailAddress?.emailAddress
        })
      });
      
      if (!response.ok) {
        throw new Error(`Error en migración: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ [MIGRATION] Migración completada:', result);
      
      return result;
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error en migración:', error);
      throw error;
    }
  };

  const getProjectsWithClerk = async () => {
    if (!user) return [];
    
    try {
      // Primero intentar obtener proyectos ya migrados
      const response = await fetch('/api/projects/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId: user.id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.projects || [];
      }
      
      // Si no hay proyectos migrados, devolver array vacío
      return [];
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error obteniendo proyectos con Clerk:', error);
      return [];
    }
  };

  const getEstimatesWithClerk = async () => {
    if (!user) return [];
    
    try {
      const response = await fetch('/api/estimates/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerkUserId: user.id
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.estimates || [];
      }
      
      return [];
      
    } catch (error) {
      console.error('❌ [MIGRATION] Error obteniendo estimates con Clerk:', error);
      return [];
    }
  };

  return {
    checkMigrationNeeded,
    migrateUserData,
    getProjectsWithClerk,
    getEstimatesWithClerk,
    currentUser: user
  };
};

/**
 * Función para actualizar queries de Firebase para usar Clerk
 */
export const updateFirebaseQueriesToClerk = () => {
  console.log('🔄 [MIGRATION] Actualizando queries de Firebase para usar Clerk...');
  
  // Limpiar localStorage de Firebase
  const firebaseKeys = [
    'firebase_user_id',
    'owlFenceProjects',
    'firebase_auth_state'
  ];
  
  firebaseKeys.forEach(key => {
    if (localStorage.getItem(key)) {
      console.log(`🧹 [MIGRATION] Limpiando localStorage: ${key}`);
      localStorage.removeItem(key);
    }
  });
  
  console.log('✅ [MIGRATION] Cleanup de localStorage completado');
};

/**
 * Migrar datos locales de desarrollo
 */
export const migrateLocalStorageData = (clerkUserId: string) => {
  console.log('🔄 [MIGRATION] Migrando datos de localStorage...');
  
  try {
    // Migrar proyectos almacenados localmente
    const localProjects = localStorage.getItem('owlFenceProjects');
    if (localProjects) {
      const projects = JSON.parse(localProjects);
      
      // Actualizar proyectos para usar Clerk
      const updatedProjects = projects.map((project: any) => ({
        ...project,
        clerkUserId: clerkUserId,
        firebaseUserId: project.firebaseUserId || null, // Backup
        migratedAt: new Date().toISOString(),
        migrationSource: 'localStorage-to-clerk'
      }));
      
      // Guardar proyectos actualizados
      localStorage.setItem('owlFenceProjects', JSON.stringify(updatedProjects));
      console.log(`✅ [MIGRATION] ${updatedProjects.length} proyectos locales migrados`);
    }
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error migrando datos locales:', error);
  }
};

/**
 * Verificar integridad de datos después de migración
 */
export const verifyMigrationIntegrity = async (clerkUserId: string) => {
  console.log('🔍 [MIGRATION] Verificando integridad de datos migrados...');
  
  try {
    const response = await fetch('/api/migration/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clerkUserId
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ [MIGRATION] Verificación de integridad completada:', result.verification);
      return result.verification;
    } else {
      console.error('❌ [MIGRATION] Falló verificación de integridad:', result.message);
      return { success: false, errors: result.errors || [] };
    }
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error en verificación:', error);
    return { success: false, errors: [error instanceof Error ? error.message : String(error)] };
  }
};
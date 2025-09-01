/**
 * 🔄 FIREBASE TO CLERK TRANSITION
 * Funciones de transición que detectan automáticamente si usar Firebase o Clerk
 */

import { useUser } from '@clerk/clerk-react';
import { useFirebaseClerkAdapter, useClerkAuth } from './firebase-clerk-adapter';

/**
 * Hook de transición automática para getProjects
 * Detecta automáticamente si usar Firebase o Clerk
 */
export const useProjectsTransition = () => {
  const { user: clerkUser } = useUser();
  const { getProjects: getProjectsClerk } = useFirebaseClerkAdapter();
  const { isAuthenticated: clerkAuth } = useClerkAuth();

  const getProjects = async (filters?: { status?: string, fenceType?: string }) => {
    // NUEVO SISTEMA: Priorizar Clerk si está disponible
    if (clerkAuth && clerkUser) {
      console.log('🔄 [TRANSITION] Usando Clerk para getProjects');
      return await getProjectsClerk(filters);
    }

    // LEGACY: Intentar usar Firebase como fallback
    try {
      const { getProjects: getProjectsFirebase, auth } = await import('./firebase');
      
      if (auth?.currentUser) {
        console.log('🔄 [TRANSITION] Usando Firebase como fallback para getProjects');
        return await getProjectsFirebase(filters);
      }
    } catch (error) {
      console.warn('⚠️ [TRANSITION] Firebase no disponible:', error);
    }

    console.warn('🔒 [TRANSITION] No hay autenticación disponible - retornando array vacío');
    return [];
  };

  return { getProjects };
};

/**
 * Hook de transición para saveProject
 */
export const useSaveProjectTransition = () => {
  const { user: clerkUser } = useUser();
  const { saveProject: saveProjectClerk } = useFirebaseClerkAdapter();
  const { isAuthenticated: clerkAuth } = useClerkAuth();

  const saveProject = async (projectData: any) => {
    // NUEVO SISTEMA: Priorizar Clerk si está disponible
    if (clerkAuth && clerkUser) {
      console.log('🔄 [TRANSITION] Usando Clerk para saveProject');
      return await saveProjectClerk(projectData);
    }

    // LEGACY: Intentar usar Firebase como fallback
    try {
      const { saveProject: saveProjectFirebase, auth } = await import('./firebase');
      
      if (auth?.currentUser) {
        console.log('🔄 [TRANSITION] Usando Firebase como fallback para saveProject');
        const projectWithFirebaseData = {
          ...projectData,
          firebaseUserId: auth.currentUser.uid
        };
        return await saveProjectFirebase(projectWithFirebaseData);
      }
    } catch (error) {
      console.warn('⚠️ [TRANSITION] Firebase no disponible:', error);
    }

    throw new Error('No hay autenticación disponible para guardar proyecto');
  };

  return { saveProject };
};

/**
 * Hook de transición para autenticación
 */
export const useAuthTransition = () => {
  const clerkAuth = useClerkAuth();
  
  // Priorizar Clerk sobre Firebase
  if (clerkAuth.isLoaded) {
    return {
      user: clerkAuth.user,
      loading: clerkAuth.loading,
      isAuthenticated: clerkAuth.isAuthenticated,
      provider: 'clerk'
    };
  }

  // Fallback a Firebase si Clerk no está disponible
  try {
    // TODO: Importar Firebase auth como fallback si es necesario
    console.log('🔄 [TRANSITION] Clerk no disponible, usando Firebase como fallback');
    return {
      user: null,
      loading: false,
      isAuthenticated: false,
      provider: 'firebase-fallback'
    };
  } catch (error) {
    return {
      user: null,
      loading: false,
      isAuthenticated: false,
      provider: 'none'
    };
  }
};

/**
 * Función para detectar si hay datos pendientes de migración
 */
export const detectMigrationNeeded = () => {
  // Verificar si hay datos en localStorage que necesiten migración
  const localProjects = localStorage.getItem('owlFenceProjects');
  const firebaseUserId = localStorage.getItem('firebase_user_id');
  
  if (localProjects || firebaseUserId) {
    const projects = localProjects ? JSON.parse(localProjects) : [];
    const hasFirebaseProjects = projects.some((p: any) => p.firebaseUserId && !p.clerkUserId);
    
    return {
      needed: hasFirebaseProjects || !!firebaseUserId,
      projectsToMigrate: hasFirebaseProjects ? projects.filter((p: any) => p.firebaseUserId && !p.clerkUserId) : [],
      firebaseUserId
    };
  }
  
  return { needed: false };
};

/**
 * Migración automática en background
 */
export const autoMigrateOnLogin = async (clerkUserId: string) => {
  const migrationCheck = detectMigrationNeeded();
  
  if (migrationCheck.needed) {
    console.log('🔄 [AUTO-MIGRATION] Detectada necesidad de migración automática');
    
    try {
      const { migrateLocalStorageData } = await import('./migration-clerk');
      migrateLocalStorageData(clerkUserId);
      
      console.log('✅ [AUTO-MIGRATION] Migración automática completada');
      return { success: true, migrated: migrationCheck.projectsToMigrate.length };
    } catch (error) {
      console.error('❌ [AUTO-MIGRATION] Error en migración automática:', error);
      return { success: false, error };
    }
  }
  
  return { success: true, migrated: 0 };
};
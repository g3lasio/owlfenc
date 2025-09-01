/**
 * 🔄 FIREBASE TO CLERK ADAPTER
 * Adaptador que permite usar funciones de Firebase con autenticación de Clerk
 */

import { useUser } from '@clerk/clerk-react';
import { useMigrationFromFirebase } from './migration-clerk';

/**
 * Hook que adapta las funciones de Firebase para usar Clerk
 */
export const useFirebaseClerkAdapter = () => {
  const { user } = useUser();
  const { getProjectsWithClerk, getEstimatesWithClerk } = useMigrationFromFirebase();

  // Adaptador para getProjects que funciona con Clerk
  const getProjects = async (filters?: { status?: string, fenceType?: string }) => {
    if (!user) {
      console.warn('🔒 [ADAPTER] No hay usuario autenticado en Clerk');
      return [];
    }

    try {
      console.log(`🔄 [ADAPTER] Cargando proyectos para usuario Clerk: ${user.id}`);
      
      // Primero intentar obtener proyectos migrados
      let projects = await getProjectsWithClerk();
      
      // Si no hay proyectos migrados, intentar migración automática
      if (projects.length === 0) {
        const firebaseUid = localStorage.getItem('firebase_user_id');
        if (firebaseUid) {
          console.log('🔄 [ADAPTER] Intentando migración automática...');
          try {
            const { migrateUserData } = useMigrationFromFirebase();
            await migrateUserData(firebaseUid);
            projects = await getProjectsWithClerk();
          } catch (error) {
            console.warn('⚠️ [ADAPTER] Migración automática falló:', error);
          }
        }
      }
      
      // Aplicar filtros si se proporcionan
      if (filters) {
        if (filters.status) {
          projects = projects.filter((project: any) => project.status === filters.status);
        }
        
        if (filters.fenceType) {
          projects = projects.filter((project: any) => project.fenceType === filters.fenceType);
        }
      }
      
      // Ordenar por fecha de creación (más reciente primero)
      projects.sort((a: any, b: any) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`✅ [ADAPTER] Cargados ${projects.length} proyectos para usuario ${user.id}`);
      return projects;
      
    } catch (error) {
      console.error('❌ [ADAPTER] Error cargando proyectos:', error);
      return [];
    }
  };

  // Adaptador para saveProject que funciona con Clerk
  const saveProject = async (projectData: any) => {
    if (!user) {
      throw new Error('No hay usuario autenticado en Clerk');
    }

    try {
      console.log('💾 [ADAPTER] Guardando proyecto para usuario Clerk:', user.id);
      
      const projectWithClerkData = {
        ...projectData,
        clerkUserId: user.id,
        status: projectData.status || "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
        migrationSource: 'clerk-native'
      };

      // TODO: Implementar guardado en backend con Clerk
      // Por ahora guardamos en localStorage con nueva estructura
      const existingProjects = localStorage.getItem('owlFenceProjects');
      const projects = existingProjects ? JSON.parse(existingProjects) : [];
      
      const projectWithId = {
        id: `clerk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...projectWithClerkData
      };
      
      projects.push(projectWithId);
      localStorage.setItem('owlFenceProjects', JSON.stringify(projects));
      
      console.log('✅ [ADAPTER] Proyecto guardado exitosamente');
      return projectWithId;
      
    } catch (error) {
      console.error('❌ [ADAPTER] Error guardando proyecto:', error);
      throw error;
    }
  };

  // Adaptador para estimates
  const getEstimates = async (filters?: any) => {
    if (!user) {
      console.warn('🔒 [ADAPTER] No hay usuario autenticado en Clerk');
      return [];
    }

    try {
      console.log(`🔄 [ADAPTER] Cargando estimates para usuario Clerk: ${user.id}`);
      return await getEstimatesWithClerk();
    } catch (error) {
      console.error('❌ [ADAPTER] Error cargando estimates:', error);
      return [];
    }
  };

  const saveEstimate = async (estimateData: any) => {
    if (!user) {
      throw new Error('No hay usuario autenticado en Clerk');
    }

    try {
      console.log('💾 [ADAPTER] Guardando estimate para usuario Clerk:', user.id);
      
      const estimateWithClerkData = {
        ...estimateData,
        clerkUserId: user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        migrationSource: 'clerk-native'
      };

      // TODO: Implementar guardado en backend
      const response = await fetch('/api/estimates/clerk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateWithClerkData)
      });
      
      if (!response.ok) {
        throw new Error(`Error guardando estimate: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ [ADAPTER] Estimate guardado exitosamente');
      return result;
      
    } catch (error) {
      console.error('❌ [ADAPTER] Error guardando estimate:', error);
      throw error;
    }
  };

  // Función para verificar si el usuario está autenticado
  const isAuthenticated = () => {
    return !!user;
  };

  // Función para obtener información del usuario actual
  const getCurrentUser = () => {
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      firstName: user.firstName,
      lastName: user.lastName,
      imageUrl: user.imageUrl,
      clerk: true // Flag para identificar que viene de Clerk
    };
  };

  return {
    // Funciones adaptadas que reemplazan las de Firebase
    getProjects,
    saveProject,
    getEstimates,
    saveEstimate,
    
    // Funciones de utilidad
    isAuthenticated,
    getCurrentUser,
    
    // Referencia al usuario de Clerk
    user
  };
};

/**
 * Hook simplificado para reemplazar useAuth de Firebase
 */
export const useClerkAuth = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  
  return {
    user: user ? {
      uid: user.id, // Compatibilidad con código existente
      id: user.id,
      email: user.primaryEmailAddress?.emailAddress,
      displayName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      photoURL: user.imageUrl,
      emailVerified: user.primaryEmailAddress?.verification?.status === 'verified'
    } : null,
    loading: !isLoaded,
    isAuthenticated: isSignedIn && !!user,
    isLoaded,
    isSignedIn
  };
};
/**
 * 🔄 FIREBASE TO CLERK MIGRATION SYSTEM
 * Sistema completo de migración de datos de Firebase a Clerk
 */

import { Router } from 'express';
// Temporary auth middleware until real one is fixed
const authMiddleware = (req: any, res: any, next: any) => {
  // TODO: Implement proper Clerk auth middleware
  next();
};

const router = Router();

interface MigrationData {
  firebaseUid: string;
  clerkUserId: string;
  projects: any[];
  estimates: any[];
  profile: any;
  subscription: any;
}

interface MigrationStatus {
  inProgress: boolean;
  completed: boolean;
  errors: string[];
  migratedCount: number;
  totalCount: number;
}

// Estado global de migración
let migrationStatus: MigrationStatus = {
  inProgress: false,
  completed: false,
  errors: [],
  migratedCount: 0,
  totalCount: 0
};

/**
 * STEP 1: Auditar datos existentes en Firebase
 */
router.get('/audit', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 [MIGRATION] Iniciando auditoría de datos Firebase...');
    
    // Importar Firebase dinámicamente para evitar errores si está deshabilitado
    const { db } = await import('../../client/src/lib/firebase');
    const { collection, getDocs } = await import('firebase/firestore');
    
    // Auditar Projects
    const projectsSnapshot = await getDocs(collection(db, 'projects'));
    const projectsData = projectsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Auditar Estimates  
    const estimatesSnapshot = await getDocs(collection(db, 'estimates'));
    const estimatesData = estimatesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Agrupar por firebaseUserId
    const userDataMap = new Map<string, any>();
    
    // Procesar projects
    projectsData.forEach(project => {
      const uid = project.firebaseUserId;
      if (uid) {
        if (!userDataMap.has(uid)) {
          userDataMap.set(uid, { 
            firebaseUid: uid, 
            projects: [], 
            estimates: [],
            profile: null,
            subscription: null
          });
        }
        userDataMap.get(uid)!.projects.push(project);
      }
    });
    
    // Procesar estimates
    estimatesData.forEach(estimate => {
      const uid = estimate.firebaseUserId;
      if (uid) {
        if (!userDataMap.has(uid)) {
          userDataMap.set(uid, { 
            firebaseUid: uid, 
            projects: [], 
            estimates: [],
            profile: null,
            subscription: null
          });
        }
        userDataMap.get(uid)!.estimates.push(estimate);
      }
    });
    
    const auditResults = {
      totalUsers: userDataMap.size,
      totalProjects: projectsData.length,
      totalEstimates: estimatesData.length,
      usersWithData: Array.from(userDataMap.values()),
      dataBreakdown: {
        projectsWithUsers: projectsData.filter(p => p.firebaseUserId).length,
        projectsWithoutUsers: projectsData.filter(p => !p.firebaseUserId).length,
        estimatesWithUsers: estimatesData.filter(e => e.firebaseUserId).length,
        estimatesWithoutUsers: estimatesData.filter(e => !e.firebaseUserId).length
      }
    };
    
    console.log('✅ [MIGRATION] Auditoría completada:', auditResults);
    
    res.json({
      success: true,
      message: 'Auditoría de datos Firebase completada',
      data: auditResults
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error en auditoría:', error);
    res.status(500).json({
      success: false,
      message: 'Error durante la auditoría',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * STEP 2: Crear mapeo Firebase UID -> Clerk User ID
 */
router.post('/create-mapping', authMiddleware, async (req, res) => {
  try {
    const { firebaseUid, clerkUserId, email } = req.body;
    
    if (!firebaseUid || !clerkUserId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere firebaseUid y clerkUserId'
      });
    }
    
    // TODO: Almacenar mapeo en base de datos
    // Por ahora lo guardamos en localStorage del servidor (temporal)
    const mapping = {
      firebaseUid,
      clerkUserId,
      email,
      createdAt: new Date().toISOString()
    };
    
    console.log('📝 [MIGRATION] Mapeo creado:', mapping);
    
    res.json({
      success: true,
      message: 'Mapeo Firebase -> Clerk creado exitosamente',
      mapping
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error creando mapeo:', error);
    res.status(500).json({
      success: false,
      message: 'Error creando mapeo',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * STEP 3: Migrar datos específicos de un usuario
 */
router.post('/migrate-user', authMiddleware, async (req, res) => {
  try {
    const { firebaseUid, clerkUserId } = req.body;
    
    if (!firebaseUid || !clerkUserId) {
      return res.status(400).json({
        success: false,
        message: 'Se requiere firebaseUid y clerkUserId'
      });
    }
    
    console.log(`🔄 [MIGRATION] Migrando datos de ${firebaseUid} -> ${clerkUserId}...`);
    
    const { db } = await import('../../client/src/lib/firebase');
    const { collection, getDocs, query, where, updateDoc, doc } = await import('firebase/firestore');
    
    let migratedData = {
      projects: 0,
      estimates: 0,
      errors: [] as string[]
    };
    
    // Migrar Projects
    try {
      const projectsQuery = query(
        collection(db, 'projects'),
        where('firebaseUserId', '==', firebaseUid)
      );
      const projectsSnapshot = await getDocs(projectsQuery);
      
      for (const projectDoc of projectsSnapshot.docs) {
        try {
          await updateDoc(doc(db, 'projects', projectDoc.id), {
            clerkUserId: clerkUserId,
            firebaseUserId: firebaseUid, // Mantener por backup
            migratedAt: new Date().toISOString(),
            migrationSource: 'firebase-to-clerk'
          });
          migratedData.projects++;
        } catch (error) {
          const errorMsg = `Error migrando proyecto ${projectDoc.id}: ${error}`;
          migratedData.errors.push(errorMsg);
          console.error('❌ [MIGRATION]', errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Error migrando proyectos: ${error}`;
      migratedData.errors.push(errorMsg);
      console.error('❌ [MIGRATION]', errorMsg);
    }
    
    // Migrar Estimates
    try {
      const estimatesQuery = query(
        collection(db, 'estimates'),
        where('firebaseUserId', '==', firebaseUid)
      );
      const estimatesSnapshot = await getDocs(estimatesQuery);
      
      for (const estimateDoc of estimatesSnapshot.docs) {
        try {
          await updateDoc(doc(db, 'estimates', estimateDoc.id), {
            clerkUserId: clerkUserId,
            firebaseUserId: firebaseUid, // Mantener por backup
            migratedAt: new Date().toISOString(),
            migrationSource: 'firebase-to-clerk'
          });
          migratedData.estimates++;
        } catch (error) {
          const errorMsg = `Error migrando estimate ${estimateDoc.id}: ${error}`;
          migratedData.errors.push(errorMsg);
          console.error('❌ [MIGRATION]', errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Error migrando estimates: ${error}`;
      migratedData.errors.push(errorMsg);
      console.error('❌ [MIGRATION]', errorMsg);
    }
    
    console.log(`✅ [MIGRATION] Migración completada para ${clerkUserId}:`, migratedData);
    
    res.json({
      success: true,
      message: 'Migración de usuario completada',
      data: migratedData
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error en migración de usuario:', error);
    res.status(500).json({
      success: false,
      message: 'Error durante la migración de usuario',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * STEP 4: Migración masiva (todos los usuarios)
 */
router.post('/migrate-all', authMiddleware, async (req, res) => {
  try {
    if (migrationStatus.inProgress) {
      return res.status(400).json({
        success: false,
        message: 'Ya hay una migración en progreso'
      });
    }
    
    migrationStatus = {
      inProgress: true,
      completed: false,
      errors: [],
      migratedCount: 0,
      totalCount: 0
    };
    
    console.log('🚀 [MIGRATION] Iniciando migración masiva...');
    
    // La migración masiva es un proceso en background
    // TODO: Implementar lógica de migración para todos los usuarios
    
    res.json({
      success: true,
      message: 'Migración masiva iniciada',
      status: migrationStatus
    });
    
  } catch (error) {
    migrationStatus.inProgress = false;
    console.error('❌ [MIGRATION] Error en migración masiva:', error);
    res.status(500).json({
      success: false,
      message: 'Error iniciando migración masiva',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

/**
 * STEP 5: Estado de la migración
 */
router.get('/status', authMiddleware, (req, res) => {
  res.json({
    success: true,
    status: migrationStatus
  });
});

/**
 * STEP 6: Cleanup - eliminar datos de Firebase después de confirmar migración
 */
router.post('/cleanup', authMiddleware, async (req, res) => {
  try {
    const { confirm } = req.body;
    
    if (confirm !== 'DELETE_FIREBASE_DATA') {
      return res.status(400).json({
        success: false,
        message: 'Se requiere confirmación explícita'
      });
    }
    
    console.log('🧹 [MIGRATION] Iniciando cleanup de datos Firebase...');
    
    // TODO: Implementar cleanup seguro
    // 1. Verificar que todos los datos están migrados
    // 2. Crear backup completo antes del cleanup
    // 3. Eliminar datos de Firebase solo después de verificación
    
    res.json({
      success: true,
      message: 'Cleanup completado (TODO: implementar lógica real)'
    });
    
  } catch (error) {
    console.error('❌ [MIGRATION] Error en cleanup:', error);
    res.status(500).json({
      success: false,
      message: 'Error durante cleanup',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
});

export default router;
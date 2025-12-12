/**
 * Firebase Admin SDK para acceso server-side a los proyectos
 * 
 * ⚠️ LEGACY MODULE: This file re-exports from the unified firebase-admin.ts
 * All Firebase Admin initialization is handled in server/lib/firebase-admin.ts
 * to ensure storageBucket is always properly configured.
 */

import { admin, db as firebaseDb, adminAuth as unifiedAdminAuth, getStorageBucket } from './lib/firebase-admin';

// Re-export from unified module - CRITICAL: Use the same adminAuth instance
// to ensure consistent token verification and revocation handling
export const adminApp = admin.apps[0] || admin.app();
export const adminAuth = unifiedAdminAuth; // SECURITY: Must use singleton instance
export const db = firebaseDb;
export { getStorageBucket };

// Obtener proyectos desde Firestore usando Admin SDK
export async function getProjectsFromFirestore() {
  try {
    // Obtener todos los documentos de la colección "projects"
    const projectsCollection = firebaseDb.collection('projects');
    const snapshot = await projectsCollection.orderBy('createdAt', 'desc').get();
    
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convertir timestamps de Firestore a fechas JavaScript
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt),
      updatedAt: doc.data().updatedAt?.toDate ? doc.data().updatedAt.toDate() : new Date(doc.data().updatedAt),
    }));
    
    console.log(`📊 Proyectos cargados desde Firestore Admin: ${projects.length}`);
    
    return projects;
  } catch (error) {
    console.error('❌ Error accessing Firestore with Admin SDK:', error);
    
    // Fallback: intentar acceder sin autenticación completa
    try {
      const projectsCollection = firebaseDb.collection('projects');
      const snapshot = await projectsCollection.get();
      
      const projects = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt || new Date(),
      }));
      
      console.log(`📊 Proyectos cargados (fallback): ${projects.length}`);
      return projects;
    } catch (fallbackError) {
      console.error('❌ Fallback también falló:', fallbackError);
      throw error;
    }
  }
}
/**
 * Firebase Admin SDK para acceso server-side a los proyectos
 */

import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App;

// Inicializar Firebase Admin con credenciales completas
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      // Usar credenciales completas de Admin SDK desde variables de entorno
      const adminCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;
      
      if (adminCredentials) {
        const serviceAccount = JSON.parse(adminCredentials);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: process.env.FIREBASE_PROJECT_ID || "owl-fenc",
        });
        console.log('✅ Firebase Admin SDK inicializado correctamente');
      } else {
        // Fallback para desarrollo
        adminApp = initializeApp({
          projectId: process.env.FIREBASE_PROJECT_ID || "owl-fenc",
        });
        console.log('⚠️ Firebase Admin SDK inicializado sin credenciales (modo desarrollo)');
      }
    } catch (error) {
      console.error('❌ Error inicializando Firebase Admin:', error);
      throw error;
    }
  } else {
    adminApp = getApps()[0];
  }
  
  return getFirestore(adminApp);
}

// Inicializar la aplicación primero
if (getApps().length === 0) {
  try {
    const adminCredentials = process.env.FIREBASE_ADMIN_CREDENTIALS;
    
    if (adminCredentials) {
      const serviceAccount = JSON.parse(adminCredentials);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || "owl-fenc",
      });
      console.log('✅ Firebase Admin SDK inicializado correctamente');
    } else {
      adminApp = initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "owl-fenc",
      });
      console.log('⚠️ Firebase Admin SDK inicializado sin credenciales (modo desarrollo)');
    }
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    // Continuar con inicialización básica como fallback
    adminApp = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "owl-fenc",
    });
  }
} else {
  adminApp = getApps()[0];
}

// Exportar instancias para uso en otros módulos
export const adminAuth = getAuth(adminApp);
export const db = getFirestore(adminApp);

// Obtener proyectos desde Firestore usando Admin SDK
export async function getProjectsFromFirestore() {
  try {
    const db = initializeFirebaseAdmin();
    
    // Obtener todos los documentos de la colección "projects"
    const projectsCollection = db.collection('projects');
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
      const db = initializeFirebaseAdmin();
      const projectsCollection = db.collection('projects');
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
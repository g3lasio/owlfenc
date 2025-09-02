/**
 * 🔥 FIREBASE PRIMARY DATABASE CONFIGURATION
 * 
 * Firebase as the main database for user data, projects, estimates, etc.
 * Integrated with Clerk authentication
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableNetwork } from 'firebase/firestore';

console.log('🔥 [FIREBASE-PRIMARY] Inicializando Firebase como base de datos principal');

// Firebase config with provided secrets
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "123456789", // Will be auto-configured
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('🔥 [FIREBASE-CONFIG] Project ID:', firebaseConfig.projectId);
console.log('🔥 [FIREBASE-CONFIG] App ID:', firebaseConfig.appId?.substring(0, 20) + '...');

// Initialize Firebase as primary database (with duplicate protection)
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log('✅ [FIREBASE] App initialized successfully');
} catch (error: any) {
  if (error.code === 'app/duplicate-app') {
    console.log('🔄 [FIREBASE] Using existing app instance');
    const { getApps, getApp } = require('firebase/app');
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  } else {
    console.error('❌ [FIREBASE] Initialization error:', error);
    throw error;
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable network for Firestore
enableNetwork(db).catch(() => console.log('🔄 [FIREBASE] Network already enabled'));

// 🔥 FIREBASE PRIMARY DATABASE FUNCTIONS

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  addDoc,
  limit
} from 'firebase/firestore';

// User Profile Management
export const getUserProfile = async (uid: string) => {
  try {
    console.log('🔥 [FIREBASE] Getting user profile for:', uid);
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (userDoc.exists()) {
      console.log('✅ [FIREBASE] User profile found');
      return { id: userDoc.id, ...userDoc.data() };
    } else {
      console.log('⚠️ [FIREBASE] User profile not found');
      return null;
    }
  } catch (error) {
    console.error('❌ [FIREBASE] Error getting user profile:', error);
    return null;
  }
};

export const saveUserProfile = async (uid: string, profile: any) => {
  try {
    console.log('🔥 [FIREBASE] Saving user profile for:', uid);
    const userRef = doc(db, 'users', uid);
    
    const profileData = {
      ...profile,
      updatedAt: serverTimestamp(),
      createdAt: profile.createdAt || serverTimestamp()
    };
    
    await setDoc(userRef, profileData, { merge: true });
    console.log('✅ [FIREBASE] User profile saved successfully');
    return { success: true, message: 'Profile saved successfully' };
  } catch (error) {
    console.error('❌ [FIREBASE] Error saving user profile:', error);
    return { success: false, message: 'Error saving profile' };
  }
};

// Projects Management
export const getProjects = async (uid: string) => {
  try {
    console.log('🔥 [FIREBASE] Getting projects for user:', uid);
    const projectsQuery = query(
      collection(db, 'projects'), 
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(projectsQuery);
    const projects = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ [FIREBASE] Found ${projects.length} projects`);
    return projects;
  } catch (error) {
    console.error('❌ [FIREBASE] Error getting projects:', error);
    return [];
  }
};

export const createProject = async (uid: string, projectData: any) => {
  try {
    console.log('🔥 [FIREBASE] Creating project for user:', uid);
    const projectRef = collection(db, 'projects');
    
    const newProject = {
      ...projectData,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(projectRef, newProject);
    console.log('✅ [FIREBASE] Project created with ID:', docRef.id);
    return { success: true, projectId: docRef.id };
  } catch (error) {
    console.error('❌ [FIREBASE] Error creating project:', error);
    return { success: false, message: 'Error creating project' };
  }
};

export const updateProject = async (projectId: string, data: any) => {
  try {
    console.log('🔥 [FIREBASE] Updating project:', projectId);
    const projectRef = doc(db, 'projects', projectId);
    
    await updateDoc(projectRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ [FIREBASE] Project updated successfully');
    return { success: true, message: 'Project updated successfully' };
  } catch (error) {
    console.error('❌ [FIREBASE] Error updating project:', error);
    return { success: false, message: 'Error updating project' };
  }
};

// Estimates Management
export const getEstimates = async (uid: string) => {
  try {
    console.log('🔥 [FIREBASE] Getting estimates for user:', uid);
    const estimatesQuery = query(
      collection(db, 'estimates'), 
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(estimatesQuery);
    const estimates = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ [FIREBASE] Found ${estimates.length} estimates`);
    return estimates;
  } catch (error) {
    console.error('❌ [FIREBASE] Error getting estimates:', error);
    return [];
  }
};

export const getEstimateById = async (estimateId: string) => {
  try {
    console.log('🔥 [FIREBASE] Getting estimate by ID:', estimateId);
    const estimateDoc = await getDoc(doc(db, 'estimates', estimateId));
    
    if (estimateDoc.exists()) {
      console.log('✅ [FIREBASE] Estimate found');
      return { id: estimateDoc.id, ...estimateDoc.data() };
    } else {
      console.log('⚠️ [FIREBASE] Estimate not found');
      return null;
    }
  } catch (error) {
    console.error('❌ [FIREBASE] Error getting estimate:', error);
    return null;
  }
};

export const saveEstimate = async (uid: string, estimateData: any) => {
  try {
    console.log('🔥 [FIREBASE] Saving estimate for user:', uid);
    const estimateRef = collection(db, 'estimates');
    
    const newEstimate = {
      ...estimateData,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(estimateRef, newEstimate);
    console.log('✅ [FIREBASE] Estimate saved with ID:', docRef.id);
    return { success: true, estimateId: docRef.id };
  } catch (error) {
    console.error('❌ [FIREBASE] Error saving estimate:', error);
    return { success: false, message: 'Error saving estimate' };
  }
};

// Templates Management
export const getTemplates = async () => {
  try {
    console.log('🔥 [FIREBASE] Getting templates');
    const templatesQuery = query(collection(db, 'templates'), limit(50));
    const querySnapshot = await getDocs(templatesQuery);
    
    const templates = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ [FIREBASE] Found ${templates.length} templates`);
    return templates;
  } catch (error) {
    console.error('❌ [FIREBASE] Error getting templates:', error);
    return [];
  }
};

// Additional Firebase exports for compatibility
export { app };
export default app;
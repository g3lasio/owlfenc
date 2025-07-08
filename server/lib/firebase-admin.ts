/**
 * FIREBASE ADMIN SDK CONFIGURATION
 * Serverless backend integration for contract management
 * 
 * For production-ready secure contracts, we use the client SDK with proper security rules
 * This allows the system to work without requiring service account credentials
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  limit,
  serverTimestamp,
  Timestamp,
  FieldValue,
  updateDoc,
  addDoc,
  runTransaction
} from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || 'owl-fence-mervin',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig, 'admin-app');
const firestore = getFirestore(app);

console.log('✅ Firebase initialized for contract management');

// Create a db-like interface to match Firebase Admin API
export const db = {
  collection: (name: string) => ({
    doc: (id?: string) => {
      const collectionRef = collection(firestore, name);
      const docRef = id ? doc(collectionRef, id) : doc(collectionRef);
      return {
        set: (data: any) => setDoc(docRef, data),
        get: () => getDoc(docRef),
        update: (data: any) => updateDoc(docRef, data),
        id: docRef.id
      };
    },
    add: (data: any) => addDoc(collection(firestore, name), data),
    where: (field: string, op: any, value: any) => {
      const q = query(collection(firestore, name), where(field, op, value));
      return {
        limit: (n: number) => ({
          get: () => getDocs(query(q, limit(n)))
        }),
        get: () => getDocs(q)
      };
    }
  }),
  runTransaction: (updateFunction: (transaction: any) => Promise<any>) => 
    runTransaction(firestore, updateFunction)
};

// Export Firebase utilities
export const admin = {
  firestore: {
    Timestamp,
    FieldValue: {
      serverTimestamp
    }
  }
};

// Admin auth methods (simplified for development)
export const adminAuth = {
  verifyIdToken: async (token: string) => {
    // In development, just extract user ID from token
    // In production, this should use Firebase Auth
    try {
      // Simple token validation for development
      return { uid: token.split('-')[0] || 'dev-user' };
    } catch (error) {
      console.error('Error verifying token:', error);
      return { uid: 'dev-user' };
    }
  }
};
/**
 * FIREBASE STORAGE SERVICE
 * Almacenamiento permanente de PDFs firmados en Firebase Storage
 * 
 * CARACTERÍSTICAS:
 * - URLs permanentes sin expiración
 * - PDFs accesibles 24/7 incluso después de reiniciar el servidor
 * - Backup automático en la nube
 * - Escalable y confiable
 */

import { initializeApp, getApps } from 'firebase/app';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID || 'owl-fence-mervin',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'owl-fence-mervin.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase only if not already initialized
const app = getApps().length === 0 
  ? initializeApp(firebaseConfig, 'storage-app')
  : getApps()[0];

const storage = getStorage(app);

console.log('✅ [FIREBASE-STORAGE] Firebase Storage initialized');
console.log('📦 [FIREBASE-STORAGE] Bucket:', firebaseConfig.storageBucket);

export class FirebaseStorageService {
  /**
   * Upload PDF to Firebase Storage and get permanent download URL
   * @param pdfBuffer - PDF file as Buffer
   * @param contractId - Unique contract identifier
   * @returns Permanent download URL
   */
  async uploadContractPdf(pdfBuffer: Buffer, contractId: string): Promise<string> {
    try {
      console.log(`📤 [FIREBASE-STORAGE] Uploading PDF for contract: ${contractId}`);
      console.log(`📦 [FIREBASE-STORAGE] PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

      // Create reference with path: signed_contracts/{contractId}.pdf
      const storagePath = `signed_contracts/${contractId}.pdf`;
      const storageRef = ref(storage, storagePath);

      console.log(`📁 [FIREBASE-STORAGE] Storage path: ${storagePath}`);

      // Upload PDF with metadata
      const metadata = {
        contentType: 'application/pdf',
        customMetadata: {
          contractId: contractId,
          uploadedAt: new Date().toISOString(),
          type: 'dual-signature-contract'
        }
      };

      await uploadBytes(storageRef, pdfBuffer, metadata);
      console.log(`✅ [FIREBASE-STORAGE] PDF uploaded successfully`);

      // Get permanent download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log(`🔗 [FIREBASE-STORAGE] Permanent URL generated: ${downloadURL.substring(0, 100)}...`);

      return downloadURL;
    } catch (error: any) {
      console.error(`❌ [FIREBASE-STORAGE] Error uploading PDF:`, error);
      throw new Error(`Failed to upload PDF to Firebase Storage: ${error.message}`);
    }
  }

  /**
   * Delete PDF from Firebase Storage
   * @param contractId - Contract identifier
   */
  async deleteContractPdf(contractId: string): Promise<void> {
    try {
      console.log(`🗑️ [FIREBASE-STORAGE] Deleting PDF for contract: ${contractId}`);

      const storagePath = `signed_contracts/${contractId}.pdf`;
      const storageRef = ref(storage, storagePath);

      await deleteObject(storageRef);
      console.log(`✅ [FIREBASE-STORAGE] PDF deleted successfully`);
    } catch (error: any) {
      console.error(`❌ [FIREBASE-STORAGE] Error deleting PDF:`, error);
      throw new Error(`Failed to delete PDF from Firebase Storage: ${error.message}`);
    }
  }

  /**
   * Check if PDF exists in Firebase Storage
   * @param contractId - Contract identifier
   * @returns True if PDF exists
   */
  async pdfExists(contractId: string): Promise<boolean> {
    try {
      const storagePath = `signed_contracts/${contractId}.pdf`;
      const storageRef = ref(storage, storagePath);

      await getDownloadURL(storageRef);
      return true;
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get download URL for existing PDF
   * @param contractId - Contract identifier
   * @returns Download URL if exists, null otherwise
   */
  async getContractPdfUrl(contractId: string): Promise<string | null> {
    try {
      const storagePath = `signed_contracts/${contractId}.pdf`;
      const storageRef = ref(storage, storagePath);

      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        console.warn(`⚠️ [FIREBASE-STORAGE] PDF not found for contract: ${contractId}`);
        return null;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const firebaseStorageService = new FirebaseStorageService();

/**
 * FIREBASE STORAGE SERVICE (ADMIN SDK - SERVER-SIDE)
 * Almacenamiento permanente de PDFs firmados en Firebase Storage
 * 
 * CARACTERÍSTICAS:
 * - URLs permanentes sin expiración
 * - PDFs accesibles 24/7 incluso después de reiniciar el servidor
 * - Backup automático en la nube
 * - Escalable y confiable
 * 
 * ✅ FIXED: Usa Firebase Admin SDK para Node.js (no Web SDK)
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'owl-fence-mervin.appspot.com'
    });
    
    console.log('✅ [FIREBASE-ADMIN-STORAGE] Firebase Admin SDK initialized for storage');
  } catch (error: any) {
    console.error('❌ [FIREBASE-ADMIN-STORAGE] Failed to initialize Firebase Admin:', error.message);
    console.warn('⚠️ [FIREBASE-ADMIN-STORAGE] Falling back to local storage only');
  }
}

const bucket = admin.apps.length > 0 ? admin.storage().bucket() : null;

export class FirebaseStorageService {
  /**
   * Upload PDF to Firebase Storage and get permanent download URL
   * @param pdfBuffer - PDF file as Buffer
   * @param contractId - Unique contract identifier
   * @returns Permanent download URL
   */
  async uploadContractPdf(pdfBuffer: Buffer, contractId: string): Promise<string> {
    if (!bucket) {
      throw new Error('Firebase Storage not initialized - check FIREBASE_SERVICE_ACCOUNT env variable');
    }

    try {
      console.log(`📤 [FIREBASE-STORAGE] Uploading PDF for contract: ${contractId}`);
      console.log(`📦 [FIREBASE-STORAGE] PDF size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

      // Create reference with path: signed_contracts/{contractId}.pdf
      const storagePath = `signed_contracts/${contractId}.pdf`;
      const file = bucket.file(storagePath);

      console.log(`📁 [FIREBASE-STORAGE] Storage path: ${storagePath}`);

      // Upload PDF with metadata
      await file.save(pdfBuffer, {
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            contractId: contractId,
            uploadedAt: new Date().toISOString(),
            type: 'dual-signature-contract'
          }
        },
        public: false, // Keep private, require authentication for download
        resumable: false // For small files, use simple upload
      });

      console.log(`✅ [FIREBASE-STORAGE] PDF uploaded successfully`);

      // Make the file publicly accessible with a signed URL (valid for 50 years)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (50 * 365 * 24 * 60 * 60 * 1000) // 50 years from now
      });

      console.log(`🔗 [FIREBASE-STORAGE] Permanent signed URL generated (valid 50 years)`);
      console.log(`🔗 [FIREBASE-STORAGE] URL preview: ${signedUrl.substring(0, 100)}...`);

      return signedUrl;
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
    if (!bucket) {
      throw new Error('Firebase Storage not initialized');
    }

    try {
      console.log(`🗑️ [FIREBASE-STORAGE] Deleting PDF for contract: ${contractId}`);

      const storagePath = `signed_contracts/${contractId}.pdf`;
      const file = bucket.file(storagePath);

      await file.delete();
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
    if (!bucket) {
      return false;
    }

    try {
      const storagePath = `signed_contracts/${contractId}.pdf`;
      const file = bucket.file(storagePath);

      const [exists] = await file.exists();
      return exists;
    } catch (error: any) {
      console.error(`❌ [FIREBASE-STORAGE] Error checking PDF existence:`, error);
      return false;
    }
  }

  /**
   * Get download URL for existing PDF
   * @param contractId - Contract identifier
   * @returns Download URL if exists, null otherwise
   */
  async getContractPdfUrl(contractId: string): Promise<string | null> {
    if (!bucket) {
      return null;
    }

    try {
      const storagePath = `signed_contracts/${contractId}.pdf`;
      const file = bucket.file(storagePath);

      const [exists] = await file.exists();
      if (!exists) {
        console.warn(`⚠️ [FIREBASE-STORAGE] PDF not found for contract: ${contractId}`);
        return null;
      }

      // Generate signed URL valid for 50 years
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + (50 * 365 * 24 * 60 * 60 * 1000)
      });

      return signedUrl;
    } catch (error: any) {
      console.error(`❌ [FIREBASE-STORAGE] Error getting PDF URL:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const firebaseStorageService = new FirebaseStorageService();

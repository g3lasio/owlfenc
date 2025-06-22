/**
 * Firebase service for managing project documents
 * Handles storing and retrieving PDFs, estimates, invoices, and contracts by project
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

export interface ProjectDocument {
  id?: string;
  projectId: string;
  userId: string;
  documentType: 'estimate' | 'invoice' | 'contract';
  documentName: string;
  fileName: string;
  fileSize?: number;
  mimeType: string;
  documentData: string; // Base64 encoded PDF data
  documentNumber?: string; // Estimate number, invoice number, etc.
  status: 'generated' | 'sent' | 'viewed' | 'approved' | 'signed';
  metadata?: {
    clientName?: string;
    totalAmount?: number;
    dueDate?: string;
    version?: number;
    [key: string]: any;
  };
  generatedAt: Timestamp | Date;
  sentAt?: Timestamp | Date;
  viewedAt?: Timestamp | Date;
  approvedAt?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

const COLLECTION_NAME = 'projectDocuments';

/**
 * Save a document to Firebase
 */
export async function saveProjectDocument(documentData: Omit<ProjectDocument, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...documentData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    console.log(`✅ Document saved: ${documentData.documentType} for project ${documentData.projectId}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error saving document:', error);
    throw error;
  }
}

/**
 * Get all documents for a specific project
 */
export async function getProjectDocuments(projectId: string): Promise<ProjectDocument[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: ProjectDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      } as ProjectDocument);
    });
    
    console.log(`📄 Found ${documents.length} documents for project ${projectId}`);
    return documents;
  } catch (error) {
    console.error('❌ Error fetching project documents:', error);
    return [];
  }
}

/**
 * Get documents by type for a specific project
 */
export async function getProjectDocumentsByType(projectId: string, documentType: ProjectDocument['documentType']): Promise<ProjectDocument[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('projectId', '==', projectId),
      where('documentType', '==', documentType),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: ProjectDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      } as ProjectDocument);
    });
    
    return documents;
  } catch (error) {
    console.error(`❌ Error fetching ${documentType} documents:`, error);
    return [];
  }
}

/**
 * Get all documents for a user across all projects
 */
export async function getUserDocuments(userId: string): Promise<ProjectDocument[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const documents: ProjectDocument[] = [];
    
    querySnapshot.forEach((doc) => {
      documents.push({
        id: doc.id,
        ...doc.data()
      } as ProjectDocument);
    });
    
    return documents;
  } catch (error) {
    console.error('❌ Error fetching user documents:', error);
    return [];
  }
}

/**
 * Get a specific document by ID
 */
export async function getProjectDocument(documentId: string): Promise<ProjectDocument | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ProjectDocument;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error fetching document:', error);
    return null;
  }
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  documentId: string, 
  status: ProjectDocument['status'],
  additionalData?: Partial<ProjectDocument>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, documentId);
    const updateData: any = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };
    
    // Add timestamp based on status
    if (status === 'sent') {
      updateData.sentAt = serverTimestamp();
    } else if (status === 'viewed') {
      updateData.viewedAt = serverTimestamp();
    } else if (status === 'approved') {
      updateData.approvedAt = serverTimestamp();
    }
    
    await updateDoc(docRef, updateData);
    console.log(`✅ Document status updated: ${status}`);
  } catch (error) {
    console.error('❌ Error updating document status:', error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteProjectDocument(documentId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, documentId);
    await deleteDoc(docRef);
    console.log(`✅ Document deleted: ${documentId}`);
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    throw error;
  }
}

/**
 * Get document summary statistics for a project
 */
export async function getProjectDocumentSummary(projectId: string): Promise<{
  estimates: number;
  invoices: number;
  contracts: number;
  total: number;
}> {
  try {
    const documents = await getProjectDocuments(projectId);
    
    const summary = {
      estimates: documents.filter(doc => doc.documentType === 'estimate').length,
      invoices: documents.filter(doc => doc.documentType === 'invoice').length,
      contracts: documents.filter(doc => doc.documentType === 'contract').length,
      total: documents.length
    };
    
    return summary;
  } catch (error) {
    console.error('❌ Error getting document summary:', error);
    return { estimates: 0, invoices: 0, contracts: 0, total: 0 };
  }
}

/**
 * Download document as PDF blob
 */
export function downloadDocument(document: ProjectDocument): void {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(document.documentData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: document.mimeType });
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = document.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    console.log(`📥 Downloaded: ${document.fileName}`);
  } catch (error) {
    console.error('❌ Error downloading document:', error);
  }
}

/**
 * View document in new tab
 */
export function viewDocument(document: ProjectDocument): void {
  try {
    // Convert base64 to blob
    const byteCharacters = atob(document.documentData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: document.mimeType });
    
    // Open in new tab
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    
    console.log(`👁️ Viewing: ${document.fileName}`);
  } catch (error) {
    console.error('❌ Error viewing document:', error);
  }
}
/**
 * Utility functions for automatic document storage
 * Automatically saves generated PDFs to Firebase with proper metadata
 */

import { saveProjectDocument, type ProjectDocument } from './projectDocuments';
import { auth } from './firebase';

export interface DocumentStorageData {
  projectId: string;
  documentType: 'estimate' | 'invoice' | 'contract';
  documentName: string;
  fileName: string;
  pdfData: string; // Base64 encoded PDF
  documentNumber?: string;
  metadata?: {
    clientName?: string;
    totalAmount?: number;
    dueDate?: string;
    estimateNumber?: string;
    invoiceNumber?: string;
    contractNumber?: string;
    [key: string]: any;
  };
}

/**
 * Automatically save a generated PDF document to Firebase
 */
export async function autoSaveDocument(data: DocumentStorageData): Promise<string | null> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.warn('No authenticated user for document storage');
      return null;
    }

    // Calculate file size from base64 data
    const fileSize = Math.round((data.pdfData.length * 3) / 4);

    const documentData: Omit<ProjectDocument, 'id' | 'createdAt' | 'updatedAt'> = {
      projectId: data.projectId,
      userId: currentUser.uid,
      documentType: data.documentType,
      documentName: data.documentName,
      fileName: data.fileName,
      fileSize: fileSize,
      mimeType: 'application/pdf',
      documentData: data.pdfData,
      documentNumber: data.documentNumber,
      status: 'generated',
      metadata: data.metadata,
      generatedAt: new Date(),
    };

    const documentId = await saveProjectDocument(documentData);
    console.log(`✅ Auto-saved ${data.documentType}: ${data.fileName} (ID: ${documentId})`);
    
    return documentId;
  } catch (error) {
    console.error('❌ Error auto-saving document:', error);
    return null;
  }
}

/**
 * Generate document name based on type and metadata
 */
export function generateDocumentName(type: 'estimate' | 'invoice' | 'contract', metadata?: any): string {
  const timestamp = new Date().toLocaleDateString('es-ES');
  const clientName = metadata?.clientName || 'Cliente';
  
  switch (type) {
    case 'estimate':
      return `Estimado para ${clientName} - ${timestamp}`;
    case 'invoice':
      return `Factura para ${clientName} - ${timestamp}`;
    case 'contract':
      return `Contrato para ${clientName} - ${timestamp}`;
    default:
      return `Documento para ${clientName} - ${timestamp}`;
  }
}

/**
 * Generate file name based on type and metadata
 */
export function generateFileName(type: 'estimate' | 'invoice' | 'contract', metadata?: any): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const clientName = (metadata?.clientName || 'Cliente').replace(/[^a-zA-Z0-9]/g, '_');
  const number = metadata?.estimateNumber || metadata?.invoiceNumber || metadata?.contractNumber || Date.now();
  
  switch (type) {
    case 'estimate':
      return `estimado_${clientName}_${number}_${timestamp}.pdf`;
    case 'invoice':
      return `factura_${clientName}_${number}_${timestamp}.pdf`;
    case 'contract':
      return `contrato_${clientName}_${number}_${timestamp}.pdf`;
    default:
      return `documento_${clientName}_${number}_${timestamp}.pdf`;
  }
}

/**
 * Extract metadata from estimate data
 */
export function extractEstimateMetadata(estimateData: any): any {
  return {
    clientName: estimateData.client?.name || estimateData.clientName,
    totalAmount: estimateData.total || estimateData.grandTotal || estimateData.totalCost,
    estimateNumber: estimateData.estimateNumber,
    projectType: estimateData.projectType,
    address: estimateData.client?.address || estimateData.address,
    dueDate: estimateData.validUntil,
  };
}

/**
 * Extract metadata from invoice data
 */
export function extractInvoiceMetadata(invoiceData: any): any {
  return {
    clientName: invoiceData.client?.name || invoiceData.clientName,
    totalAmount: invoiceData.invoice?.total || invoiceData.total,
    invoiceNumber: invoiceData.invoice?.number || invoiceData.invoiceNumber,
    dueDate: invoiceData.invoice?.due_date || invoiceData.dueDate,
    projectType: invoiceData.projectType,
    address: invoiceData.client?.address || invoiceData.address,
  };
}

/**
 * Extract metadata from contract data
 */
export function extractContractMetadata(contractData: any): any {
  return {
    clientName: contractData.clientName || contractData.client?.name,
    totalAmount: contractData.totalAmount || contractData.projectValue,
    contractNumber: contractData.contractNumber,
    projectType: contractData.projectType,
    address: contractData.projectLocation || contractData.address,
    startDate: contractData.startDate,
    completionDate: contractData.completionDate,
  };
}
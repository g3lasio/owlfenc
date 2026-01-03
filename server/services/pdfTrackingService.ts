/**
 * PDF TRACKING SERVICE
 * 
 * Tracks all PDFs generated to monitor usage and service costs.
 * Stores logs in Firestore collection: pdf_logs
 */

import { db } from '../firebase';
import { Timestamp } from 'firebase-admin/firestore';

export interface PdfLog {
  userId: string;
  type: 'invoice' | 'estimate' | 'contract' | 'permit_report' | 'other';
  documentId?: string;
  documentNumber?: string;
  generatedAt: Timestamp;
  fileSize?: number; // in bytes
  status: 'generated' | 'failed';
  errorMessage?: string;
  metadata?: {
    clientName?: string;
    projectType?: string;
    [key: string]: any;
  };
}

/**
 * Log a PDF generation
 * @param pdfData PDF details to log
 * @returns Promise<string> Document ID of the log entry
 */
export async function logPdfGenerated(pdfData: Omit<PdfLog, 'generatedAt'>): Promise<string> {
  try {
    const pdfLog: PdfLog = {
      ...pdfData,
      generatedAt: Timestamp.now(),
    };

    const docRef = await db.collection('pdf_logs').add(pdfLog);
    console.log(`[PDF Tracking] Logged PDF: ${pdfData.type} ${pdfData.documentNumber || ''} (${docRef.id})`);
    
    return docRef.id;
  } catch (error) {
    console.error('[PDF Tracking] Error logging PDF:', error);
    throw error;
  }
}

/**
 * Get PDF count for a specific user
 * @param userId Firebase UID
 * @param startDate Optional start date filter
 * @param endDate Optional end date filter
 * @returns Promise<number> Count of PDFs generated
 */
export async function getPdfCount(
  userId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    let query: any = db.collection('pdf_logs');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (startDate) {
      query = query.where('generatedAt', '>=', Timestamp.fromDate(startDate));
    }

    if (endDate) {
      query = query.where('generatedAt', '<=', Timestamp.fromDate(endDate));
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error('[PDF Tracking] Error getting PDF count:', error);
    return 0;
  }
}

/**
 * Get PDFs generated today
 * @returns Promise<number> Count of PDFs generated today
 */
export async function getPdfsGeneratedToday(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await getPdfCount(undefined, today);
}

/**
 * Get PDFs generated this month
 * @returns Promise<number> Count of PDFs generated this month
 */
export async function getPdfsGeneratedThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return await getPdfCount(undefined, monthStart);
}

/**
 * Get total file size of PDFs generated (for storage monitoring)
 * @param startDate Optional start date filter
 * @param endDate Optional end date filter
 * @returns Promise<number> Total file size in bytes
 */
export async function getTotalPdfSize(
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    let query: any = db.collection('pdf_logs').where('status', '==', 'generated');

    if (startDate) {
      query = query.where('generatedAt', '>=', Timestamp.fromDate(startDate));
    }

    if (endDate) {
      query = query.where('generatedAt', '<=', Timestamp.fromDate(endDate));
    }

    const snapshot = await query.get();
    let totalSize = 0;
    
    snapshot.forEach((doc: any) => {
      const data = doc.data();
      if (data.fileSize) {
        totalSize += data.fileSize;
      }
    });

    return totalSize;
  } catch (error) {
    console.error('[PDF Tracking] Error calculating total PDF size:', error);
    return 0;
  }
}

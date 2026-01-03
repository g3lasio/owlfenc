/**
 * EMAIL TRACKING SERVICE
 * 
 * Tracks all emails sent via Resend to monitor usage against daily/monthly limits.
 * Stores logs in Firestore collection: email_logs
 */

import { db } from '../firebase';
import { Timestamp } from 'firebase-admin/firestore';

export interface EmailLog {
  userId: string;
  type: 'invoice' | 'estimate' | 'contract' | 'dual_signature' | 'payment_link' | 'other';
  recipient: string;
  subject: string;
  sentAt: Timestamp;
  status: 'sent' | 'failed';
  errorMessage?: string;
  metadata?: {
    documentId?: string;
    documentNumber?: string;
    [key: string]: any;
  };
}

/**
 * Log an email sent via Resend
 * @param emailData Email details to log
 * @returns Promise<string> Document ID of the log entry
 */
export async function logEmailSent(emailData: Omit<EmailLog, 'sentAt'>): Promise<string> {
  try {
    const emailLog: EmailLog = {
      ...emailData,
      sentAt: Timestamp.now(),
    };

    const docRef = await db.collection('email_logs').add(emailLog);
    console.log(`[Email Tracking] Logged email: ${emailData.type} to ${emailData.recipient} (${docRef.id})`);
    
    return docRef.id;
  } catch (error) {
    console.error('[Email Tracking] Error logging email:', error);
    throw error;
  }
}

/**
 * Get email count for a specific user
 * @param userId Firebase UID
 * @param startDate Optional start date filter
 * @param endDate Optional end date filter
 * @returns Promise<number> Count of emails sent
 */
export async function getEmailCount(
  userId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<number> {
  try {
    let query: any = db.collection('email_logs');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (startDate) {
      query = query.where('sentAt', '>=', Timestamp.fromDate(startDate));
    }

    if (endDate) {
      query = query.where('sentAt', '<=', Timestamp.fromDate(endDate));
    }

    const snapshot = await query.count().get();
    return snapshot.data().count;
  } catch (error) {
    console.error('[Email Tracking] Error getting email count:', error);
    return 0;
  }
}

/**
 * Get emails sent today (for daily limit monitoring)
 * @returns Promise<number> Count of emails sent today
 */
export async function getEmailsSentToday(): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return await getEmailCount(undefined, today);
}

/**
 * Get emails sent this month
 * @returns Promise<number> Count of emails sent this month
 */
export async function getEmailsSentThisMonth(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return await getEmailCount(undefined, monthStart);
}

/**
 * Check if daily email limit is approaching (80% of 500)
 * @returns Promise<boolean> True if approaching limit
 */
export async function isApproachingDailyLimit(): Promise<boolean> {
  const dailyLimit = 500; // Resend free tier limit
  const threshold = dailyLimit * 0.8; // 80% = 400 emails
  
  const sentToday = await getEmailsSentToday();
  return sentToday >= threshold;
}

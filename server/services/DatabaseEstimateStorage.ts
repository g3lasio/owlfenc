import { db } from '../db';
import { estimates, estimateAdjustments, notifications } from '@shared/schema';
import type { Estimate, InsertEstimate, EstimateAdjustment, InsertEstimateAdjustment, Notification, InsertNotification } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Simple UUID generator alternative
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export class DatabaseEstimateStorage {
  
  /**
   * Save estimate to database
   */
  async saveEstimate(estimateData: any): Promise<Estimate> {
    const estimateId = generateId();
    
    const insertData: InsertEstimate = {
      estimateNumber: estimateData.estimateNumber || `EST-${Date.now()}`,
      clientName: estimateData.client.name,
      clientEmail: estimateData.client.email,
      clientPhone: estimateData.client.phone || null,
      clientAddress: estimateData.client.address || null,
      contractorName: estimateData.contractor.name,
      contractorEmail: estimateData.contractor.email,
      contractorCompany: estimateData.contractor.companyName || estimateData.contractor.company || 'N/A',
      contractorPhone: estimateData.contractor.phone || null,
      contractorAddress: estimateData.contractor.address || null,
      projectType: estimateData.project?.type || 'General Construction',
      projectDescription: estimateData.project?.description || null,
      projectLocation: estimateData.project?.location || null,
      scopeOfWork: estimateData.project?.scopeOfWork || null,
      items: estimateData.items,
      subtotal: estimateData.subtotal.toString(),
      tax: (estimateData.tax || 0).toString(),
      taxRate: (estimateData.taxRate || 0).toString(),
      total: estimateData.total.toString(),
      status: 'sent',
      notes: estimateData.notes || null,
      validUntil: estimateData.validUntil ? new Date(estimateData.validUntil) : null,
    };

    try {
      const [result] = await db.insert(estimates).values({
        id: estimateId,
        ...insertData
      }).returning();
      return result;
    } catch (error) {
      console.error('Error saving estimate:', error);
      throw error;
    }
  }

  /**
   * Get estimate by ID
   */
  async getEstimateById(id: string): Promise<Estimate | null> {
    const [result] = await db.select().from(estimates).where(eq(estimates.id, id));
    return result || null;
  }

  /**
   * Get estimate by estimate number
   */
  async getEstimateByNumber(estimateNumber: string): Promise<Estimate | null> {
    const [result] = await db.select().from(estimates).where(eq(estimates.estimateNumber, estimateNumber));
    return result || null;
  }

  /**
   * Update estimate status
   */
  async updateEstimateStatus(estimateId: string, status: string, approverInfo?: any): Promise<boolean> {
    try {
      const updateData: any = {
        status,
        updatedAt: new Date(),
      };

      if (status === 'approved' && approverInfo) {
        updateData.approvedAt = new Date();
        updateData.approverName = approverInfo.clientName;
        updateData.approverSignature = approverInfo.signature;
      }

      await db.update(estimates)
        .set(updateData)
        .where(eq(estimates.id, estimateId));
      
      return true;
    } catch (error) {
      console.error('Error updating estimate status:', error);
      return false;
    }
  }

  /**
   * Save adjustment request
   */
  async saveAdjustmentRequest(adjustmentData: any): Promise<EstimateAdjustment> {
    const adjustmentId = generateId();
    
    try {
      const [result] = await db.insert(estimateAdjustments).values({
        id: adjustmentId,
        estimateId: adjustmentData.estimateId,
        clientName: adjustmentData.clientName,
        clientEmail: adjustmentData.clientEmail,
        clientNotes: adjustmentData.clientNotes,
        requestedChanges: adjustmentData.requestedChanges,
        contractorEmail: adjustmentData.contractorEmail,
        status: 'pending'
      }).returning();
      return result;
    } catch (error) {
      console.error('Error saving adjustment request:', error);
      throw error;
    }
  }

  /**
   * Get adjustments for estimate
   */
  async getAdjustmentsByEstimate(estimateId: string): Promise<EstimateAdjustment[]> {
    return await db.select()
      .from(estimateAdjustments)
      .where(eq(estimateAdjustments.estimateId, estimateId));
  }

  /**
   * Create notification
   */
  async createNotification(notificationData: any): Promise<Notification> {
    const notificationId = generateId();
    
    try {
      const [result] = await db.insert(notifications).values({
        id: notificationId,
        type: notificationData.type,
        recipientEmail: notificationData.recipientEmail,
        title: notificationData.title,
        message: notificationData.message,
        relatedId: notificationData.relatedId || null,
        isRead: false
      }).returning();
      return result;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for email
   */
  async getNotificationsByEmail(email: string): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.recipientEmail, email));
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<boolean> {
    try {
      await db.update(notifications)
        .set({ 
          isRead: true, 
          readAt: new Date() 
        })
        .where(eq(notifications.id, notificationId));
      
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }
}

export const estimateStorage = new DatabaseEstimateStorage();
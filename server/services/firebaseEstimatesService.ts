/**
 * Firebase Estimates Service
 * Servicio unificado para manejo de estimados en Firestore
 * Reemplaza completamente el uso de PostgreSQL/Drizzle
 */

import { db } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Interfaces canónicas
export interface EstimateItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category?: string;
  notes?: string;
}

export interface EstimateData {
  id?: string;
  userId: string; // OBLIGATORIO - Firebase UID
  estimateNumber: string;
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  projectAddress: string;
  projectCity?: string;
  projectState?: string;
  projectZip?: string;
  projectType: string;
  projectSubtype?: string;
  items: EstimateItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected' | 'expired';
  validUntil?: Date;
  notes?: string;
  terms?: string;
  contractorName?: string;
  contractorEmail?: string;
  contractorPhone?: string;
  contractorLicense?: string;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
}

class FirebaseEstimatesService {
  private collection = 'estimates';

  /**
   * Crear nuevo estimado
   * @param estimateData Datos del estimado (debe incluir userId)
   * @returns Estimado creado con ID
   */
  async createEstimate(estimateData: Omit<EstimateData, 'id' | 'createdAt' | 'updatedAt'>): Promise<EstimateData> {
    try {
      // Validación crítica: userId obligatorio
      if (!estimateData.userId) {
        throw new Error('userId is required for all estimates');
      }

      console.log(`📝 [FIREBASE-ESTIMATES] Creating estimate for user: ${estimateData.userId}`);

      // Generar número de estimado si no existe
      const estimateNumber = estimateData.estimateNumber || await this.generateEstimateNumber(estimateData.userId);

      const newEstimate = {
        ...estimateData,
        estimateNumber,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: estimateData.status || 'draft'
      };

      const docRef = await db.collection(this.collection).add(newEstimate);
      
      console.log(`✅ [FIREBASE-ESTIMATES] Estimate created with ID: ${docRef.id}`);

      return {
        id: docRef.id,
        ...estimateData,
        estimateNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ [FIREBASE-ESTIMATES] Error creating estimate:', error);
      throw error;
    }
  }

  /**
   * Obtener estimado por ID
   * @param estimateId ID del estimado
   * @param userId ID del usuario (para validación de seguridad)
   */
  async getEstimate(estimateId: string, userId: string): Promise<EstimateData | null> {
    try {
      const docRef = db.collection(this.collection).doc(estimateId);
      const docSnap = await docRef.get();

      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      
      // Validación de seguridad: solo el propietario puede ver su estimado
      if (data.userId !== userId) {
        console.error(`⚠️ [FIREBASE-ESTIMATES] Access denied: User ${userId} trying to access estimate of user ${data.userId}`);
        throw new Error('Access denied');
      }

      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date()
      } as EstimateData;
    } catch (error) {
      console.error('❌ [FIREBASE-ESTIMATES] Error getting estimate:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los estimados de un usuario
   * @param userId ID del usuario (Firebase UID)
   * @param filters Filtros opcionales
   */
  async getEstimatesByUser(
    userId: string, 
    filters?: {
      status?: string;
      clientId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<EstimateData[]> {
    try {
      console.log(`📋 [FIREBASE-ESTIMATES] Getting estimates for user: ${userId}`);

      // Query base: siempre filtrar por userId
      let q = db.collection(this.collection)
        .where('userId', '==', userId);

      // Aplicar filtros adicionales
      if (filters?.status) {
        q = q.where('status', '==', filters.status);
      }
      if (filters?.clientId) {
        q = q.where('clientId', '==', filters.clientId);
      }

      // Ordenar por fecha de creación (más recientes primero)
      q = q.orderBy('createdAt', 'desc');

      // Limitar resultados si se especifica
      if (filters?.limit) {
        q = q.limit(filters.limit);
      }

      const querySnapshot = await q.get();
      
      const estimates: EstimateData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        estimates.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as EstimateData);
      });

      console.log(`✅ [FIREBASE-ESTIMATES] Found ${estimates.length} estimates for user ${userId}`);
      return estimates;
    } catch (error) {
      console.error('❌ [FIREBASE-ESTIMATES] Error getting user estimates:', error);
      throw error;
    }
  }

  /**
   * Actualizar estimado
   * @param estimateId ID del estimado
   * @param userId ID del usuario (para validación)
   * @param updates Campos a actualizar
   */
  async updateEstimate(
    estimateId: string, 
    userId: string, 
    updates: Partial<EstimateData>
  ): Promise<EstimateData> {
    try {
      // Primero verificar que el usuario es el propietario
      const existing = await this.getEstimate(estimateId, userId);
      if (!existing) {
        throw new Error('Estimate not found or access denied');
      }

      const docRef = db.collection(this.collection).doc(estimateId);
      
      // Eliminar campos que no deben actualizarse
      delete updates.id;
      delete updates.userId; // No permitir cambiar el propietario
      delete updates.createdAt;

      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp()
      };

      await docRef.update(updateData);

      console.log(`✅ [FIREBASE-ESTIMATES] Estimate ${estimateId} updated`);

      return {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ [FIREBASE-ESTIMATES] Error updating estimate:', error);
      throw error;
    }
  }

  /**
   * Eliminar estimado
   * @param estimateId ID del estimado
   * @param userId ID del usuario (para validación)
   */
  async deleteEstimate(estimateId: string, userId: string): Promise<boolean> {
    try {
      // Verificar propiedad antes de eliminar
      const existing = await this.getEstimate(estimateId, userId);
      if (!existing) {
        throw new Error('Estimate not found or access denied');
      }

      await db.collection(this.collection).doc(estimateId).delete();
      
      console.log(`✅ [FIREBASE-ESTIMATES] Estimate ${estimateId} deleted`);
      return true;
    } catch (error) {
      console.error('❌ [FIREBASE-ESTIMATES] Error deleting estimate:', error);
      throw error;
    }
  }

  /**
   * Marcar estimado como enviado
   */
  async markEstimateAsSent(estimateId: string, userId: string): Promise<void> {
    await this.updateEstimate(estimateId, userId, {
      status: 'sent',
      sentAt: new Date()
    });
  }

  /**
   * Marcar estimado como visto
   */
  async markEstimateAsViewed(estimateId: string, userId: string): Promise<void> {
    await this.updateEstimate(estimateId, userId, {
      status: 'viewed',
      viewedAt: new Date()
    });
  }

  /**
   * Aprobar estimado
   */
  async approveEstimate(estimateId: string, userId: string): Promise<void> {
    await this.updateEstimate(estimateId, userId, {
      status: 'approved',
      approvedAt: new Date()
    });
  }

  /**
   * Rechazar estimado
   */
  async rejectEstimate(estimateId: string, userId: string, reason?: string): Promise<void> {
    await this.updateEstimate(estimateId, userId, {
      status: 'rejected',
      rejectedAt: new Date(),
      notes: reason ? `Rejection reason: ${reason}` : undefined
    });
  }

  /**
   * Generar número único de estimado
   */
  private async generateEstimateNumber(userId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Obtener el último estimado del usuario para generar secuencia
    const estimates = await this.getEstimatesByUser(userId, { limit: 1 });
    const lastNumber = estimates.length > 0 ? 
      parseInt(estimates[0].estimateNumber.split('-').pop() || '0') : 0;
    
    const sequence = String(lastNumber + 1).padStart(4, '0');
    
    return `EST-${year}${month}-${sequence}`;
  }

  /**
   * Duplicar estimado
   */
  async duplicateEstimate(estimateId: string, userId: string): Promise<EstimateData> {
    const original = await this.getEstimate(estimateId, userId);
    if (!original) {
      throw new Error('Original estimate not found');
    }

    // Crear copia con nuevo número
    const { id, createdAt, updatedAt, ...estimateData } = original;
    
    return await this.createEstimate({
      ...estimateData,
      estimateNumber: '', // Se generará automáticamente
      status: 'draft',
      notes: `Duplicated from ${original.estimateNumber}`
    });
  }

  /**
   * Obtener estadísticas de estimados
   */
  async getEstimateStats(userId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    viewed: number;
    approved: number;
    rejected: number;
    expired: number;
    totalValue: number;
    averageValue: number;
  }> {
    const estimates = await this.getEstimatesByUser(userId);
    
    const stats = {
      total: estimates.length,
      draft: 0,
      sent: 0,
      viewed: 0,
      approved: 0,
      rejected: 0,
      expired: 0,
      totalValue: 0,
      averageValue: 0
    };

    estimates.forEach(estimate => {
      if (stats.hasOwnProperty(estimate.status)) {
        (stats as any)[estimate.status]++;
      }
      stats.totalValue += estimate.total;
    });

    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

    return stats;
  }
}

// Exportar instancia única
export const firebaseEstimatesService = new FirebaseEstimatesService();
/**
 * Firebase Contracts Service
 * Servicio unificado para manejo de contratos en Firestore
 * Reemplaza completamente el uso de PostgreSQL/Drizzle
 */

import { db } from '../firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// Interfaces canónicas
export interface ContractData {
  id?: string;
  userId: string; // OBLIGATORIO - Firebase UID
  contractNumber: string;
  estimateId?: string; // Referencia al estimado original
  clientId?: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  projectAddress: string;
  projectCity?: string;
  projectState?: string;
  projectZip?: string;
  projectType: string;
  projectDescription: string;
  startDate: Date;
  endDate?: Date;
  totalAmount: number;
  paymentTerms: string;
  paymentSchedule?: {
    description: string;
    amount: number;
    dueDate: Date;
    status: 'pending' | 'paid' | 'overdue';
  }[];
  terms: string;
  specialConditions?: string;
  contractorName: string;
  contractorEmail?: string;
  contractorPhone?: string;
  contractorLicense?: string;
  contractorAddress?: string;
  status: 'draft' | 'sent' | 'signed' | 'in_progress' | 'completed' | 'cancelled';
  signatures?: {
    contractor?: {
      name: string;
      signedAt: Date;
      ipAddress?: string;
    };
    client?: {
      name: string;
      signedAt: Date;
      ipAddress?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  signedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  
  // 📁 Archive System (Nov 2025)
  isArchived?: boolean;
  archivedAt?: Date;
  archivedReason?: string; // 'cleanup', 'test', 'duplicate', 'user_action'
}

class FirebaseContractsService {
  private collection = 'contracts';
  private contractHistoryCollection = 'contractHistory';
  private dualSignatureCollection = 'dualSignatureContracts';

  /**
   * Crear nuevo contrato
   * @param contractData Datos del contrato (debe incluir userId)
   * @returns Contrato creado con ID
   */
  async createContract(contractData: Omit<ContractData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ContractData> {
    try {
      // Validación crítica: userId obligatorio
      if (!contractData.userId) {
        throw new Error('userId is required for all contracts');
      }

      console.log(`📝 [FIREBASE-CONTRACTS] Creating contract for user: ${contractData.userId}`);

      // Generar número de contrato si no existe
      const contractNumber = contractData.contractNumber || await this.generateContractNumber(contractData.userId);

      const newContract = {
        ...contractData,
        contractNumber,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: contractData.status || 'draft'
      };

      const docRef = await db.collection(this.collection).add(newContract);
      
      console.log(`✅ [FIREBASE-CONTRACTS] Contract created with ID: ${docRef.id}`);

      return {
        id: docRef.id,
        ...contractData,
        contractNumber,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACTS] Error creating contract:', error);
      throw error;
    }
  }

  /**
   * Obtener contrato por ID
   * @param contractId ID del contrato
   * @param userId ID del usuario (para validación de seguridad)
   */
  async getContract(contractId: string, userId: string): Promise<ContractData | null> {
    try {
      const docRef = db.collection(this.collection).doc(contractId);
      const docSnap = await docRef.get();

      if (!docSnap.exists) {
        return null;
      }

      const data = docSnap.data();
      
      // Validación de seguridad: solo el propietario puede ver su contrato
      if (data?.userId !== userId) {
        console.error(`⚠️ [FIREBASE-CONTRACTS] Access denied: User ${userId} trying to access contract of user ${data?.userId}`);
        throw new Error('Access denied');
      }

      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        startDate: data.startDate?.toDate() || new Date(),
        endDate: data.endDate?.toDate(),
        sentAt: data.sentAt?.toDate(),
        signedAt: data.signedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        cancelledAt: data.cancelledAt?.toDate()
      } as ContractData;
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACTS] Error getting contract:', error);
      throw error;
    }
  }

  /**
   * Obtener todos los contratos de un usuario
   * @param userId ID del usuario (Firebase UID)
   * @param filters Filtros opcionales
   */
  async getContractsByUser(
    userId: string, 
    filters?: {
      status?: string;
      clientId?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      includeArchived?: boolean; // 📁 Nuevo: incluir archivados
    }
  ): Promise<ContractData[]> {
    try {
      console.log(`📋 [FIREBASE-CONTRACTS] Getting contracts for user: ${userId}`);

      // Query base: siempre filtrar por userId
      let q = db.collection(this.collection)
        .where('userId', '==', userId);

      // 📁 IMPORTANTE: Por defecto EXCLUIR contratos archivados
      if (!filters?.includeArchived) {
        q = q.where('isArchived', '==', false);
      }

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
      
      const contracts: ContractData[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        contracts.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate(),
          sentAt: data.sentAt?.toDate(),
          signedAt: data.signedAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
          cancelledAt: data.cancelledAt?.toDate(),
          archivedAt: data.archivedAt?.toDate()
        } as ContractData);
      });

      console.log(`✅ [FIREBASE-CONTRACTS] Found ${contracts.length} contracts for user ${userId}`);
      return contracts;
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACTS] Error getting user contracts:', error);
      throw error;
    }
  }

  /**
   * Actualizar contrato
   * @param contractId ID del contrato
   * @param userId ID del usuario (para validación)
   * @param updates Campos a actualizar
   */
  async updateContract(
    contractId: string, 
    userId: string, 
    updates: Partial<ContractData>
  ): Promise<ContractData> {
    try {
      // Primero verificar que el usuario es el propietario
      const existing = await this.getContract(contractId, userId);
      if (!existing) {
        throw new Error('Contract not found or access denied');
      }

      const docRef = db.collection(this.collection).doc(contractId);
      
      // Eliminar campos que no deben actualizarse
      delete updates.id;
      delete updates.userId; // No permitir cambiar el propietario
      delete updates.createdAt;

      const updateData = {
        ...updates,
        updatedAt: FieldValue.serverTimestamp()
      };

      await docRef.update(updateData);

      console.log(`✅ [FIREBASE-CONTRACTS] Contract ${contractId} updated`);

      return {
        ...existing,
        ...updates,
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACTS] Error updating contract:', error);
      throw error;
    }
  }

  /**
   * Eliminar contrato
   * @param contractId ID del contrato
   * @param userId ID del usuario (para validación)
   */
  async deleteContract(contractId: string, userId: string): Promise<boolean> {
    try {
      // Verificar propiedad antes de eliminar
      const existing = await this.getContract(contractId, userId);
      if (!existing) {
        throw new Error('Contract not found or access denied');
      }

      await db.collection(this.collection).doc(contractId).delete();
      
      console.log(`✅ [FIREBASE-CONTRACTS] Contract ${contractId} deleted`);
      return true;
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACTS] Error deleting contract:', error);
      throw error;
    }
  }

  /**
   * Marcar contrato como enviado
   */
  async markContractAsSent(contractId: string, userId: string): Promise<void> {
    await this.updateContract(contractId, userId, {
      status: 'sent',
      sentAt: new Date()
    });
  }

  /**
   * Firmar contrato (contractor)
   */
  async signContractAsContractor(
    contractId: string, 
    userId: string, 
    signature: { name: string; ipAddress?: string }
  ): Promise<void> {
    const existing = await this.getContract(contractId, userId);
    if (!existing) {
      throw new Error('Contract not found');
    }

    await this.updateContract(contractId, userId, {
      signatures: {
        ...existing.signatures,
        contractor: {
          ...signature,
          signedAt: new Date()
        }
      },
      status: existing.signatures?.client ? 'signed' : 'sent'
    });
  }

  /**
   * Firmar contrato (cliente)
   */
  async signContractAsClient(
    contractId: string, 
    signature: { name: string; ipAddress?: string; email: string }
  ): Promise<void> {
    // Para firma del cliente, obtener el contrato sin validación de userId
    const docRef = db.collection(this.collection).doc(contractId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Contract not found');
    }

    const existing = docSnap.data() as ContractData;

    await docRef.update({
      signatures: {
        ...existing.signatures,
        client: {
          ...signature,
          signedAt: FieldValue.serverTimestamp()
        }
      },
      status: existing.signatures?.contractor ? 'signed' : 'sent',
      signedAt: existing.signatures?.contractor ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp()
    });

    console.log(`✅ [FIREBASE-CONTRACTS] Contract ${contractId} signed by client`);
  }

  /**
   * Completar contrato
   */
  async completeContract(contractId: string, userId: string): Promise<void> {
    await this.updateContract(contractId, userId, {
      status: 'completed',
      completedAt: new Date()
    });
  }

  /**
   * Cancelar contrato
   */
  async cancelContract(contractId: string, userId: string, reason?: string): Promise<void> {
    await this.updateContract(contractId, userId, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: reason
    });
  }

  /**
   * Generar número único de contrato
   */
  private async generateContractNumber(userId: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    // Obtener el último contrato del usuario para generar secuencia
    const contracts = await this.getContractsByUser(userId, { limit: 1 });
    const lastNumber = contracts.length > 0 ? 
      parseInt(contracts[0].contractNumber.split('-').pop() || '0') : 0;
    
    const sequence = String(lastNumber + 1).padStart(4, '0');
    
    return `CON-${year}${month}-${sequence}`;
  }

  /**
   * Crear contrato desde estimado
   */
  async createContractFromEstimate(estimateId: string, userId: string): Promise<ContractData> {
    // Importar el servicio de estimados
    const { firebaseEstimatesService } = await import('./firebaseEstimatesService');
    
    const estimate = await firebaseEstimatesService.getEstimate(estimateId, userId);
    if (!estimate) {
      throw new Error('Estimate not found');
    }

    // Crear contrato basado en el estimado
    return await this.createContract({
      userId,
      estimateId,
      contractNumber: '', // Se generará automáticamente
      clientId: estimate.clientId,
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      clientPhone: estimate.clientPhone,
      projectAddress: estimate.projectAddress,
      projectCity: estimate.projectCity,
      projectState: estimate.projectState,
      projectZip: estimate.projectZip,
      projectType: estimate.projectType,
      projectDescription: `${estimate.projectType} - ${estimate.projectSubtype || ''}`,
      startDate: new Date(),
      totalAmount: estimate.total,
      paymentTerms: 'Net 30',
      terms: estimate.terms || 'Standard terms and conditions apply',
      contractorName: estimate.contractorName || '',
      contractorEmail: estimate.contractorEmail,
      contractorPhone: estimate.contractorPhone,
      contractorLicense: estimate.contractorLicense,
      status: 'draft'
    });
  }

  /**
   * Obtener estadísticas de contratos
   */
  async getContractStats(userId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    signed: number;
    inProgress: number;
    completed: number;
    cancelled: number;
    totalValue: number;
    averageValue: number;
  }> {
    const contracts = await this.getContractsByUser(userId);
    
    const stats = {
      total: contracts.length,
      draft: 0,
      sent: 0,
      signed: 0,
      inProgress: 0,
      completed: 0,
      cancelled: 0,
      totalValue: 0,
      averageValue: 0
    };

    contracts.forEach(contract => {
      const status = contract.status === 'in_progress' ? 'inProgress' : contract.status;
      if (stats.hasOwnProperty(status)) {
        (stats as any)[status]++;
      }
      stats.totalValue += contract.totalAmount;
    });

    stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;

    return stats;
  }

  /**
   * 📁 Archivar contrato
   * @param contractId ID del contrato (document ID)
   * @param userId ID del usuario (validación de seguridad)
   * @param reason Razón del archivado (opcional)
   * 
   * IMPORTANTE: Actualiza isArchived en TODAS las colecciones donde existe el contrato
   * para evitar que reaparezca al cargar desde múltiples fuentes
   */
  async archiveContract(contractId: string, userId: string, reason: string = 'user_action'): Promise<void> {
    try {
      console.log(`📁 [ARCHIVE] Archiving contract ${contractId} for user ${userId}`);

      const collections = [
        this.contractHistoryCollection,
        this.dualSignatureCollection,
        this.collection
      ];

      let foundAtLeastOne = false;
      let userVerified = false;
      const updatedCollections: string[] = [];

      const archiveData = {
        isArchived: true,
        archivedAt: FieldValue.serverTimestamp(),
        archivedReason: reason,
        updatedAt: FieldValue.serverTimestamp()
      };

      for (const collectionName of collections) {
        try {
          const docRef = db.collection(collectionName).doc(contractId);
          const docSnap = await docRef.get();

          if (docSnap.exists) {
            const data = docSnap.data();
            
            if (!userVerified) {
              if (data?.userId !== userId && data?.firebaseUserId !== userId) {
                console.error(`❌ [ARCHIVE] Unauthorized: Contract belongs to ${data?.userId || data?.firebaseUserId}, not ${userId}`);
                throw new Error('Unauthorized: Contract does not belong to user');
              }
              userVerified = true;
            }

            await docRef.update(archiveData);
            updatedCollections.push(collectionName);
            foundAtLeastOne = true;
            console.log(`📁 [ARCHIVE] Updated isArchived=true in ${collectionName}`);
          }
        } catch (collectionError: any) {
          if (collectionError.message?.includes('Unauthorized')) {
            throw collectionError;
          }
          console.warn(`⚠️ [ARCHIVE] Could not update in ${collectionName}:`, collectionError.message);
        }
      }

      if (!foundAtLeastOne) {
        console.error(`❌ [ARCHIVE] Contract ${contractId} not found in any collection`);
        throw new Error(`Contract not found: ${contractId}`);
      }

      console.log(`✅ [ARCHIVE] Contract ${contractId} archived successfully in: ${updatedCollections.join(', ')}`);
    } catch (error) {
      console.error('❌ [ARCHIVE] Error archiving contract:', error);
      throw error;
    }
  }

  /**
   * 📁 Desarchivar contrato
   * @param contractId ID del contrato (document ID)
   * @param userId ID del usuario (validación de seguridad)
   * 
   * IMPORTANTE: Actualiza isArchived en TODAS las colecciones donde existe el contrato
   */
  async unarchiveContract(contractId: string, userId: string): Promise<void> {
    try {
      console.log(`📂 [UNARCHIVE] Restoring contract ${contractId} for user ${userId}`);

      const collections = [
        this.contractHistoryCollection,
        this.dualSignatureCollection,
        this.collection
      ];

      let foundAtLeastOne = false;
      let userVerified = false;
      const updatedCollections: string[] = [];

      const unarchiveData = {
        isArchived: false,
        archivedAt: FieldValue.delete(),
        archivedReason: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      };

      for (const collectionName of collections) {
        try {
          const docRef = db.collection(collectionName).doc(contractId);
          const docSnap = await docRef.get();

          if (docSnap.exists) {
            const data = docSnap.data();
            
            if (!userVerified) {
              if (data?.userId !== userId && data?.firebaseUserId !== userId) {
                console.error(`❌ [UNARCHIVE] Unauthorized: Contract belongs to ${data?.userId || data?.firebaseUserId}, not ${userId}`);
                throw new Error('Unauthorized: Contract does not belong to user');
              }
              userVerified = true;
            }

            await docRef.update(unarchiveData);
            updatedCollections.push(collectionName);
            foundAtLeastOne = true;
            console.log(`📂 [UNARCHIVE] Updated isArchived=false in ${collectionName}`);
          }
        } catch (collectionError: any) {
          if (collectionError.message?.includes('Unauthorized')) {
            throw collectionError;
          }
          console.warn(`⚠️ [UNARCHIVE] Could not update in ${collectionName}:`, collectionError.message);
        }
      }

      if (!foundAtLeastOne) {
        console.error(`❌ [UNARCHIVE] Contract ${contractId} not found in any collection`);
        throw new Error(`Contract not found: ${contractId}`);
      }

      console.log(`✅ [UNARCHIVE] Contract ${contractId} restored successfully in: ${updatedCollections.join(', ')}`);
    } catch (error) {
      console.error('❌ [UNARCHIVE] Error restoring contract:', error);
      throw error;
    }
  }

  /**
   * 📁 Obtener contratos archivados de un usuario
   * @param userId ID del usuario
   * 
   * Busca en contractHistory, dualSignatureContracts y contracts
   */
  async getArchivedContracts(userId: string): Promise<ContractData[]> {
    try {
      console.log(`📁 [GET-ARCHIVED] Getting archived contracts for user ${userId}`);
      
      const contracts: ContractData[] = [];
      const seenIds = new Set<string>();
      
      // Get ALL contracts from contractHistory, filter in memory
      try {
        const historySnapshot = await db
          .collection(this.contractHistoryCollection)
          .where('userId', '==', userId)
          .get();
        
        let historyCount = 0;
        historySnapshot.forEach(doc => {
          const data = doc.data();
          if (data.isArchived === true && !seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            contracts.push({
              ...data,
              id: doc.id,
              contractId: doc.id,
              source: 'contractHistory',
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              archivedAt: data.archivedAt?.toDate()
            } as any);
            historyCount++;
          }
        });
        console.log(`📁 [GET-ARCHIVED] Found ${historyCount} in ${this.contractHistoryCollection}`);
      } catch (err) {
        console.warn(`⚠️ [GET-ARCHIVED] Error fetching from ${this.contractHistoryCollection}:`, err);
      }

      // Get ALL contracts from dualSignatureContracts, filter in memory
      try {
        const dualSnapshot = await db
          .collection(this.dualSignatureCollection)
          .where('userId', '==', userId)
          .get();

        let dualCount = 0;
        dualSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.isArchived === true && !seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            contracts.push({
              ...data,
              id: doc.id,
              contractId: doc.id,
              source: 'dualSignatureContracts',
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              archivedAt: data.archivedAt?.toDate()
            } as any);
            dualCount++;
          }
        });
        console.log(`📁 [GET-ARCHIVED] Found ${dualCount} in ${this.dualSignatureCollection}`);
      } catch (err) {
        console.warn(`⚠️ [GET-ARCHIVED] Error fetching from ${this.dualSignatureCollection}:`, err);
      }

      // Get ALL contracts from contracts collection (fallback), filter in memory
      try {
        const contractsSnapshot = await db
          .collection(this.collection)
          .where('userId', '==', userId)
          .get();

        let contractsCount = 0;
        contractsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.isArchived === true && !seenIds.has(doc.id)) {
            seenIds.add(doc.id);
            contracts.push({
              ...data,
              id: doc.id,
              contractId: doc.id,
              source: 'contracts',
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
              archivedAt: data.archivedAt?.toDate()
            } as any);
            contractsCount++;
          }
        });
        console.log(`📁 [GET-ARCHIVED] Found ${contractsCount} in ${this.collection}`);
      } catch (err) {
        console.warn(`⚠️ [GET-ARCHIVED] Error fetching from ${this.collection}:`, err);
      }

      // Sort by archivedAt desc (most recently archived first)
      contracts.sort((a, b) => {
        const dateA = a.archivedAt || a.updatedAt || a.createdAt;
        const dateB = b.archivedAt || b.updatedAt || b.createdAt;
        return dateB.getTime() - dateA.getTime();
      });

      console.log(`✅ [GET-ARCHIVED] Total archived contracts found: ${contracts.length}`);
      return contracts;
    } catch (error) {
      console.error('❌ [GET-ARCHIVED] Error getting archived contracts:', error);
      return [];
    }
  }
}

// Exportar instancia única
export const firebaseContractsService = new FirebaseContractsService();
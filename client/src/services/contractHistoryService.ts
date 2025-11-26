import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ContractHistoryEntry {
  id?: string;
  userId: string;
  contractId: string;
  clientName: string;
  projectType: string;
  status: 'draft' | 'in_progress' | 'completed' | 'processing' | 'error' | 'contractor_signed' | 'client_signed' | 'both_signed';
  createdAt: Date;
  updatedAt: Date;
  // Links para firma dual
  contractorSignUrl?: string;
  clientSignUrl?: string;
  shareableLink?: string;
  permanentUrl?: string;
  contractData: {
    client: {
      name: string;
      address: string;
      email?: string;
      phone?: string;
    };
    contractor: {
      name: string;
      address: string;
      email?: string;
      phone?: string;
      license?: string;
      company?: string;
    };
    project: {
      type: string;
      description: string;
      location: string;
      scope?: string;
      specifications?: string;
    };
    financials: {
      total: number;
      subtotal?: number;
      displayTotal?: number;
      displaySubtotal?: number;
      tax?: number;
      materials?: number;
      labor?: number;
      permits?: number;
      other?: number;
    };
    protections: Array<{
      id: string;
      category: string;
      clause: string;
    }>;
    // Enhanced data preservation fields
    formFields?: {
      licenseNumber?: string;
      insurancePolicy?: string;
      coverageAmount?: string;
      expirationDate?: string;
      permitResponsibility?: string;
      permitNumbers?: string;
      workmanshipWarranty?: string;
      materialsWarranty?: string;
      startDate?: string;
      completionDate?: string;
      estimatedDuration?: string;
    };
    paymentTerms?: Array<{
      id: string;
      label: string;
      percentage: number;
      description: string;
    }>;
    materials?: any[];
    timeline?: any;
    terms?: any;
  };
  pdfUrl?: string;
  pageCount?: number;
  generationTime?: number;
  templateUsed?: string;
}

class ContractHistoryService {
  private collectionName = 'contractHistory';
  private dualSignatureCollection = 'dualSignatureContracts';

  /**
   * Busca un contrato existente del mismo cliente y proyecto
   * Primero busca en contractHistory, luego en dualSignatureContracts
   */
  async findExistingContract(userId: string, clientName: string, projectType: string): Promise<ContractHistoryEntry | null> {
    try {
      // Buscar primero en contractHistory
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('clientName', '==', clientName),
        where('projectType', '==', projectType)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ContractHistoryEntry;
      }

      // Si no se encuentra, buscar en dualSignatureContracts
      const dualQuery = query(
        collection(db, this.dualSignatureCollection),
        where('userId', '==', userId),
        where('clientName', '==', clientName)
      );

      const dualSnapshot = await getDocs(dualQuery);
      if (!dualSnapshot.empty) {
        const doc = dualSnapshot.docs[0];
        const data = doc.data();
        // Mapear datos de dualSignatureContracts a ContractHistoryEntry
        return this.mapDualSignatureToHistory(doc.id, data);
      }

      return null;
    } catch (error) {
      console.error('❌ Error finding existing contract:', error);
      return null;
    }
  }

  /**
   * Mapea un contrato de dualSignatureContracts a ContractHistoryEntry
   */
  private mapDualSignatureToHistory(id: string, data: any): ContractHistoryEntry {
    // Normalize timestamps to ISO strings for UI consumption
    const normalizeDate = (value: any): string => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (value.toDate && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
      return '';
    };

    // Coerce totalAmount to number, handling legacy string values
    const normalizeTotalAmount = (value: any): number => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    };

    return {
      id,
      userId: data.userId,
      contractId: data.contractId,
      clientName: data.clientName,
      projectType: data.projectType || 'Construction',
      status: data.status || 'draft',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      contractorSignUrl: data.contractorSignUrl,
      clientSignUrl: data.clientSignUrl,
      shareableLink: data.shareableLink,
      permanentUrl: data.permanentPdfUrl || data.finalPdfPath || data.pdfUrl,
      contractData: {
        client: {
          name: data.clientName,
          address: data.clientAddress || '',
          email: data.clientEmail,
          phone: data.clientPhone
        },
        contractor: {
          name: data.contractorName,
          address: data.contractorAddress || '',
          email: data.contractorEmail,
          phone: data.contractorPhone,
          company: data.contractorCompany
        },
        project: {
          type: data.projectType || 'Construction',
          description: data.projectDescription || '',
          location: data.clientAddress || '',
        },
        financials: {
          total: normalizeTotalAmount(data.totalAmount)
        },
        protections: [],
        formFields: {
          startDate: normalizeDate(data.startDate),
          completionDate: normalizeDate(data.completionDate),
          estimatedDuration: data.estimatedDuration || ''
        }
      },
      pdfUrl: data.finalPdfPath || data.signedPdfPath || data.pdfUrl || data.permanentPdfUrl
    };
  }

  /**
   * Guarda o actualiza un contrato en el historial
   */
  async saveContract(entry: Omit<ContractHistoryEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Buscar contrato existente del mismo cliente y proyecto
      const existingContract = await this.findExistingContract(
        entry.userId, 
        entry.clientName, 
        entry.projectType
      );

      if (existingContract) {
        // Actualizar contrato existente
        const contractRef = doc(db, this.collectionName, existingContract.id!);
        await updateDoc(contractRef, {
          ...entry,
          updatedAt: Timestamp.fromDate(new Date())
        });
        console.log('🔄 Contract updated (same client/project):', existingContract.id);
        return existingContract.id!;
      } else {
        // Crear nuevo contrato
        const contractEntry = {
          ...entry,
          createdAt: Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date())
        };

        const docRef = await addDoc(collection(db, this.collectionName), contractEntry);
        console.log('🔥 New contract saved to Firebase:', docRef.id);
        return docRef.id;
      }
    } catch (error) {
      console.error('❌ Error saving contract to Firebase:', error);
      throw new Error('Failed to save contract to history');
    }
  }

  /**
   * Actualiza un contrato existente en el historial
   */
  async updateContract(
    contractId: string, 
    updates: Partial<Pick<ContractHistoryEntry, 'status' | 'pdfUrl' | 'pageCount' | 'generationTime' | 'templateUsed'>>
  ): Promise<void> {
    try {
      const contractRef = doc(db, this.collectionName, contractId);
      await updateDoc(contractRef, {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date())
      });
      console.log('🔥 Contract updated in Firebase:', contractId);
    } catch (error) {
      console.error('❌ Error updating contract in Firebase:', error);
      throw new Error('Failed to update contract in history');
    }
  }

  /**
   * Obtiene el historial de contratos para un usuario
   * Combina contratos de contractHistory y dualSignatureContracts
   * ✅ PRODUCTION-READY: Con timeout, validación y manejo robusto de errores
   */
  async getContractHistory(userId: string): Promise<ContractHistoryEntry[]> {
    // ✅ VALIDATION: Verificar userId antes de hacer queries
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      console.error('❌ [CONTRACT-HISTORY] Invalid userId:', userId);
      return [];
    }

    console.log('📋 [CONTRACT-HISTORY] Loading contracts for user:', userId);

    let historyContracts: ContractHistoryEntry[] = [];
    let dualContracts: ContractHistoryEntry[] = [];

    // ✅ RESILIENT: Load contractHistory with timeout and individual error handling
    try {
      const historyQuery = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      // Add timeout to prevent hanging queries
      const historyPromise = getDocs(historyQuery);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('contractHistory query timeout')), 10000)
      );

      const historySnapshot = await Promise.race([historyPromise, timeoutPromise]);
      
      // 📁 IMPORTANT: Filter out archived contracts
      historyContracts = historySnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.isArchived !== true;
        })
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as ContractHistoryEntry;
        });
      
      console.log('✅ [CONTRACT-HISTORY] Loaded from contractHistory:', historyContracts.length);
    } catch (historyError: any) {
      console.error('⚠️ [CONTRACT-HISTORY] Failed to load contractHistory:', historyError.message);
      // Continue execution - don't fail completely if one source fails
    }

    // ✅ RESILIENT: Load dualSignatureContracts with timeout and individual error handling
    try {
      const dualQuery = query(
        collection(db, this.dualSignatureCollection),
        where('userId', '==', userId)
      );

      // Add timeout to prevent hanging queries
      const dualPromise = getDocs(dualQuery);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('dualSignatureContracts query timeout')), 10000)
      );

      const dualSnapshot = await Promise.race([dualPromise, timeoutPromise]);
      
      // 📁 IMPORTANT: Filter out archived contracts
      dualContracts = dualSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.isArchived !== true;
        })
        .map(doc => {
          const data = doc.data();
          return this.mapDualSignatureToHistory(doc.id, data);
        });

      console.log('✅ [CONTRACT-HISTORY] Loaded from dualSignatureContracts:', dualContracts.length);
    } catch (dualError: any) {
      console.error('⚠️ [CONTRACT-HISTORY] Failed to load dualSignatureContracts:', dualError.message);
      // Continue execution - don't fail completely if one source fails
    }

    // ✅ IMPROVED MERGE: Deduplicate using BOTH document ID and contractId
    const allContracts: ContractHistoryEntry[] = [];
    const seenDocumentIds = new Set<string>();
    const seenContractIds = new Set<string>();
    
    // Helper to add with deduplication
    const addWithDedup = (contract: ContractHistoryEntry): boolean => {
      const docId = contract.id || '';
      const contractId = contract.contractId || '';
      
      // Skip if we've seen this document ID or contractId before
      if ((docId && seenDocumentIds.has(docId)) || (contractId && seenContractIds.has(contractId))) {
        console.log(`🔄 [CONTRACT-HISTORY] Skipping duplicate: id=${docId}, contractId=${contractId}`);
        return false;
      }
      
      if (docId) seenDocumentIds.add(docId);
      if (contractId) seenContractIds.add(contractId);
      allContracts.push(contract);
      return true;
    };
    
    // Add history contracts first
    let historyAdded = 0;
    for (const contract of historyContracts) {
      if (addWithDedup(contract)) historyAdded++;
    }
    
    // Add dual signature contracts (only if not duplicates)
    let dualAdded = 0;
    for (const dualContract of dualContracts) {
      if (addWithDedup(dualContract)) dualAdded++;
    }

    // Ordenar por fecha de creación (más reciente primero)
    allContracts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    console.log('✅ [CONTRACT-HISTORY] Total unique:', allContracts.length, 'contracts');
    console.log('📊 [CONTRACT-HISTORY] Added - History:', historyAdded, 'Dual:', dualAdded);
    console.log('📊 [CONTRACT-HISTORY] Duplicates filtered:', (historyContracts.length + dualContracts.length) - allContracts.length);
    
    return allContracts;
  }

  /**
   * Obtiene estadísticas del historial de contratos
   */
  async getContractStats(userId: string): Promise<{
    total: number;
    completed: number;
    drafts: number;
    processing: number;
    inProgress: number;
    totalValue: number;
  }> {
    try {
      const contracts = await this.getContractHistory(userId);
      
      const stats = {
        total: contracts.length,
        completed: contracts.filter(c => c.status === 'completed' || c.status === 'both_signed').length,
        drafts: contracts.filter(c => c.status === 'draft').length,
        processing: contracts.filter(c => c.status === 'processing').length,
        inProgress: contracts.filter(c => 
          c.status === 'in_progress' || 
          c.status === 'contractor_signed' || 
          c.status === 'client_signed'
        ).length,
        totalValue: contracts.reduce((sum, c) => sum + (c.contractData.financials.total || 0), 0)
      };

      return stats;
    } catch (error) {
      console.error('❌ Error calculating contract stats:', error);
      return {
        total: 0,
        completed: 0,
        drafts: 0,
        processing: 0,
        inProgress: 0,
        totalValue: 0
      };
    }
  }

  /**
   * Busca contratos por nombre de cliente
   */
  async searchContracts(userId: string, searchTerm: string): Promise<ContractHistoryEntry[]> {
    try {
      const allContracts = await this.getContractHistory(userId);
      
      const filtered = allContracts.filter(contract => 
        contract.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.projectType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        contract.contractData.project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );

      return filtered;
    } catch (error) {
      console.error('❌ Error searching contracts:', error);
      return [];
    }
  }
}

export const contractHistoryService = new ContractHistoryService();
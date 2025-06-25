import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ContractHistoryEntry {
  id?: string;
  userId: string;
  contractId: string;
  clientName: string;
  projectType: string;
  status: 'draft' | 'completed' | 'processing' | 'error';
  createdAt: Date;
  updatedAt: Date;
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

  /**
   * Busca un contrato existente del mismo cliente y proyecto
   */
  async findExistingContract(userId: string, clientName: string, projectType: string): Promise<ContractHistoryEntry | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('clientName', '==', clientName),
        where('projectType', '==', projectType)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]; // Tomar el primer contrato encontrado
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ContractHistoryEntry;
      }
      return null;
    } catch (error) {
      console.error('❌ Error finding existing contract:', error);
      return null;
    }
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
   */
  async getContractHistory(userId: string): Promise<ContractHistoryEntry[]> {
    try {
      // Simple query without ordering to avoid Firebase errors
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const contracts = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        } as ContractHistoryEntry;
      });

      // Sort locally to avoid Firebase index issues
      contracts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log('🔥 Retrieved contract history:', contracts.length, 'contracts');
      return contracts;
    } catch (error) {
      console.error('❌ Error retrieving contract history:', error);
      // Return empty array on error to maintain functionality
      return [];
    }
  }

  /**
   * Obtiene estadísticas del historial de contratos
   */
  async getContractStats(userId: string): Promise<{
    total: number;
    completed: number;
    drafts: number;
    processing: number;
    totalValue: number;
  }> {
    try {
      const contracts = await this.getContractHistory(userId);
      
      const stats = {
        total: contracts.length,
        completed: contracts.filter(c => c.status === 'completed').length,
        drafts: contracts.filter(c => c.status === 'draft').length,
        processing: contracts.filter(c => c.status === 'processing').length,
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
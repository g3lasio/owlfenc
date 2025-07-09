import { db } from '../db';
import { digitalContracts } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

export interface ContractData {
  userId: number;
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  contractorCompany: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDescription: string;
  totalAmount: number;
  startDate: Date;
  completionDate: Date;
  contractHtml: string;
}

export interface SignatureData {
  contractId: string;
  party: 'contractor' | 'client';
  signatureData: string;
  signatureType: 'drawing' | 'cursive';
}

export class DigitalContractService {
  
  // 1. Crear nuevo contrato para firmas
  async createContract(data: ContractData): Promise<string> {
    if (!db) throw new Error('Database not available');
    
    const contractId = `contract_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    await db.insert(digitalContracts).values({
      id: contractId,
      userId: data.userId,
      contractId,
      contractorName: data.contractorName,
      contractorEmail: data.contractorEmail,
      contractorPhone: data.contractorPhone,
      contractorCompany: data.contractorCompany,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientAddress: data.clientAddress,
      projectDescription: data.projectDescription,
      totalAmount: data.totalAmount.toString(),
      startDate: data.startDate,
      completionDate: data.completionDate,
      contractHtml: data.contractHtml,
      status: 'pending',
      emailSent: false,
    });
    
    return contractId;
  }
  
  // 2. Obtener contrato por ID
  async getContract(contractId: string) {
    if (!db) throw new Error('Database not available');
    
    const [contract] = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.contractId, contractId));
    
    return contract;
  }
  
  // 3. Registrar firma
  async recordSignature(data: SignatureData): Promise<boolean> {
    if (!db) throw new Error('Database not available');
    
    const updateData: any = {
      updatedAt: new Date(),
    };
    
    if (data.party === 'contractor') {
      updateData.contractorSigned = true;
      updateData.contractorSignedAt = new Date();
      updateData.contractorSignatureData = data.signatureData;
      updateData.contractorSignatureType = data.signatureType;
    } else {
      updateData.clientSigned = true;
      updateData.clientSignedAt = new Date();
      updateData.clientSignatureData = data.signatureData;
      updateData.clientSignatureType = data.signatureType;
    }
    
    // Obtener estado actual
    const contract = await this.getContract(data.contractId);
    if (!contract) return false;
    
    // Determinar nuevo estado
    if (data.party === 'contractor' && contract.clientSigned) {
      updateData.status = 'both_signed';
    } else if (data.party === 'client' && contract.contractorSigned) {
      updateData.status = 'both_signed';
    } else {
      updateData.status = data.party === 'contractor' ? 'contractor_signed' : 'client_signed';
    }
    
    await db
      .update(digitalContracts)
      .set(updateData)
      .where(eq(digitalContracts.contractId, data.contractId));
    
    return true;
  }
  
  // 4. Marcar emails como enviados
  async markEmailSent(contractId: string): Promise<boolean> {
    if (!db) throw new Error('Database not available');
    
    await db
      .update(digitalContracts)
      .set({
        emailSent: true,
        emailSentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(digitalContracts.contractId, contractId));
    
    return true;
  }
  
  // 5. Verificar si ambas partes han firmado
  async isBothSigned(contractId: string): Promise<boolean> {
    const contract = await this.getContract(contractId);
    return contract ? (contract.contractorSigned && contract.clientSigned) : false;
  }
  
  // 6. Obtener contratos por usuario
  async getContractsByUser(userId: number) {
    if (!db) throw new Error('Database not available');
    
    return await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId));
  }
  
  // 7. Completar contrato (después de generar PDF firmado)
  async completeContract(contractId: string, signedPdfPath: string): Promise<boolean> {
    if (!db) throw new Error('Database not available');
    
    await db
      .update(digitalContracts)
      .set({
        status: 'completed',
        signedPdfPath,
        updatedAt: new Date(),
      })
      .where(eq(digitalContracts.contractId, contractId));
    
    return true;
  }
}

export const digitalContractService = new DigitalContractService();
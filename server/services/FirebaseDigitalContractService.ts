import { db } from '../firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp, 
  Timestamp 
} from 'firebase/firestore';

export interface ContractData {
  contractId: string;
  userId: string;
  contractorData: {
    name: string;
    email: string;
    phone: string;
    company: string;
  };
  clientData: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  contractData: {
    projectDescription: string;
    totalAmount: number;
    startDate: string;
    completionDate: string;
    contractHtml: string;
  };
}

export interface SignatureData {
  contractId: string;
  party: 'contractor' | 'client';
  signatureData: string;
  signatureType: 'drawing' | 'cursive';
}

export class FirebaseDigitalContractService {

  // 1. Crear nuevo contrato para firmas
  async createContract(data: ContractData): Promise<string> {
    console.log('🔥 [FIREBASE-CONTRACTS] Creating contract with Firebase');
    
    const contractDoc = {
      id: data.contractId,
      userId: data.userId,
      
      // Contract basic data
      contractorName: data.contractorData.name,
      contractorEmail: data.contractorData.email,
      contractorPhone: data.contractorData.phone,
      contractorCompany: data.contractorData.company,
      
      clientName: data.clientData.name,
      clientEmail: data.clientData.email,
      clientPhone: data.clientData.phone,
      clientAddress: data.clientData.address,
      
      projectDescription: data.contractData.projectDescription,
      totalAmount: data.contractData.totalAmount,
      startDate: new Date(data.contractData.startDate),
      completionDate: new Date(data.contractData.completionDate),
      
      // Contract HTML and signatures
      contractHtml: data.contractData.contractHtml,
      
      // Signature tracking
      contractorSigned: false,
      contractorSignedAt: null,
      contractorSignatureData: null,
      contractorSignatureType: null,
      
      clientSigned: false,
      clientSignedAt: null,
      clientSignatureData: null,
      clientSignatureType: null,
      
      // Workflow status
      status: 'pending',
      emailSent: false,
      emailSentAt: null,
      
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(doc(db, 'digitalContracts', data.contractId), contractDoc);
    
    console.log('✅ [FIREBASE-CONTRACTS] Contract created with ID:', data.contractId);
    return data.contractId;
  }

  // 2. Obtener contrato por ID
  async getContract(contractId: string) {
    console.log('📖 [FIREBASE-CONTRACTS] Getting contract:', contractId);
    
    const contractRef = doc(db, 'digitalContracts', contractId);
    const contractSnap = await getDoc(contractRef);
    
    if (contractSnap.exists()) {
      return contractSnap.data();
    }
    
    return null;
  }

  // 3. Registrar firma
  async recordSignature(data: SignatureData): Promise<boolean> {
    console.log('✍️ [FIREBASE-CONTRACTS] Recording signature for:', data.contractId, data.party);
    
    const contract = await this.getContract(data.contractId);
    if (!contract) {
      console.error('❌ Contract not found:', data.contractId);
      return false;
    }

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

    // Determinar nuevo estado
    if (data.party === 'contractor' && contract.clientSigned) {
      updateData.status = 'both_signed';
    } else if (data.party === 'client' && contract.contractorSigned) {
      updateData.status = 'both_signed';
    } else {
      updateData.status = data.party === 'contractor' ? 'contractor_signed' : 'client_signed';
    }

    await updateDoc(doc(db, 'digitalContracts', data.contractId), updateData);
    
    console.log('✅ [FIREBASE-CONTRACTS] Signature recorded, new status:', updateData.status);
    return true;
  }

  // 4. Marcar email como enviado
  async markEmailSent(contractId: string): Promise<boolean> {
    console.log('📧 [FIREBASE-CONTRACTS] Marking email sent for:', contractId);
    
    await updateDoc(doc(db, 'digitalContracts', contractId), {
      emailSent: true,
      emailSentAt: new Date(),
      updatedAt: new Date(),
    });
    
    return true;
  }

  // 5. Verificar si ambas partes han firmado
  async isBothSigned(contractId: string): Promise<boolean> {
    const contract = await this.getContract(contractId);
    return contract ? (contract.contractorSigned && contract.clientSigned) : false;
  }

  // 6. Obtener contratos por usuario
  async getContractsByUser(userId: string) {
    console.log('📋 [FIREBASE-CONTRACTS] Getting contracts for user:', userId);
    
    const contractsRef = collection(db, 'digitalContracts');
    const q = query(contractsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // 7. Completar contrato (marcar como terminado)
  async completeContract(contractId: string, signedPdfPath?: string): Promise<boolean> {
    console.log('🏁 [FIREBASE-CONTRACTS] Completing contract:', contractId);
    
    const updateData: any = {
      status: 'completed',
      updatedAt: new Date(),
    };

    if (signedPdfPath) {
      updateData.signedPdfPath = signedPdfPath;
    }

    await updateDoc(doc(db, 'digitalContracts', contractId), updateData);
    return true;
  }
}

export const firebaseDigitalContractService = new FirebaseDigitalContractService();
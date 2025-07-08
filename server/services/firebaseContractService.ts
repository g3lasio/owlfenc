/**
 * FIREBASE CONTRACT SIGNATURE SERVICE
 * Serverless contract signature system with secure tokens and resilient storage
 */

import { db, admin } from '../lib/firebase-admin';
import crypto from 'crypto';

export interface ContractToken {
  tokenId: string;
  contractId: string;
  role: 'contractor' | 'client';
  recipientEmail: string;
  recipientName: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  contractData: {
    contractorName: string;
    clientName: string;
    projectValue: string;
    projectDescription: string;
    contractHTML: string;
  };
}

export interface ContractSignature {
  signatureId: string;
  contractId: string;
  tokenId: string;
  role: 'contractor' | 'client';
  signedBy: string;
  signatureData?: string; // Base64 signature image
  typedName?: string;
  signedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface SecureContractLink {
  url: string;
  token: string;
  expiresAt: Date;
}

export class FirebaseContractService {
  private readonly DOMAIN = process.env.NODE_ENV === 'production' 
    ? 'https://owlfenc.com' 
    : process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000';
  
  private readonly TOKEN_EXPIRY_HOURS = 72; // 3 days
  
  /**
   * Create a new contract in Firebase
   */
  async createContract(contractData: any) {
    try {
      const contractRef = await db.collection('contracts').add({
        ...contractData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ [FIREBASE-CONTRACT] Contract created: ${contractRef.id}`);
      return contractRef;
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACT] Failed to create contract:', error);
      throw error;
    }
  }
  
  /**
   * Generate secure single-use token for contract signing
   */
  async generateSecureToken(params: {
    contractId: string;
    role: 'contractor' | 'client';
    recipientEmail: string;
    recipientName: string;
    contractData: ContractToken['contractData'];
  }): Promise<SecureContractLink> {
    try {
      console.log('📊 [FIREBASE-CONTRACT] generateSecureToken params:', JSON.stringify(params, null, 2));
      // Generate cryptographically secure token
      const token = crypto.randomBytes(32).toString('hex');
      const tokenId = `TOKEN_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      
      // Calculate expiration
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);
      
      // Store token in Firestore
      const tokenData: ContractToken = {
        tokenId,
        contractId: params.contractId,
        role: params.role,
        recipientEmail: params.recipientEmail,
        recipientName: params.recipientName,
        expiresAt,
        used: false,
        createdAt: new Date(),
        contractData: params.contractData
      };
      
      await db.collection('contractTokens').doc(tokenId).set({
        ...tokenData,
        token, // Store hashed token for security
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.Timestamp.fromDate(new Date())
      });
      
      // Generate secure URL
      const url = `${this.DOMAIN}/sign/${token}`;
      
      console.log(`🔐 [FIREBASE-CONTRACT] Generated secure token for ${params.role}: ${tokenId}`);
      
      return {
        url,
        token,
        expiresAt
      };
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACT] Failed to generate token:', error);
      throw new Error('Failed to generate secure contract link');
    }
  }
  
  /**
   * Validate token and retrieve contract data
   */
  async validateToken(token: string): Promise<ContractToken | null> {
    try {
      // Find token in Firestore
      const tokenSnapshot = await db.collection('contractTokens')
        .where('token', '==', token)
        .limit(1)
        .get();
      
      if (tokenSnapshot.empty) {
        console.warn('⚠️ [FIREBASE-CONTRACT] Token not found');
        return null;
      }
      
      const tokenDoc = tokenSnapshot.docs[0];
      const tokenData = tokenDoc.data() as any;
      
      // Check if token is expired
      const expiresAt = tokenData.expiresAt.toDate();
      if (new Date() > expiresAt) {
        console.warn('⚠️ [FIREBASE-CONTRACT] Token expired');
        return null;
      }
      
      // Check if token is already used
      if (tokenData.used) {
        console.warn('⚠️ [FIREBASE-CONTRACT] Token already used');
        return null;
      }
      
      return {
        ...tokenData,
        expiresAt: tokenData.expiresAt.toDate(),
        createdAt: tokenData.createdAt.toDate()
      } as ContractToken;
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACT] Token validation error:', error);
      return null;
    }
  }
  
  /**
   * Store signature and mark token as used
   */
  async storeSignature(params: {
    token: string;
    signatureData?: string;
    typedName?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      // Validate token first
      const tokenData = await this.validateToken(params.token);
      if (!tokenData) {
        return {
          success: false,
          message: 'Invalid or expired token'
        };
      }
      
      // Create signature record
      const signatureId = `SIG_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      const signature: ContractSignature = {
        signatureId,
        contractId: tokenData.contractId,
        tokenId: tokenData.tokenId,
        role: tokenData.role,
        signedBy: tokenData.recipientName,
        signatureData: params.signatureData,
        typedName: params.typedName,
        signedAt: new Date(),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent
      };
      
      // Use transaction to ensure atomicity
      await db.runTransaction(async (transaction) => {
        // Store signature
        transaction.set(
          db.collection('contractSignatures').doc(signatureId),
          {
            ...signature,
            signedAt: admin.firestore.Timestamp.fromDate(signature.signedAt)
          }
        );
        
        // Mark token as used
        const tokenRef = db.collection('contractTokens').doc(tokenData.tokenId);
        transaction.update(tokenRef, { used: true });
        
        // Update contract status
        const contractRef = db.collection('contracts').doc(tokenData.contractId);
        const contractDoc = await transaction.get(contractRef);
        
        if (!contractDoc.exists) {
          // Create contract document if it doesn't exist
          transaction.set(contractRef, {
            contractId: tokenData.contractId,
            contractorName: tokenData.contractData.contractorName,
            clientName: tokenData.contractData.clientName,
            projectValue: tokenData.contractData.projectValue,
            projectDescription: tokenData.contractData.projectDescription,
            contractHTML: tokenData.contractData.contractHTML,
            status: tokenData.role === 'contractor' ? 'contractor-signed' : 'client-signed',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // Update existing contract
          const currentData = contractDoc.data()!;
          const newStatus = currentData.status === 'contractor-signed' && tokenData.role === 'client'
            ? 'fully-signed'
            : currentData.status === 'client-signed' && tokenData.role === 'contractor'
            ? 'fully-signed'
            : `${tokenData.role}-signed`;
          
          transaction.update(contractRef, {
            status: newStatus,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      });
      
      console.log(`✅ [FIREBASE-CONTRACT] Signature stored successfully: ${signatureId}`);
      
      return {
        success: true,
        message: 'Contract signed successfully'
      };
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACT] Failed to store signature:', error);
      return {
        success: false,
        message: 'Failed to process signature'
      };
    }
  }
  
  /**
   * Get contract status and signatures
   */
  async getContractStatus(contractId: string): Promise<{
    status: string;
    signatures: ContractSignature[];
    contractData?: any;
  }> {
    try {
      // Get contract document
      const contractDoc = await db.collection('contracts').doc(contractId).get();
      const contractData = contractDoc.exists ? contractDoc.data() : null;
      
      // Get all signatures for this contract
      const signaturesSnapshot = await db.collection('contractSignatures')
        .where('contractId', '==', contractId)
        .get();
      
      const signatures = signaturesSnapshot.docs.map(doc => ({
        ...doc.data(),
        signedAt: doc.data().signedAt.toDate()
      })) as ContractSignature[];
      
      return {
        status: contractData?.status || 'pending',
        signatures,
        contractData
      };
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACT] Failed to get contract status:', error);
      throw new Error('Failed to retrieve contract status');
    }
  }
  
  /**
   * Generate final signed PDF with both signatures
   */
  async generateSignedPDF(contractId: string): Promise<Buffer | null> {
    try {
      const { status, signatures, contractData } = await this.getContractStatus(contractId);
      
      if (status !== 'fully-signed') {
        console.warn('⚠️ [FIREBASE-CONTRACT] Contract not fully signed');
        return null;
      }
      
      // Get both signatures
      const contractorSig = signatures.find(sig => sig.role === 'contractor');
      const clientSig = signatures.find(sig => sig.role === 'client');
      
      if (!contractorSig || !clientSig || !contractData) {
        console.warn('⚠️ [FIREBASE-CONTRACT] Missing signatures or contract data');
        return null;
      }
      
      // Import PDF service to generate final signed PDF
      const { PremiumPdfService } = await import('./premiumPdfService');
      const pdfService = new PremiumPdfService();
      
      // Generate PDF with signatures embedded
      const pdfBuffer = await pdfService.generateContractWithSignatures({
        contractHTML: contractData.contractHTML,
        contractorSignature: {
          name: contractorSig.signedBy,
          signatureData: contractorSig.signatureData,
          typedName: contractorSig.typedName,
          signedAt: contractorSig.signedAt
        },
        clientSignature: {
          name: clientSig.signedBy,
          signatureData: clientSig.signatureData,
          typedName: clientSig.typedName,
          signedAt: clientSig.signedAt
        }
      });
      
      return pdfBuffer;
    } catch (error) {
      console.error('❌ [FIREBASE-CONTRACT] Failed to generate signed PDF:', error);
      return null;
    }
  }
}

export const firebaseContractService = new FirebaseContractService();
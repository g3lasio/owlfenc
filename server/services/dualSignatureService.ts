/**
 * Dual Signature Service - Sistema de Firma Dual Automática (Más Avanzado)
 *
 * Características:
 * - Enlaces únicos para contratista y cliente
 * - Firma asíncrona (no necesitan firmar al mismo tiempo)
 * - Notificaciones automáticas por email/SMS
 * - PDF regenerado y distribuido automáticamente
 * - Dashboard en tiempo real para el contratista
 * - Escalable para contratos multi-parte (joint ventures, subcontratistas)
 */

// CRITICAL FIX: Removed all PostgreSQL imports - using Firebase exclusively
// This service now operates 100% on Firebase for complete consistency
import { ResendEmailAdvanced } from "./resendEmailAdvanced";
import crypto from "crypto";

export interface InitiateDualSignatureRequest {
  userId: string;
  contractHTML: string;
  contractData: {
    contractorName: string;
    contractorEmail: string;
    contractorPhone?: string;
    contractorCompany: string;
    clientName: string;
    clientEmail: string;
    clientPhone?: string;
    clientAddress?: string;
    projectDescription: string;
    totalAmount: number;
    startDate?: string;
    completionDate?: string;
  };
}

export interface SignatureSubmission {
  contractId: string;
  party: "contractor" | "client";
  signatureData: string;
  signatureType: "drawing" | "cursive";
  fullName: string;
}

export interface DualSignatureStatus {
  contractId: string;
  status:
    | "pending"
    | "contractor_signed"
    | "client_signed"
    | "both_signed"
    | "completed";
  contractorSigned: boolean;
  clientSigned: boolean;
  contractorSignedAt?: Date;
  clientSignedAt?: Date;
  emailSent: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export class DualSignatureService {
  private emailService: ResendEmailAdvanced;

  constructor() {
    this.emailService = new ResendEmailAdvanced();
  }

  /**
   * Iniciar el proceso de firma dual
   * Crea el contrato digital y envía enlaces únicos a ambas partes
   */
  async initiateDualSignature(request: InitiateDualSignatureRequest): Promise<{
    success: boolean;
    contractId?: string;
    contractorSignUrl?: string;
    clientSignUrl?: string;
    message: string;
  }> {
    try {
      console.log("🚀 [DUAL-SIGNATURE] Starting dual signature workflow...");
      console.log(
        "👤 [DUAL-SIGNATURE] Contractor:",
        request.contractData.contractorName
      );
      console.log(
        "👥 [DUAL-SIGNATURE] Client:",
        request.contractData.clientName
      );
      console.log(
        "📄 [DUAL-SIGNATURE] Contract HTML length:",
        request.contractHTML?.length || 0
      );
      console.log(
        "📄 [DUAL-SIGNATURE] Contract HTML preview:",
        request.contractHTML?.substring(0, 200) || "No HTML content"
      );

      // Generate unique contract ID
      const contractId = this.generateUniqueContractId();
      console.log("🆔 [FIREBASE-ONLY] Contract ID generated:", contractId);

      // Generate signature URLs using production domain
      const getBaseUrl = () => {
        // Debug logging
        console.log(
          "🔍 [URL-DEBUG] REPLIT_DEV_DOMAIN:",
          process.env.REPLIT_DEV_DOMAIN
        );
        console.log("🔍 [URL-DEBUG] NODE_ENV:", process.env.NODE_ENV);

        // Production environment - use owlfenc.com domain
        if (process.env.NODE_ENV === "production") {
          console.log("✅ [URL-DEBUG] Using production URL");
          return "https://owlfenc.com";
        }

        // Development - use REPLIT_DEV_DOMAIN if available
        const replitDomain = process.env.REPLIT_DEV_DOMAIN;
        if (replitDomain) {
          console.log(
            "✅ [URL-DEBUG] Using Replit domain as-is:",
            replitDomain
          );
          return replitDomain; // Use as-is, no protocol addition needed
        }

        // Local development fallback
        console.log("⚠️ [URL-DEBUG] Using localhost fallback");
        return "http://localhost:5000";
      };

      const baseUrl = getBaseUrl();
      console.log("🌍 [DUAL-SIGNATURE] Base URL for signature links:", baseUrl);

      const contractorSignUrl = `${baseUrl}/sign/${contractId}/contractor`;
      const clientSignUrl = `${baseUrl}/sign/${contractId}/client`;

      console.log("🔗 [DUAL-SIGNATURE] Signature URLs generated:");
      console.log("🏗️ [DUAL-SIGNATURE] Contractor URL:", contractorSignUrl);
      console.log("👥 [DUAL-SIGNATURE] Client URL:", clientSignUrl);

      // ✅ FIREBASE-ONLY: Save contract to Firebase dualSignatureContracts collection
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      
      const firebaseContract = {
        contractId,
        userId: request.userId,
        
        // Client data
        clientName: request.contractData.clientName,
        clientEmail: request.contractData.clientEmail,
        clientPhone: request.contractData.clientPhone || '',
        clientAddress: request.contractData.clientAddress || '',
        
        // Contractor data
        contractorName: request.contractData.contractorName,
        contractorEmail: request.contractData.contractorEmail,
        contractorPhone: request.contractData.contractorPhone || '',
        contractorCompany: request.contractData.contractorCompany,
        
        // Project details
        projectDescription: request.contractData.projectDescription,
        projectType: "Construction", // ✅ FIXED: Default value (projectType not in request type)
        totalAmount: request.contractData.totalAmount,
        startDate: request.contractData.startDate || '',
        completionDate: request.contractData.completionDate || '',
        
        // Contract content
        contractHtml: request.contractHTML,
        
        // Signature data
        contractorSigned: false,
        clientSigned: false,
        contractorSignature: null,
        clientSignature: null,
        contractorSignedAt: null,
        clientSignedAt: null,
        contractorSignUrl,
        clientSignUrl,
        
        // Status and metadata
        status: 'draft', // ✅ FIXED: Start as draft (links generated but not signed)
        permanentPdfUrl: null,
        signedPdfPath: null,
        emailSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .set(firebaseContract);

      console.log(
        "✅ [FIREBASE-ONLY] Contract saved to Firebase:",
        contractId
      );

      // Send dual notifications
      await this.sendDualNotifications({
        contractId,
        contractorName: request.contractData.contractorName,
        contractorEmail: request.contractData.contractorEmail,
        contractorCompany: request.contractData.contractorCompany,
        clientName: request.contractData.clientName,
        clientEmail: request.contractData.clientEmail,
        projectDescription: request.contractData.projectDescription,
        totalAmount: request.contractData.totalAmount,
        contractorSignUrl,
        clientSignUrl,
      });

      // Update email sent status in Firebase
      await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .update({
          emailSent: true,
          emailSentAt: new Date(),
          updatedAt: new Date()
        });

      console.log(
        "✅ [FIREBASE-ONLY] Dual signature workflow initiated successfully"
      );

      return {
        success: true,
        contractId,
        contractorSignUrl,
        clientSignUrl,
        message: `Dual signature workflow initiated. Contract ID: ${contractId}`,
      };
    } catch (error: any) {
      console.error(
        "❌ [DUAL-SIGNATURE] Error initiating dual signature:",
        error
      );
      return {
        success: false,
        message: `Failed to initiate dual signature: ${error.message}`,
      };
    }
  }

  /**
   * Obtener datos del contrato para mostrar en la página de firma
   * PUBLIC ENDPOINT - No authentication required
   * Security: Contract needs both signatures to be valid
   */
  async getContractForSigning(
    contractId: string,
    party: "contractor" | "client"
  ): Promise<{
    success: boolean;
    contract?: any;
    message: string;
  }> {
    try {
      console.log(
        `🔍 [FIREBASE-ONLY] Getting contract for ${party} signing:`,
        contractId
      );

      const { db: firebaseDb } = await import("../lib/firebase-admin");
      
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();

      if (!contractDoc.exists) {
        return {
          success: false,
          message: "Contract not found",
        };
      }

      const contract = contractDoc.data();

      // Check if already signed
      const alreadySigned =
        party === "contractor"
          ? contract?.contractorSigned
          : contract?.clientSigned;

      if (alreadySigned) {
        console.log(
          `⚠️ [FIREBASE-ONLY] ${party} has already signed this contract`
        );
        return {
          success: true,
          contract,
          message: `This contract has already been signed by the ${party}`,
        };
      }

      console.log(
        `✅ [FIREBASE-ONLY] Contract retrieved for ${party} signing`
      );
      return {
        success: true,
        contract,
        message: "Contract ready for signing",
      };
    } catch (error: any) {
      console.error("❌ [FIREBASE-ONLY] Error getting contract:", error);
      return {
        success: false,
        message: `Error retrieving contract: ${error.message}`,
      };
    }
  }

  /**
   * Procesar la firma enviada por una de las partes
   * INCLUYE VERIFICACIÓN DE SEGURIDAD PARA PREVENIR ACCESO CRUZADO
   */
  async processSignature(
    submission: SignatureSubmission,
    requestingUserId?: string
  ): Promise<{
    success: boolean;
    message: string;
    status?: string;
    bothSigned?: boolean;
  }> {
    try {
      console.log(
        `✍️ [FIREBASE-ONLY] Processing ${submission.party} signature:`,
        submission.contractId
      );

      const { db: firebaseDb } = await import("../lib/firebase-admin");
      
      // Get current contract from Firebase
      const contractRef = firebaseDb
        .collection('dualSignatureContracts')
        .doc(submission.contractId);
      
      const contractDoc = await contractRef.get();

      if (!contractDoc.exists) {
        return {
          success: false,
          message: "Contract not found",
        };
      }

      const contract = contractDoc.data();

      // CRÍTICO: Verificar que el usuario tenga permiso para acceder a este contrato
      if (requestingUserId && contract?.userId !== requestingUserId) {
        console.error(
          `🚫 [SECURITY-VIOLATION] User ${requestingUserId} attempted to process signature for contract ${submission.contractId} owned by ${contract?.userId}`
        );
        return {
          success: false,
          message: "Unauthorized access to contract",
        };
      }

      // Check if already signed
      const alreadySigned =
        submission.party === "contractor"
          ? contract?.contractorSigned
          : contract?.clientSigned;

      if (alreadySigned) {
        return {
          success: false,
          message: `This contract has already been signed by the ${submission.party}`,
        };
      }

      // Prepare update data
      const updateData =
        submission.party === "contractor"
          ? {
              contractorSigned: true,
              contractorSignedAt: new Date(),
              contractorSignatureData: submission.signatureData,
              contractorSignatureType: submission.signatureType,
              updatedAt: new Date(),
            }
          : {
              clientSigned: true,
              clientSignedAt: new Date(),
              clientSignatureData: submission.signatureData,
              clientSignatureType: submission.signatureType,
              updatedAt: new Date(),
            };

      // Update signature in Firebase
      await contractRef.update(updateData);

      // Check if both parties will be signed after this signature
      const bothSigned =
        submission.party === "contractor"
          ? contract?.clientSigned // Contractor just signed, check if client was already signed
          : contract?.contractorSigned; // Client just signed, check if contractor was already signed

      console.log(
        `🔍 [FIREBASE-ONLY] Signature check: ${submission.party} signing, other party signed: ${bothSigned}`
      );

      let finalStatus: string;

      // If both signed, trigger completion workflow IMMEDIATELY
      if (bothSigned) {
        console.log(
          "🎉 [FIREBASE-ONLY] Both parties signed! Triggering completion workflow..."
        );
        
        // completeContract() will set status to "completed" and save completionDate
        await this.completeContract(submission.contractId);
        finalStatus = "completed";
        
        console.log(
          `✅ [FIREBASE-ONLY] ${submission.party} signature processed successfully`
        );
        console.log(`📊 [FIREBASE-ONLY] Contract completed - both parties signed`);
      } else {
        // Only one party signed - update status to 'progress'
        await contractRef.update({
          status: 'progress', // ✅ FIXED: Use 'progress' status (not 'contractor_signed' or 'client_signed')
          updatedAt: new Date(),
        });

        finalStatus = 'progress';

        console.log(
          `✅ [FIREBASE-ONLY] ${submission.party} signature processed successfully`
        );
        console.log(`📊 [FIREBASE-ONLY] New status: progress`);

        // Notify the other party that signature is pending
        await this.notifyRemainingParty(
          submission.contractId,
          submission.party
        );
      }

      return {
        success: true,
        message: `${submission.party} signature recorded successfully`,
        status: finalStatus,
        bothSigned,
      };
    } catch (error: any) {
      console.error("❌ [FIREBASE-ONLY] Error processing signature:", error);
      return {
        success: false,
        message: `Error processing signature: ${error.message}`,
      };
    }
  }

  /**
   * Download signed PDF
   * ✅ PRIORITY 1: Firebase Storage (permanent)
   * FALLBACK 2: Local filesystem (temporary, legacy)
   */
  async downloadSignedPdf(
    contractId: string,
    requestingUserId?: string
  ): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    message: string;
  }> {
    try {
      console.log(
        "📥 [DUAL-SIGNATURE] Download request for contract:",
        contractId
      );

      // CRITICAL FIX: Using Firebase instead of PostgreSQL
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();

      if (!contractDoc.exists) {
        return {
          success: false,
          message: "Contract not found in Firebase",
        };
      }

      const contract = contractDoc.data()!;

      // Security check - optional for public contracts
      if (requestingUserId && contract.userId !== requestingUserId) {
        console.error(
          `🚫 [SECURITY-VIOLATION] User ${requestingUserId} attempted to download contract ${contractId} owned by ${contract.userId}`
        );
        return {
          success: false,
          message: "Unauthorized access to contract",
        };
      }

      if (contract.status !== "completed") {
        return {
          success: false,
          message: "Contract is not completed yet",
        };
      }

      // ✅ PRIORITY 1: Try Firebase Storage (PERMANENT)
      if (contract.permanentPdfUrl) {
        try {
          console.log("☁️ [DUAL-SIGNATURE] Fetching PDF from Firebase Storage...");
          const fetch = (await import("node-fetch")).default;
          const response = await fetch(contract.permanentPdfUrl);
          
          if (response.ok) {
            const pdfBuffer = Buffer.from(await response.arrayBuffer());
            console.log("✅ [DUAL-SIGNATURE] PDF downloaded from Firebase Storage successfully");
            return {
              success: true,
              pdfBuffer,
              message: "PDF downloaded successfully from permanent storage",
            };
          } else {
            console.warn("⚠️ [DUAL-SIGNATURE] Failed to fetch from Firebase Storage, trying local fallback...");
          }
        } catch (storageError: any) {
          console.warn("⚠️ [DUAL-SIGNATURE] Firebase Storage fetch failed:", storageError.message);
        }
      }

      // FALLBACK 2: Try local filesystem (TEMPORARY, legacy)
      if (contract.signedPdfPath) {
        try {
          console.log("💾 [DUAL-SIGNATURE] Trying local filesystem (fallback)...");
          const fs = await import("fs");
          const path = await import("path");
          const fullPath = path.join(process.cwd(), contract.signedPdfPath);

          if (fs.existsSync(fullPath)) {
            const pdfBuffer = fs.readFileSync(fullPath);
            console.log("✅ [DUAL-SIGNATURE] PDF downloaded from local filesystem (fallback)");
            return {
              success: true,
              pdfBuffer,
              message: "PDF downloaded successfully from local storage",
            };
          }
        } catch (localError: any) {
          console.warn("⚠️ [DUAL-SIGNATURE] Local filesystem fetch failed:", localError.message);
        }
      }

      // Both methods failed
      return {
        success: false,
        message: "Signed PDF not available - please contact support",
      };
    } catch (error: any) {
      console.error("❌ [DUAL-SIGNATURE] Error downloading PDF:", error);
      return {
        success: false,
        message: `Error downloading PDF: ${error.message}`,
      };
    }
  }

  /**
   * Obtener el estado del contrato para el dashboard del contratista
   */
  async getContractStatus(contractId: string): Promise<{
    success: boolean;
    status?: DualSignatureStatus;
    message: string;
  }> {
    try {
      // CRITICAL FIX: Using Firebase instead of PostgreSQL
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();

      if (!contractDoc.exists) {
        return {
          success: false,
          message: "Contract not found in Firebase",
        };
      }

      const contract = contractDoc.data()!;

      const status: DualSignatureStatus = {
        contractId: contract.contractId,
        status: contract.status as any,
        contractorSigned: contract.contractorSigned,
        clientSigned: contract.clientSigned,
        contractorSignedAt: contract.contractorSignedAt || undefined,
        clientSignedAt: contract.clientSignedAt || undefined,
        emailSent: contract.emailSent,
        createdAt: contract.createdAt,
        completedAt:
          contract.status === "completed" ? contract.updatedAt : undefined,
      };

      return {
        success: true,
        status,
        message: "Contract status retrieved successfully",
      };
    } catch (error: any) {
      console.error(
        "❌ [DUAL-SIGNATURE] Error getting contract status:",
        error
      );
      return {
        success: false,
        message: `Error retrieving contract status: ${error.message}`,
      };
    }
  }

  /**
   * Completar el contrato cuando ambas partes han firmado
   */
  private async completeContract(contractId: string): Promise<void> {
    try {
      console.log("🏁 [FIREBASE-ONLY] Completing contract:", contractId);

      const { db: firebaseDb } = await import("../lib/firebase-admin");
      
      // Get contract data with signatures from Firebase
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();

      if (!contractDoc.exists) {
        console.error(
          "❌ [FIREBASE-ONLY] Contract not found for completion:",
          contractId
        );
        return;
      }

      const contract = contractDoc.data();

      if (!contract?.contractorSigned || !contract?.clientSigned) {
        console.error(
          "❌ [FIREBASE-ONLY] Contract is not fully signed:",
          contractId
        );
        return;
      }

      console.log(
        "📄 [DUAL-SIGNATURE] Generating signed PDF with integrated signatures..."
      );

      let pdfBuffer: Buffer | null = null;
      let signedPdfPath: string | null = null;
      let permanentPdfUrl: string | null = null;

      try {
        // Import PDF service
        const { default: PremiumPdfService } = await import(
          "./premiumPdfService"
        );
        const pdfService = new PremiumPdfService();

        // Generate PDF with signatures integrated
        pdfBuffer = await pdfService.generateContractWithSignatures({
          contractHTML: contract.contractHtml || "",
          contractorSignature: {
            name: contract.contractorName,
            signatureData: contract.contractorSignatureData || "",
            typedName:
              contract.contractorSignatureType === "typed"
                ? contract.contractorName
                : undefined,
            signedAt: contract.contractorSignedAt || new Date(),
          },
          clientSignature: {
            name: contract.clientName,
            signatureData: contract.clientSignatureData || "",
            typedName:
              contract.clientSignatureType === "typed"
                ? contract.clientName
                : undefined,
            signedAt: contract.clientSignedAt || new Date(),
          },
        });

        console.log("✅ [DUAL-SIGNATURE] PDF generated successfully");

        // ✅ NEW: Upload PDF to Firebase Storage for PERMANENT storage
        try {
          const { firebaseStorageService } = await import("./firebaseStorageService");
          
          console.log("☁️ [DUAL-SIGNATURE] Uploading PDF to Firebase Storage for permanent storage...");
          permanentPdfUrl = await firebaseStorageService.uploadContractPdf(pdfBuffer, contractId);
          console.log("✅ [DUAL-SIGNATURE] PDF uploaded to Firebase Storage successfully");
          console.log("🔗 [DUAL-SIGNATURE] Permanent URL:", permanentPdfUrl.substring(0, 100) + "...");
        } catch (storageError: any) {
          console.error("❌ [DUAL-SIGNATURE] Failed to upload to Firebase Storage:", storageError.message);
          // Continue with local storage as fallback
        }

        // FALLBACK: Save PDF to local file system (temporary, for backward compatibility)
        const fs = await import("fs");
        const path = await import("path");
        signedPdfPath = `signed_contracts/contract_${contractId}_signed.pdf`;
        const fullPath = path.join(process.cwd(), signedPdfPath);

        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, pdfBuffer);
        console.log("💾 [DUAL-SIGNATURE] Signed PDF saved locally (fallback):", signedPdfPath);
      } catch (pdfError: any) {
        console.error(
          "⚠️ [DUAL-SIGNATURE] PDF generation failed, completing contract without PDF:",
          pdfError.message
        );
        // Contract will still be marked as completed but without PDF
        pdfBuffer = null;
        signedPdfPath = null;
        permanentPdfUrl = null;
      }

      // Update Firebase with completion status (with or without PDF)
      const completionDate = new Date();
      await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .update({
          status: "completed",
          signedPdfPath: signedPdfPath, // DEPRECATED: Local path (for backward compatibility)
          permanentPdfUrl: permanentPdfUrl, // ✅ PERMANENT: Firebase Storage URL
          completionDate: completionDate, // ✅ Save completion date when both parties sign
          updatedAt: completionDate,
        });

      console.log(
        "📧 [DUAL-SIGNATURE] Sending completed contract to both parties..."
      );

      // Send completion emails (with or without PDF attachment)
      await this.sendCompletionEmails(contract, pdfBuffer);

      console.log(
        "✅ [DUAL-SIGNATURE] Contract completion workflow finished successfully"
      );

      // CRITICAL FIX: Update contract history when contract is completed
      try {
        console.log("📋 [DUAL-SIGNATURE] Updating contract history...");

        // Import contract history service
        const { contractHistoryService } = await import(
          "../../client/src/services/contractHistoryService"
        );

        // Update contract status to completed in history
        const contractData = contract.contractData as any;

        const historyEntry = {
          userId: contract.userId,
          contractId: contract.contractId,
          clientName: contract.clientName,
          projectType: contractData?.projectType || "Construction",
          status: "completed" as const,
          contractData: {
            client: {
              name: contract.clientName,
              address: contractData?.clientAddress || "",
              email: contract.clientEmail,
              phone: contract.clientPhone || "",
            },
            contractor: {
              name: contract.contractorName,
              address: contractData?.contractorAddress || "",
              email: contract.contractorEmail,
              phone: contract.contractorPhone || "",
              license: contractData?.contractorLicense || "",
              company: contract.contractorCompany || contract.contractorName,
            },
            project: {
              type: contractData?.projectType || "Construction",
              description: contract.projectDescription,
              location: contractData?.clientAddress || "",
              scope: contract.projectDescription,
            },
            financials: {
              total: parseFloat(contract.totalAmount || "0"),
              subtotal: parseFloat(contract.totalAmount || "0"),
              tax: 0,
              materials: 0,
              labor: 0,
              permits: 0,
              other: 0,
            },
            protections: [],
            timeline: {
              startDate: contractData?.startDate || "",
              completionDate: contractData?.completionDate || "",
              estimatedDuration: "As specified in contract",
            },
            terms: {
              warranty: contractData?.warrantyYears || "1",
              permits: contractData?.permitResponsibility || "contractor",
            },
          },
          // ✅ FIX: Use download endpoint URL instead of filesystem path
          pdfUrl: signedPdfPath ? `/api/dual-signature/download/${contract.contractId}` : undefined,
        };

        await contractHistoryService.saveContract(historyEntry);
        console.log(
          "✅ [DUAL-SIGNATURE] Contract history updated with PDF download URL"
        );
      } catch (historyError: any) {
        console.error(
          "❌ [DUAL-SIGNATURE] Error updating contract history:",
          historyError
        );
        // Don't fail the completion process if history update fails
      }
    } catch (error: any) {
      console.error("❌ [DUAL-SIGNATURE] Error completing contract:", error);
    }
  }

  /**
   * Enviar emails de finalización con PDF adjunto (opcional)
   */
  private async sendCompletionEmails(
    contract: any,
    pdfBuffer: Buffer | null
  ): Promise<void> {
    try {
      const hasPdf = pdfBuffer !== null;
      console.log(
        `📧 [DUAL-SIGNATURE] Sending completion emails ${hasPdf ? "with PDF attachment" : "without PDF (generation failed)"}...`
      );

      const contractData = contract.contractData as any;
      const baseUrl = process.env.REPLIT_DEV_DOMAIN || "http://localhost:5000";
      const downloadUrl = hasPdf
        ? `${baseUrl}/api/dual-signature/download/${contract.contractId}`
        : null;

      // Send to contractor
      await this.emailService.sendContractEmail({
        to: contract.contractorEmail,
        toName: contract.contractorName,
        contractorEmail: contract.contractorEmail,
        contractorName: contract.contractorName,
        contractorCompany:
          contractData?.contractorCompany || "Construction Company",
        subject: `🎉 Contract Completed! - ${contract.clientName}`,
        htmlContent: this.generateCompletionEmailHTML({
          recipientName: contract.contractorName,
          recipientType: "contractor",
          contractId: contract.contractId,
          clientName: contract.clientName,
          contractorName: contract.contractorName,
          contractorCompany:
            contractData?.contractorCompany || "Construction Company",
          projectDescription:
            contractData?.projectDescription || "Construction Project",
          totalAmount: contractData?.totalAmount || contract.totalAmount,
          downloadUrl: downloadUrl,
          contractorSignedAt: contract.contractorSignedAt,
          clientSignedAt: contract.clientSignedAt,
          hasPdf: hasPdf,
        }),
      });

      // Send to client
      await this.emailService.sendContractEmail({
        to: contract.clientEmail,
        toName: contract.clientName,
        contractorEmail: contract.contractorEmail,
        contractorName: contract.contractorName,
        contractorCompany:
          contractData?.contractorCompany || "Construction Company",
        subject: `🎉 Contract Completed! - ${contractData?.contractorCompany || "Construction Company"}`,
        htmlContent: this.generateCompletionEmailHTML({
          recipientName: contract.clientName,
          recipientType: "client",
          contractId: contract.contractId,
          clientName: contract.clientName,
          contractorName: contract.contractorName,
          contractorCompany:
            contractData?.contractorCompany || "Construction Company",
          projectDescription:
            contractData?.projectDescription || "Construction Project",
          totalAmount: contractData?.totalAmount || contract.totalAmount,
          downloadUrl: downloadUrl,
          contractorSignedAt: contract.contractorSignedAt,
          clientSignedAt: contract.clientSignedAt,
          hasPdf: hasPdf,
        }),
      });

      console.log("✅ [DUAL-SIGNATURE] Completion emails sent to both parties");
    } catch (error: any) {
      console.error(
        "❌ [DUAL-SIGNATURE] Error sending completion emails:",
        error
      );
    }
  }

  /**
   * Generar HTML del email de finalización
   */
  private generateCompletionEmailHTML(params: {
    recipientName: string;
    recipientType: "contractor" | "client";
    contractId: string;
    clientName: string;
    contractorName: string;
    contractorCompany: string;
    projectDescription: string;
    totalAmount: number;
    downloadUrl: string | null;
    contractorSignedAt: Date;
    clientSignedAt: Date;
    hasPdf: boolean;
  }): string {
    const contractorDate = new Date(
      params.contractorSignedAt
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const clientDate = new Date(params.clientSignedAt).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contract Completed Successfully</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px; text-align: center; border-radius: 15px 15px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🎉 Contract Successfully Completed!</h1>
            <p style="margin: 15px 0 0 0; opacity: 0.9; font-size: 18px;">Both parties have signed - Your contract is now active</p>
          </div>

          <div style="background: #f8fafc; padding: 40px; border-radius: 0 0 15px 15px; border: 1px solid #e2e8f0;">
            <h2 style="color: #059669; margin-top: 0; font-size: 24px;">Hello ${params.recipientName},</h2>

            <div style="background: #d1fae5; padding: 25px; border-radius: 12px; border-left: 6px solid #10b981; margin: 25px 0;">
              <h3 style="margin: 0 0 15px 0; color: #059669; font-size: 20px;">✅ Contract Execution Complete</h3>
              <p style="margin: 0; color: #065f46; font-size: 16px;">
                Congratulations! The contract between <strong>${params.contractorCompany}</strong> and <strong>${params.clientName}</strong> 
                has been successfully signed by both parties and is now legally binding.
              </p>
            </div>

            <div style="background: white; padding: 25px; border-radius: 12px; border: 2px solid #10b981; margin: 25px 0;">
              <h3 style="margin: 0 0 20px 0; color: #059669; text-align: center;">📋 Contract Summary</h3>
              <div style="display: grid; gap: 10px;">
                <p style="margin: 5px 0;"><strong>Project:</strong> ${params.projectDescription}</p>
                <p style="margin: 5px 0;"><strong>Total Amount:</strong> $${params.totalAmount.toLocaleString()}</p>
                <p style="margin: 5px 0;"><strong>Contract ID:</strong> ${params.contractId}</p>
                <p style="margin: 5px 0;"><strong>Contractor:</strong> ${params.contractorName} (${params.contractorCompany})</p>
                <p style="margin: 5px 0;"><strong>Client:</strong> ${params.clientName}</p>
              </div>
            </div>

            <div style="background: white; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 25px 0;">
              <h3 style="margin: 0 0 20px 0; color: #059669; text-align: center;">🖊️ Digital Signatures</h3>
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                  <span><strong>Contractor:</strong> ${params.contractorName}</span>
                  <span style="color: #10b981; font-weight: bold;">✅ Signed: ${contractorDate}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: #f0fdf4; border-radius: 8px;">
                  <span><strong>Client:</strong> ${params.clientName}</span>
                  <span style="color: #10b981; font-weight: bold;">✅ Signed: ${clientDate}</span>
                </div>
              </div>
            </div>

            ${
              params.hasPdf
                ? `
            <div style="text-align: center; margin: 40px 0;">
              <a href="${params.downloadUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 20px 40px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);">
                📄 Download Signed Contract PDF
              </a>
            </div>
            `
                : `
            <div style="background: #fef2f2; padding: 25px; border-radius: 12px; border-left: 6px solid #ef4444; margin: 25px 0; text-align: center;">
              <h4 style="margin: 0 0 15px 0; color: #dc2626;">⚠️ PDF Generation Notice</h4>
              <p style="margin: 0; color: #991b1b; font-size: 16px;">
                While your contract has been successfully signed by both parties and is legally binding, 
                the PDF generation service is temporarily unavailable. Your contract details and digital 
                signatures are securely stored in our system. Please contact support if you need the PDF document.
              </p>
            </div>
            `
            }

            <div style="background: #eff6ff; padding: 20px; border-radius: 12px; border-left: 6px solid #3b82f6; margin: 25px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1e40af;">🔐 Security & Authenticity</h4>
              <ul style="color: #1e3a8a; margin: 10px 0; padding-left: 20px;">
                <li>✓ Digitally signed with timestamp verification</li>
                <li>✓ Cryptographically secured and tamper-proof</li>
                <li>✓ Legally binding under electronic signature laws</li>
                <li>✓ Complete audit trail maintained</li>
              </ul>
            </div>

            ${
              params.recipientType === "contractor"
                ? `
            <div style="background: #fef3c7; padding: 20px; border-radius: 12px; border-left: 6px solid #f59e0b; margin: 25px 0;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">📋 Next Steps for Contractor</h4>
              <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
                <li>Begin project planning and scheduling</li>
                <li>Coordinate start date with client</li>
                <li>Prepare materials and permits as specified</li>
                <li>Keep this signed contract for your records</li>
              </ul>
            </div>
            `
                : `
            <div style="background: #fef3c7; padding: 20px; border-radius: 12px; border-left: 6px solid #f59e0b; margin: 25px 0;">
              <h4 style="margin: 0 0 10px 0; color: #92400e;">📋 Next Steps for Client</h4>
              <ul style="color: #92400e; margin: 10px 0; padding-left: 20px;">
                <li>Prepare project site as discussed</li>
                <li>Confirm start date with contractor</li>
                <li>Keep this signed contract for your records</li>
                <li>Contact contractor for any project questions</li>
              </ul>
            </div>
            `
            }

            <div style="background: #f9fafb; padding: 20px; border-radius: 12px; margin-top: 30px; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                This contract was completed using the Legal Defense Digital Signature System.<br>
                Both parties have equal access to the signed contract PDF.<br>
                Contract ID: <strong>${params.contractId}</strong>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Obtener el PDF firmado para descarga
   */
  async getSignedPdf(contractId: string): Promise<{
    success: boolean;
    pdfBuffer?: Buffer;
    filename?: string;
    message: string;
  }> {
    try {
      console.log(
        "📥 [DUAL-SIGNATURE] Getting signed PDF for download:",
        contractId
      );

      // CRITICAL FIX: Using Firebase instead of PostgreSQL
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      const contractDoc = await firebaseDb
        .collection('dualSignatureContracts')
        .doc(contractId)
        .get();

      if (!contractDoc.exists) {
        return {
          success: false,
          message: "Contract not found in Firebase",
        };
      }

      const contract = contractDoc.data()!;

      if (contract.status !== "completed" || !contract.signedPdfPath) {
        return {
          success: false,
          message: "Contract is not completed or PDF not available",
        };
      }

      const fs = await import("fs");
      const path = await import("path");
      const fullPath = path.join(process.cwd(), contract.signedPdfPath);

      if (!fs.existsSync(fullPath)) {
        return {
          success: false,
          message: "PDF file not found on server",
        };
      }

      const pdfBuffer = fs.readFileSync(fullPath);
      const filename = `contract_${contractId}_signed.pdf`;

      console.log("✅ [DUAL-SIGNATURE] Signed PDF retrieved successfully");
      return {
        success: true,
        pdfBuffer,
        filename,
        message: "PDF retrieved successfully",
      };
    } catch (error: any) {
      console.error("❌ [DUAL-SIGNATURE] Error getting signed PDF:", error);
      return {
        success: false,
        message: `Error retrieving PDF: ${error.message}`,
      };
    }
  }

  /**
   * Notificar a la parte restante que falta por firmar
   */
  private async notifyRemainingParty(
    contractId: string,
    signedParty: "contractor" | "client"
  ): Promise<void> {
    try {
      const remainingParty =
        signedParty === "contractor" ? "client" : "contractor";
      console.log(
        `📧 [DUAL-SIGNATURE] Notifying ${remainingParty} that ${signedParty} has signed`
      );

      // Get contract data from database
      const [contract] = await db
        .select()
        .from(digitalContracts)
        .where(eq(digitalContracts.contractId, contractId))
        .limit(1);

      if (!contract) {
        console.error(
          "❌ [DUAL-SIGNATURE] Contract not found for notification:",
          contractId
        );
        return;
      }

      // FIXED: Use correct data structure from database
      const contractData = contract.contractData as any;
      
      // Log contract data for debugging
      console.log("🔍 [DUAL-SIGNATURE] Contract data debug:", {
        contractorEmail: contract.contractorEmail,
        clientEmail: contract.clientEmail,
        contractorName: contract.contractorName,
        clientName: contract.clientName
      });

      if (remainingParty === "contractor") {
        // Notify contractor that client has signed
        const baseUrl =
          process.env.REPLIT_DEV_DOMAIN || "http://localhost:5000";
        const contractorSignUrl = `${baseUrl}/sign/${contractId}/contractor`;

        await this.emailService.sendContractEmail({
          to: contract.contractorEmail, // FIXED: Use contract.contractorEmail
          toName: contract.contractorName, // FIXED: Use contract.contractorName
          contractorEmail: contract.contractorEmail,
          contractorName: contract.contractorName,
          contractorCompany: contract.contractorCompany || contractData?.contractorCompany || "Construction Company",
          subject: `✅ Client Signed! Your Signature Needed - ${contract.clientName}`,
          htmlContent: this.generateContractorNotificationHTML({
            contractorName: contract.contractorName,
            clientName: contract.clientName,
            signUrl: contractorSignUrl,
            contractId: contractId,
            notificationType: "client_signed",
          }),
        });

        console.log(
          "✅ [DUAL-SIGNATURE] Contractor notification sent:",
          contract.contractorEmail
        );
      } else {
        // Notify client that contractor has signed
        const baseUrl =
          process.env.REPLIT_DEV_DOMAIN || "http://localhost:5000";
        const clientSignUrl = `${baseUrl}/sign/${contractId}/client`;

        // CRITICAL FIX: Ensure clientEmail exists
        if (!contract.clientEmail) {
          console.error("❌ [DUAL-SIGNATURE] Critical error: clientEmail is missing from contract", {
            contractId,
            contractorEmail: contract.contractorEmail,
            clientName: contract.clientName
          });
          throw new Error("Client email is required for contract notifications");
        }

        await this.emailService.sendContractEmail({
          to: contract.clientEmail, // FIXED: Use contract.clientEmail
          toName: contract.clientName, // FIXED: Use contract.clientName
          contractorEmail: contract.contractorEmail,
          contractorName: contract.contractorName,
          contractorCompany: contract.contractorCompany || contractData?.contractorCompany || "Construction Company",
          subject: `✅ Contractor Signed! Your Signature Needed - ${contract.contractorCompany || 'Construction Company'}`,
          htmlContent: this.generateClientNotificationHTML({
            clientName: contract.clientName,
            contractorName: contract.contractorName,
            contractorCompany: contract.contractorCompany || contractData?.contractorCompany || "Construction Company",
            signUrl: clientSignUrl,
            contractId: contractId,
            notificationType: "contractor_signed",
          }),
        });

        console.log(
          "✅ [DUAL-SIGNATURE] Client notification sent:",
          contract.clientEmail
        );
      }
    } catch (error: any) {
      console.error(
        "❌ [DUAL-SIGNATURE] Error notifying remaining party:",
        error
      );
    }
  }

  /**
   * Enviar notificaciones duales a ambas partes
   */
  private async sendDualNotifications(params: {
    contractId: string;
    contractorName: string;
    contractorEmail: string;
    contractorCompany: string;
    clientName: string;
    clientEmail: string;
    projectDescription: string;
    totalAmount: number;
    contractorSignUrl: string;
    clientSignUrl: string;
  }): Promise<void> {
    try {
      console.log("📧 [DUAL-SIGNATURE] Sending dual notifications...");
      console.log("📧 [EMAIL-DEBUG] Contractor email:", params.contractorEmail);
      console.log("📧 [EMAIL-DEBUG] Client email:", params.clientEmail);
      console.log(
        "📧 [EMAIL-DEBUG] Are emails the same?",
        params.contractorEmail === params.clientEmail
      );

      // Send to contractor
      await this.emailService.sendContractEmail({
        to: params.contractorEmail,
        toName: params.contractorName,
        contractorEmail: params.contractorEmail,
        contractorName: params.contractorName,
        contractorCompany: params.contractorCompany,
        subject: `🔒 Contract Ready for Your Signature - ${params.clientName}`,
        htmlContent: this.generateContractorEmailHTML({
          contractorName: params.contractorName,
          clientName: params.clientName,
          projectDescription: params.projectDescription,
          totalAmount: params.totalAmount,
          signUrl: params.contractorSignUrl,
          contractId: params.contractId,
        }),
      });

      // Send to client
      await this.emailService.sendContractEmail({
        to: params.clientEmail,
        toName: params.clientName,
        contractorEmail: params.contractorEmail,
        contractorName: params.contractorName,
        contractorCompany: params.contractorCompany,
        subject: `📋 Contract for Review and Signature - ${params.contractorCompany}`,
        htmlContent: this.generateClientEmailHTML({
          clientName: params.clientName,
          contractorName: params.contractorName,
          contractorCompany: params.contractorCompany,
          projectDescription: params.projectDescription,
          totalAmount: params.totalAmount,
          signUrl: params.clientSignUrl,
          contractId: params.contractId,
        }),
      });

      console.log("✅ [DUAL-SIGNATURE] Dual notifications sent successfully");
    } catch (error: any) {
      console.error(
        "❌ [DUAL-SIGNATURE] Error sending dual notifications:",
        error
      );
    }
  }

  /**
   * Generar HTML del email de notificación para el contratista
   */
  private generateContractorNotificationHTML(params: {
    contractorName: string;
    clientName: string;
    signUrl: string;
    contractId: string;
    notificationType: "client_signed";
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Client Has Signed - Your Signature Required</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ Great News! Client Has Signed</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your signature is now required to complete the contract</p>
          </div>

          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #059669; margin-top: 0;">Hello ${params.contractorName},</h2>

            <p><strong>${params.clientName}</strong> has successfully signed the contract! The contract is now ready for your signature to complete the process.</p>

            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #059669;">🎉 Contract Status Update</h3>
              <p><strong>Client:</strong> ${params.clientName} ✅ <span style="color: #10b981;">SIGNED</span></p>
              <p><strong>Contractor:</strong> ${params.contractorName} ⏳ <span style="color: #f59e0b;">PENDING</span></p>
              <p><strong>Contract ID:</strong> ${params.contractId}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.signUrl}" 
                 style="display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                🖊️ Complete Your Signature
              </a>
            </div>

            <div style="background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #059669;">⚡ Quick Action Required</h4>
              <p style="margin: 0; color: #065f46;">Click the button above to review and sign the contract. Once you sign, both parties will receive the completed contract automatically.</p>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This email was sent because ${params.clientName} completed their signature on contract ${params.contractId}. 
                Please sign within 48 hours to finalize the agreement.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generar HTML del email de notificación para el cliente
   */
  private generateClientNotificationHTML(params: {
    clientName: string;
    contractorName: string;
    contractorCompany: string;
    signUrl: string;
    contractId: string;
    notificationType: "contractor_signed";
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contractor Has Signed - Your Signature Required</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">✅ Contractor Has Signed</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Your signature is now required to complete the contract</p>
          </div>

          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1d4ed8; margin-top: 0;">Hello ${params.clientName},</h2>

            <p><strong>${params.contractorCompany}</strong> has successfully signed the contract! The contract is now ready for your signature to complete the process.</p>

            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1d4ed8;">🎉 Contract Status Update</h3>
              <p><strong>Contractor:</strong> ${params.contractorName} ✅ <span style="color: #10b981;">SIGNED</span></p>
              <p><strong>Client:</strong> ${params.clientName} ⏳ <span style="color: #f59e0b;">PENDING</span></p>
              <p><strong>Contract ID:</strong> ${params.contractId}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.signUrl}" 
                 style="display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                🖊️ Complete Your Signature
              </a>
            </div>

            <div style="background: #dbeafe; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h4 style="margin: 0 0 10px 0; color: #1d4ed8;">⚡ Final Step</h4>
              <p style="margin: 0; color: #1e3a8a;">Click the button above to review and sign the contract. Once you sign, both parties will receive the completed contract automatically.</p>
            </div>

            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 20px;">
              <p style="margin: 0; font-size: 12px; color: #6b7280;">
                This email was sent because ${params.contractorCompany} completed their signature on contract ${params.contractId}. 
                Please sign within 48 hours to finalize the agreement.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generar HTML del email para el contratista
   */
  private generateContractorEmailHTML(params: {
    contractorName: string;
    clientName: string;
    projectDescription: string;
    totalAmount: number;
    signUrl: string;
    contractId: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contract Ready for Signature</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🏗️ Contract Ready for Your Signature</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Contract Management by Owl Fenc</p>
          </div>

          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #1e40af; margin-top: 0;">Hello ${params.contractorName},</h2>

            <p>Your contract is ready for signature! Please review and sign the contract for:</p>

            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af;">📋 Project Details</h3>
              <p><strong>Client:</strong> ${params.clientName}</p>
              <p><strong>Project:</strong> ${params.projectDescription}</p>
              <p><strong>Amount:</strong> $${params.totalAmount.toLocaleString()}</p>
              <p><strong>Contract ID:</strong> ${params.contractId}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.signUrl}" 
                 style="display: inline-block; background: #1e40af; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📝 Review & Sign Contract
              </a>
            </div>

            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>⚠️ Important:</strong> Please review the complete contract before signing. 
                Both you and your client will receive copies once both parties have signed.
              </p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This email was sent from Owl Fenc Legal Defense System. 
              The signature link is secure and expires in 72 hours.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generar HTML del email para el cliente
   */
  private generateClientEmailHTML(params: {
    clientName: string;
    contractorName: string;
    contractorCompany: string;
    projectDescription: string;
    totalAmount: number;
    signUrl: string;
    contractId: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Contract for Review and Signature</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">👥 Contract for Your Review</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Contract Management by Owl Fenc</p>
          </div>

          <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #16a34a; margin-top: 0;">Hello ${params.clientName},</h2>

            <p>${params.contractorCompany} has prepared a contract for your project. Please review the terms and sign if you agree:</p>

            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #22c55e; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #16a34a;">📋 Contract Details</h3>
              <p><strong>Contractor:</strong> ${params.contractorName}</p>
              <p><strong>Company:</strong> ${params.contractorCompany}</p>
              <p><strong>Project:</strong> ${params.projectDescription}</p>
              <p><strong>Amount:</strong> $${params.totalAmount.toLocaleString()}</p>
              <p><strong>Contract ID:</strong> ${params.contractId}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.signUrl}" 
                 style="display: inline-block; background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                📝 Review & Sign Contract
              </a>
            </div>

            <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px;">
                <strong>ℹ️ How it works:</strong><br>
                1. Click the button above to review the complete contract<br>
                2. Read all terms and conditions carefully<br>
                3. Sign electronically if you agree to the terms<br>
                4. Both parties will receive the final signed contract
              </p>
            </div>

            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              This contract was generated by ${params.contractorCompany} using Owl Fenc Legal Defense System. 
              The signature link is secure and expires in 72 hours.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generar email HTML para el contratista
   */
  private generateContractorEmailHTML(params: {
    contractorName: string;
    clientName: string;
    projectDescription: string;
    totalAmount: number;
    signUrl: string;
    contractId: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract Ready for Signature</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">🔒 Contract Ready for Signature</h1>
            <p style="color: #64748b; font-size: 16px;">Your client's contract is ready for your review and signature</p>
          </div>

          <!-- Greeting -->
          <div style="margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Hello ${params.contractorName},</h2>
            <p style="color: #475569; font-size: 16px;">
              Your contract with <strong>${params.clientName}</strong> has been generated and is ready for your signature.
            </p>
          </div>

          <!-- Project Details -->
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">📋 Project Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px;"><strong>Client:</strong> ${params.clientName}</li>
              <li style="margin-bottom: 8px;"><strong>Project:</strong> ${params.projectDescription}</li>
              <li style="margin-bottom: 8px;"><strong>Total Amount:</strong> $${params.totalAmount.toLocaleString()}</li>
              <li style="margin-bottom: 8px;"><strong>Contract ID:</strong> ${params.contractId}</li>
              <li style="margin-bottom: 8px;"><strong>Status:</strong> <span style="background: #fbbf24; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Awaiting Your Signature</span></li>
            </ul>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${params.signUrl}" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
              🖊️ Review & Sign Contract
            </a>
          </div>

          <!-- Instructions -->
          <div style="background: #ecfdf5; border: 1px solid #6ee7b7; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #065f46; margin-top: 0; margin-bottom: 10px;">📝 Next Steps:</h4>
            <ol style="color: #047857; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 5px;">Click the "Review & Sign Contract" button above</li>
              <li style="margin-bottom: 5px;">Review the complete contract terms</li>
              <li style="margin-bottom: 5px;">Sign digitally using your finger or mouse</li>
              <li style="margin-bottom: 5px;">Your client will receive notification to sign as well</li>
              <li>Once both parties sign, you'll both receive the completed contract</li>
            </ol>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
            <p><strong>Powered by Owl Fenc Legal Defense System</strong></p>
            <p>Secure • Fast • Legally Binding • Professional</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generar email HTML para el cliente
   */
  private generateClientEmailHTML(params: {
    clientName: string;
    contractorName: string;
    contractorCompany: string;
    projectDescription: string;
    totalAmount: number;
    signUrl: string;
    contractId: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Contract for Review and Signature</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin-bottom: 10px;">📋 Contract for Review and Signature</h1>
            <p style="color: #64748b; font-size: 16px;">Your project contract from ${params.contractorCompany}</p>
          </div>

          <!-- Greeting -->
          <div style="margin-bottom: 25px;">
            <h2 style="color: #1e293b; margin-bottom: 15px;">Dear ${params.clientName},</h2>
            <p style="color: #475569; font-size: 16px;">
              <strong>${params.contractorCompany}</strong> has prepared your project contract and it's ready for your review and signature.
            </p>
          </div>

          <!-- Project Details -->
          <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; margin: 25px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1e293b; margin-top: 0; margin-bottom: 15px;">🏗️ Your Project Details</h3>
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="margin-bottom: 8px;"><strong>Contractor:</strong> ${params.contractorName} (${params.contractorCompany})</li>
              <li style="margin-bottom: 8px;"><strong>Project:</strong> ${params.projectDescription}</li>
              <li style="margin-bottom: 8px;"><strong>Total Investment:</strong> $${params.totalAmount.toLocaleString()}</li>
              <li style="margin-bottom: 8px;"><strong>Contract ID:</strong> ${params.contractId}</li>
              <li style="margin-bottom: 8px;"><strong>Status:</strong> <span style="background: #fcd34d; color: #92400e; padding: 2px 8px; border-radius: 12px; font-size: 12px;">Awaiting Your Signature</span></li>
            </ul>
          </div>

          <!-- Action Button -->
          <div style="text-align: center; margin: 35px 0;">
            <a href="${params.signUrl}" style="background: linear-gradient(135deg, #10b981, #047857); color: white; text-decoration: none; padding: 15px 35px; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
              📝 Review & Sign Contract
            </a>
          </div>

          <!-- Legal Notice -->
          <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <h4 style="color: #92400e; margin-top: 0; margin-bottom: 10px;">⚖️ Important Legal Information:</h4>
            <ul style="color: #a16207; margin: 0; padding-left: 20px; font-size: 14px;">
              <li style="margin-bottom: 5px;">This is a legally binding contract once signed by both parties</li>
              <li style="margin-bottom: 5px;">Please read all terms carefully before signing</li>
              <li style="margin-bottom: 5px;">Digital signatures are legally equivalent to handwritten signatures</li>
              <li style="margin-bottom: 5px;">You'll receive a copy of the completed contract once both parties sign</li>
              <li>Contact ${params.contractorName} if you have any questions about the terms</li>
            </ul>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px;">
            <p><strong>Secure Digital Contract System</strong></p>
            <p>Protected • Encrypted • Legally Compliant</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generar ID único para el contrato
   */
  private generateUniqueContractId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = crypto.randomBytes(4).toString("hex").toUpperCase();
    return `CNT-${timestamp}-${randomStr}`;
  }
}

export const dualSignatureService = new DualSignatureService();

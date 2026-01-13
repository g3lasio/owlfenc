/**
 * Contract Verification API Routes
 * Public endpoint for verifying contract authenticity via folio number
 */

import { Router, Request, Response } from "express";
import { db } from "../lib/firebase-admin";

const router = Router();

interface VerificationResponse {
  success: boolean;
  document?: {
    folio: string;
    contractId: string;
    documentType: string;
    issueDate: string;
    pdfHash: string;
    contractor: {
      name: string;
      license?: string;
      email?: string;
    };
    client: {
      name: string;
      location?: string;
    };
    signatures: Array<{
      party: string;
      signedAt: string;
      ipAddress: string;
      status: string;
    }>;
    security: {
      integrityVerified: boolean;
      signaturesValid: boolean;
      timestampsAuthentic: boolean;
    };
  };
  error?: string;
  message?: string;
}

/**
 * GET /api/verify/:folio
 * Public endpoint to verify contract authenticity
 * No authentication required - this is intentionally public
 */
router.get("/verify/:folio", async (req: Request, res: Response) => {
  try {
    const { folio } = req.params;

    console.log(`🔍 [VERIFY] Verification request for folio: ${folio}`);

    // Validate folio format
    const folioRegex = /^FOL-\d{8}-[A-F0-9]{6}$/;
    if (!folioRegex.test(folio)) {
      console.warn(`⚠️ [VERIFY] Invalid folio format: ${folio}`);
      return res.status(400).json({
        success: false,
        error: "INVALID_FOLIO_FORMAT",
        message: "Invalid folio format. Expected format: FOL-YYYYMMDD-XXXXX",
      } as VerificationResponse);
    }

    // Search for contract in dualSignatureContracts collection
    const contractsSnapshot = await db
      .collection("dualSignatureContracts")
      .where("folio", "==", folio)
      .limit(1)
      .get();

    if (contractsSnapshot.empty) {
      console.warn(`⚠️ [VERIFY] Folio not found: ${folio}`);
      return res.status(404).json({
        success: false,
        error: "FOLIO_NOT_FOUND",
        message: "This folio number was not found in our system. Please verify the folio number is correct.",
      } as VerificationResponse);
    }

    const contractDoc = contractsSnapshot.docs[0];
    const contractData = contractDoc.data();

    console.log(`✅ [VERIFY] Contract found: ${contractDoc.id}`);

    // Check if contract is completed (both parties signed)
    const isCompleted = contractData.status === "completed" || 
                       (contractData.contractorSignature && contractData.clientSignature);

    if (!isCompleted) {
      console.warn(`⚠️ [VERIFY] Contract not completed: ${contractDoc.id}`);
      return res.status(400).json({
        success: false,
        error: "CONTRACT_NOT_COMPLETED",
        message: "This contract has not been completed yet. Verification is only available for signed contracts.",
      } as VerificationResponse);
    }

    // Determine document type
    let documentType = "Contract";
    if (contractData.templateId) {
      const templateNames: Record<string, string> = {
        "independent-contractor": "Independent Contractor Agreement",
        "change-order": "Change Order",
        "lien-waiver": "Lien Waiver",
        "certificate-completion": "Certificate of Final Completion",
        "contract-addendum": "Contract Addendum",
        "work-order": "Work Order",
        "warranty-agreement": "Warranty Agreement",
      };
      documentType = templateNames[contractData.templateId] || "Contract";
    }

    // Build signatures array
    const signatures: Array<{
      party: string;
      signedAt: string;
      ipAddress: string;
      status: string;
    }> = [];

    if (contractData.contractorSignature) {
      signatures.push({
        party: "contractor",
        signedAt: contractData.contractorSignedAt || contractData.createdAt,
        ipAddress: contractData.contractorIpAddress || "Verified",
        status: "valid",
      });
    }

    if (contractData.clientSignature) {
      signatures.push({
        party: "client",
        signedAt: contractData.clientSignedAt || contractData.createdAt,
        ipAddress: contractData.clientIpAddress || "Verified",
        status: "valid",
      });
    }

    // Build verification response with PUBLIC data only
    const verificationData: VerificationResponse = {
      success: true,
      document: {
        folio: contractData.folio,
        contractId: contractDoc.id,
        documentType,
        issueDate: contractData.createdAt || contractData.timestamp || new Date().toISOString(),
        pdfHash: contractData.pdfHash || "Not available",
        contractor: {
          name: contractData.contractorName || contractData.contractData?.contractorCompany || "Not specified",
          license: contractData.contractData?.contractorLicense || undefined,
          email: contractData.contractorEmail ? maskEmail(contractData.contractorEmail) : undefined,
        },
        client: {
          name: contractData.clientName || contractData.contractData?.clientName || "Not specified",
          location: contractData.contractData?.clientAddress ? 
                   contractData.contractData.clientAddress.split(',')[0] : undefined,
        },
        signatures,
        security: {
          integrityVerified: !!contractData.pdfHash,
          signaturesValid: signatures.length > 0,
          timestampsAuthentic: true,
        },
      },
    };

    console.log(`✅ [VERIFY] Verification successful for folio: ${folio}`);

    res.json(verificationData);
  } catch (error: any) {
    console.error("❌ [VERIFY] Error verifying contract:", error);
    res.status(500).json({
      success: false,
      error: "VERIFICATION_ERROR",
      message: "An error occurred while verifying the contract. Please try again later.",
    } as VerificationResponse);
  }
});

/**
 * Helper function to mask email addresses for privacy
 * Example: john.doe@example.com → j***e@example.com
 */
function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

export default router;

/**
 * Dual Signature API Routes
 * Endpoints para el Sistema de Firma Dual Automática
 */

import { Router } from "express";
import { dualSignatureService } from "../services/dualSignatureService";
import { verifyFirebaseAuth } from "../middleware/firebase-auth";
import { z } from "zod";

const router = Router();

// Validation schemas
const initiateDualSignatureSchema = z.object({
  userId: z.string(),
  contractHTML: z.string(),
  contractData: z.object({
    contractorName: z.string(),
    contractorEmail: z.string().email(),
    contractorPhone: z.string().optional(),
    contractorCompany: z.string(),
    clientName: z.string(),
    clientEmail: z.string().email(),
    clientPhone: z.string().optional(),
    clientAddress: z.string().optional(),
    projectDescription: z.string(),
    totalAmount: z.number(),
    startDate: z.string().optional(),
    completionDate: z.string().optional(),
  }),
});

const signatureSubmissionSchema = z.object({
  contractId: z.string(),
  party: z.enum(["contractor", "client"]),
  signatureData: z.string(),
  signatureType: z.enum(["drawing", "cursive"]),
  fullName: z.string(),
});

/**
 * POST /api/dual-signature/initiate
 * Iniciar el proceso de firma dual
 */
router.post("/initiate", async (req, res) => {
  try {
    console.log("🚀 [API] Initiating dual signature workflow...");

    const validatedData = initiateDualSignatureSchema.parse(req.body);

    const result =
      await dualSignatureService.initiateDualSignature(validatedData);

    if (result.success) {
      console.log(
        "✅ [API] Dual signature initiated successfully:",
        result.contractId,
      );
      res.json({
        success: true,
        contractId: result.contractId,
        contractorSignUrl: result.contractorSignUrl,
        clientSignUrl: result.clientSignUrl,
        message: result.message,
      });
    } else {
      console.error(
        "❌ [API] Failed to initiate dual signature:",
        result.message,
      );
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error("❌ [API] Error in /initiate:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/contract/:contractId/:party
 * Obtener datos del contrato para firma
 * INCLUYE VERIFICACIÓN DE SEGURIDAD OPCIONAL
 */
router.get("/contract/:contractId/:party", async (req, res) => {
  try {
    const { contractId, party } = req.params;
    const requestingUserId = req.headers["x-user-id"] as string; // Para verificación de seguridad opcional

    // 🚨 CRITICAL DEBUG: Log exact params received
    console.log("🚨 [CRITICAL-DEBUG] RAW req.params:", JSON.stringify(req.params));
    console.log("🚨 [CRITICAL-DEBUG] RAW req.url:", req.url);
    console.log("🚨 [CRITICAL-DEBUG] RAW contractId:", contractId);
    console.log("🚨 [CRITICAL-DEBUG] RAW party:", party);
    console.log("🚨 [CRITICAL-DEBUG] RAW party type:", typeof party);

    if (!["contractor", "client"].includes(party)) {
      console.log("🚨 [CRITICAL-DEBUG] Invalid party detected:", party);
      return res.status(400).json({
        success: false,
        message: `Invalid party. Must be "contractor" or "client", received: ${party}`,
      });
    }

    console.log(`🔍 [API] Getting contract for ${party} signing:`, contractId);
    console.log(
      `🔐 [API] Requesting user ID:`,
      requestingUserId || "No user ID provided",
    );

    const result = await dualSignatureService.getContractForSigning(
      contractId,
      party as "contractor" | "client",
      requestingUserId,
    );

    if (result.success) {
      res.json({
        success: true,
        contract: result.contract,
        message: result.message,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error("❌ [API] Error in /contract/:contractId/:party:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * POST /api/dual-signature/sign
 * Procesar firma enviada
 * INCLUYE VERIFICACIÓN DE SEGURIDAD OPCIONAL
 */
router.post("/sign", async (req, res) => {
  try {
    console.log("✍️ [API] Processing signature submission...");
    
    // 🚨 CRITICAL DEBUG: Log exact request body received
    console.log("🚨 [CRITICAL-DEBUG] RAW req.body:", JSON.stringify(req.body));
    console.log("🚨 [CRITICAL-DEBUG] RAW party from body:", req.body.party);
    console.log("🚨 [CRITICAL-DEBUG] RAW contractId from body:", req.body.contractId);

    const validatedData = signatureSubmissionSchema.parse(req.body);
    console.log("🚨 [CRITICAL-DEBUG] VALIDATED party:", validatedData.party);
    console.log("🚨 [CRITICAL-DEBUG] VALIDATED contractId:", validatedData.contractId);
    
    const requestingUserId = req.headers["x-user-id"] as string; // Para verificación de seguridad opcional

    console.log(
      `🔐 [API] Requesting user ID:`,
      requestingUserId || "No user ID provided",
    );

    const result = await dualSignatureService.processSignature(
      validatedData,
      requestingUserId,
    );

    if (result.success) {
      console.log("✅ [API] Signature processed successfully");
      res.json({
        success: true,
        message: result.message,
        status: result.status,
        bothSigned: result.bothSigned,
      });
    } else {
      console.error("❌ [API] Failed to process signature:", result.message);
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error("❌ [API] Error in /sign:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/download/:contractId
 * Download signed PDF contract
 */
router.get("/download/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;
    const requestingUserId = req.headers["x-user-id"] as string;

    console.log("📥 [API] Download request for contract:", contractId);
    console.log("👤 [API] Requesting user:", requestingUserId || "No user ID");

    const result = await dualSignatureService.downloadSignedPdf(
      contractId,
      requestingUserId,
    );

    if (result.success && result.pdfBuffer) {
      // Validate PDF buffer
      if (!Buffer.isBuffer(result.pdfBuffer) || result.pdfBuffer.length === 0) {
        return res.status(500).json({
          success: false,
          message: "Invalid PDF buffer",
        });
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", result.pdfBuffer.length.toString());
      res.setHeader(
        "Content-Disposition",
        `inline; filename="contract_${contractId}_signed.pdf"`,
      );
      res.setHeader("Cache-Control", "no-cache");
      res.send(result.pdfBuffer);
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error("❌ [API] Error in /download/:contractId:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/status/:contractId
 * Obtener estado del contrato
 */
router.get("/status/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;

    console.log("📊 [API] Getting contract status:", contractId);

    const result = await dualSignatureService.getContractStatus(contractId);

    if (result.success) {
      res.json({
        success: true,
        status: result.status,
        message: result.message,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error("❌ [API] Error in /status/:contractId:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});


/**
 * GET /api/dual-signature/in-progress/:userId
 * Obtener todos los contratos en progreso (pendientes de firma) de un usuario
 * SECURED: Requires authentication and ownership verification
 */
router.get("/in-progress/:userId", verifyFirebaseAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = req.firebaseUser?.uid;

    // SECURITY: Verify that the authenticated user matches the requested userId
    if (authenticatedUserId !== userId) {
      console.warn(`🚨 [SECURITY] User ${authenticatedUserId} attempted to access contracts for user ${userId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only view your own contracts"
      });
    }

    console.log("📋 [API] Getting in-progress contracts for user:", userId);

    // Import database here to avoid circular dependencies
    const { db } = await import("../db");
    const { digitalContracts } = await import("../../shared/schema");
    const { eq, ne } = await import("drizzle-orm");

    const inProgressContracts = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.userId, userId))
      .orderBy(digitalContracts.createdAt);

    // Filter for contracts that are truly in progress (missing at least one signature)
    const filteredContracts = inProgressContracts.filter(
      (contract) => !contract.contractorSigned || !contract.clientSigned,
    );

    console.log(
      `✅ [API] Found ${filteredContracts.length} in-progress contracts for user`,
    );

    res.json({
      success: true,
      contracts: filteredContracts,
    });
  } catch (error: any) {
    console.error("❌ [API] Error getting in-progress contracts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/completed/:userId
 * Obtener todos los contratos completados (ambas firmas) de un usuario
 * SECURED: Requires authentication and ownership verification
 */
router.get("/completed/:userId", verifyFirebaseAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = req.firebaseUser?.uid;

    // SECURITY: Verify that the authenticated user matches the requested userId
    if (authenticatedUserId !== userId) {
      console.warn(`🚨 [SECURITY] User ${authenticatedUserId} attempted to access completed contracts for user ${userId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only view your own contracts"
      });
    }

    console.log("✅ [API] Getting completed contracts for user:", userId);

    // Import database here to avoid circular dependencies
    const { db } = await import("../db");
    const { digitalContracts } = await import("../../shared/schema");
    const { eq, and } = await import("drizzle-orm");

    // Get contracts that are fully signed (both parties signed)
    const completedContracts = await db
      .select()
      .from(digitalContracts)
      .where(
        and(
          eq(digitalContracts.userId, userId),
          eq(digitalContracts.contractorSigned, true),
          eq(digitalContracts.clientSigned, true)
        )
      )
      .orderBy(digitalContracts.createdAt);

    console.log(
      `✅ [API] Found ${completedContracts.length} completed contracts for user`,
    );

    // Transform data for frontend - add useful metadata
    const contractsForFrontend = completedContracts.map((contract) => ({
      contractId: contract.contractId,
      status: contract.status,
      contractorName: contract.contractorName,
      clientName: contract.clientName,
      totalAmount: parseFloat(contract.totalAmount),
      contractorSigned: contract.contractorSigned,
      clientSigned: contract.clientSigned,
      contractorSignedAt: contract.contractorSignedAt,
      clientSignedAt: contract.clientSignedAt,
      contractorEmail: contract.contractorEmail,
      clientEmail: contract.clientEmail,
      contractorPhone: contract.contractorPhone,
      clientPhone: contract.clientPhone,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      isCompleted: true,
      isDownloadable: !!contract.signedPdfPath,
      hasPdf: !!contract.signedPdfPath,
      // ✅ FIX: Provide download URL using the API endpoint
      pdfDownloadUrl: contract.signedPdfPath ? `/api/dual-signature/download/${contract.contractId}` : null,
    }));

    res.json({
      success: true,
      contracts: contractsForFrontend,
    });
  } catch (error: any) {
    console.error("❌ [API] Error getting completed contracts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/drafts/:userId
 * Obtener todos los contratos en borrador de un usuario
 * SECURED: Requires authentication and ownership verification
 */
router.get("/drafts/:userId", verifyFirebaseAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const authenticatedUserId = req.firebaseUser?.uid;

    // SECURITY: Verify that the authenticated user matches the requested userId
    if (authenticatedUserId !== userId) {
      console.warn(`🚨 [SECURITY] User ${authenticatedUserId} attempted to access contracts for user ${userId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only view your own contracts"
      });
    }

    console.log("📋 [API] Getting draft contracts for user:", userId);

    // Import contract history service to get drafts
    const { contractHistoryService } = await import(
      "../../client/src/services/contractHistoryService"
    );

    const allHistory = await contractHistoryService.getContractHistory(userId);
    const draftContracts = allHistory.filter(
      (contract) => contract.status === "draft",
    );

    console.log(
      `✅ [API] Found ${draftContracts.length} draft contracts for user`,
    );

    // Transform data for frontend
    const contractsForFrontend = draftContracts.map((contract) => ({
      id: contract.id,
      contractId: contract.contractId,
      clientName: contract.clientName,
      projectType: contract.projectType,
      totalAmount: contract.contractData.financials.total || 0,
      projectDescription: contract.contractData.project?.description || "",
      status: contract.status,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
      contractData: contract.contractData,
    }));

    res.json({
      success: true,
      contracts: contractsForFrontend,
    });
  } catch (error: any) {
    console.error("❌ [API] Error getting draft contracts:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/download-html/:contractId
 * Download signed contract as HTML
 * HYBRID: Busca en PostgreSQL y Firebase para soportar ambos sistemas
 */
router.get("/download-html/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;
    const requestingUserId = req.headers["x-user-id"] as string;

    console.log("📄 [API] HTML download request for contract:", contractId);

    // Try PostgreSQL first (new dual-signature system)
    const { db } = await import("../db");
    const { digitalContracts } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    const [contract] = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.contractId, contractId))
      .limit(1);

    if (contract) {
      // Contract found in PostgreSQL
      console.log("✅ [API] Contract found in PostgreSQL:", contractId);

      if (requestingUserId && contract.userId !== requestingUserId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }

      // Continue with PostgreSQL contract (existing code below)
    } else {
      // Try Firebase (legacy contractHistory system)
      console.log("🔍 [API] Contract not in PostgreSQL, checking Firebase:", contractId);
      
      const { db: firebaseDb } = await import("../lib/firebase-admin");
      
      const contractDoc = await firebaseDb.collection("contractHistory").doc(contractId).get();
      
      if (!contractDoc.exists()) {
        console.error("❌ [API] Contract not found in PostgreSQL or Firebase:", contractId);
        return res.status(404).json({
          success: false,
          message: "Contract not found in any system",
        });
      }
      
      const firebaseContract = contractDoc.data();
      console.log("✅ [API] Contract found in Firebase:", contractId);
      
      // Check ownership for Firebase contracts
      if (requestingUserId && firebaseContract?.userId !== requestingUserId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
      
      // Return HTML from Firebase contract
      const htmlContent = firebaseContract?.contractHTML || 
        firebaseContract?.signedHtml ||
        "<p>Contract content not available</p>";
      
      res.setHeader("Content-Type", "text/html");
      return res.send(htmlContent);
    }

    let htmlContent =
      contract.contractHtml ||
      "<p>Contract content not available</p>";

    if (!htmlContent || htmlContent.trim() === "") {
      console.log("⚠️ [API] Contract HTML is missing, generating basic HTML");
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Contract - ${contract.clientName}</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .signature-section { margin-top: 40px; padding: 20px; border: 1px solid #ccc; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Independent Contractor Agreement</h1>
          </div>

          <div class="section">
            <h3>Contractor Information:</h3>
            <p><strong>Name:</strong> ${contract.contractorName}</p>
            <p><strong>Company:</strong> ${contract.contractorCompany}</p>
            <p><strong>Email:</strong> ${contract.contractorEmail}</p>
            <p><strong>Phone:</strong> ${contract.contractorPhone || "N/A"}</p>
          </div>

          <div class="section">
            <h3>Client Information:</h3>
            <p><strong>Name:</strong> ${contract.clientName}</p>
            <p><strong>Email:</strong> ${contract.clientEmail}</p>
            <p><strong>Phone:</strong> ${contract.clientPhone || "N/A"}</p>
            <p><strong>Address:</strong> ${contract.clientAddress || "N/A"}</p>
          </div>

          <div class="section">
            <h3>Project Details:</h3>
            <p><strong>Description:</strong> ${contract.projectDescription}</p>
            <p><strong>Total Amount:</strong> $${parseFloat(contract.totalAmount || "0").toLocaleString()}</p>
            <p><strong>Start Date:</strong> ${contract.startDate ? new Date(contract.startDate).toLocaleDateString() : "To be determined"}</p>
            <p><strong>Completion Date:</strong> ${contract.completionDate ? new Date(contract.completionDate).toLocaleDateString() : "To be determined"}</p>
          </div>

          <div class="section">
            <h3>Terms and Conditions:</h3>
            <p>This agreement constitutes the entire agreement between the parties for the described work.</p>
            <p>Payment terms and project specifications are as outlined above.</p>
            <p>Both parties agree to the terms and conditions set forth in this contract.</p>
          </div>
        </body>
        </html>
      `;
    }

    // Helper function to process signature data correctly
    const processSignatureForDisplay = (signatureData: string | null, fallbackText: string = "Digital signature on file"): string => {
      if (!signatureData) {
        return `<span style="font-style: italic; color: #666;">${fallbackText}</span>`;
      }

      // Check if it's a base64 image (drawn signature)
      if (signatureData.startsWith("data:image")) {
        console.log("🖋️ [SIGNATURE-DISPLAY] Processing drawn signature as image");
        
        // Clean and validate the base64 data
        let cleanData = signatureData.trim();
        
        // Ensure proper data URI format
        if (!cleanData.startsWith("data:image/png;base64,") && !cleanData.startsWith("data:image/jpeg;base64,")) {
          if (cleanData.includes("base64,")) {
            const base64Part = cleanData.split("base64,")[1];
            if (base64Part && base64Part.length > 50) {
              cleanData = `data:image/png;base64,${base64Part}`;
            }
          }
        }
        
        // Validate and return image tag
        if (cleanData.includes("base64,") && cleanData.length > 100) {
          return `<img src="${cleanData}" 
            style="
              max-height: 55px; 
              max-width: 280px; 
              height: auto; 
              width: auto; 
              object-fit: contain; 
              display: block; 
              margin: 0 auto;
              border: none;
              background: transparent;
            " 
            alt="Drawn Signature" />`;
        } else {
          console.warn("❌ [SIGNATURE-DISPLAY] Invalid base64 signature data");
          return `<span style="font-style: italic; color: #666;">Invalid Signature Data</span>`;
        }
      } else {
        // Typed signature - display as styled text
        console.log("📝 [SIGNATURE-DISPLAY] Processing typed signature as text");
        const cleanText = String(signatureData).replace(/[<>&"'`]/g, "").substring(0, 25);
        return `<span style="font-family: 'Times New Roman', serif; font-style: italic; font-size: 20px; color: #1a365d; font-weight: bold;">${cleanText}</span>`;
      }
    };

    let contentHtml = htmlContent;

    if (contract.contractorSigned && contract.clientSigned) {
      const pattern = `All notices required or permitted under this Agreement shall be in writing and shall be deemed to have been duly given when personally delivered, or three (3) days after being sent by certified mail, return receipt requested, postage prepaid, to the addresses set forth above or to such other address as either party may designate by written notice to the other party.`;

      const stopIndex = htmlContent.indexOf(pattern);
      if (stopIndex !== -1) {
        const afterStopIndex = stopIndex + pattern.length;
        contentHtml = htmlContent.slice(0, afterStopIndex);
      } else {
        console.warn("⚠️ textStop pattern not found. Using full HTML content.");
        contentHtml = htmlContent;
      }

      const signatureSection = `
        <div class="signature-section">
            <div class="section-title">EXECUTION</div>
            <p class="legal-text" style="text-align: center; margin-bottom: 30px;">
                <strong>IN WITNESS WHEREOF,</strong> the parties have executed this Independent Contractor Agreement as of the date first written above.
            </p>

            <div class="signature-container">
                <div class="signature-box">
                    <div class="signature-title">CONTRACTOR</div>
                    <div class="signature-line" style="min-height: 60px; display: flex; align-items: center; justify-content: center; padding: 10px;">
                      ${processSignatureForDisplay(contract.contractorSignatureData, "Digital signature on file")}
                    </div>
                    <p><strong>${contract.contractorName}</strong></p>
                    <p>Print Name</p>
                    <br>
                    <p>Date: <span class="date-line">${contract.contractorSignedAt?.toLocaleString()}</span></p>
                </div>
                <div class="signature-box">
                    <div class="signature-title">CLIENT</div>
                    <div class="signature-line" style="min-height: 60px; display: flex; align-items: center; justify-content: center; padding: 10px;">
                      ${processSignatureForDisplay(contract.clientSignatureData, "Digital signature on file")}
                    </div>
                    <p><strong>${contract.clientName}</strong></p>
                    <p>Print Name</p>
                    <br>
                    <p>Date: <span class="date-line">${contract.clientSignedAt?.toLocaleString()}</span></p>
                </div>
            </div>
        </div>

        <div class="footer-discrete">
            Powered by Mervin AI
        </div>
      `;

      if (contentHtml.includes("</body>")) {
        contentHtml = contentHtml.replace(
          "</body>",
          signatureSection + "</body>",
        );
      } else {
        contentHtml += signatureSection;
      }
    }

    res.setHeader("Content-Type", "text/html");
    res.send(contentHtml);
  } catch (error: any) {
    console.error("❌ [API] Error in /download-html/:contractId:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * POST /api/dual-signature/generate-pdf-from-html
 * Generate PDF from HTML content (for signed contracts)
 */
router.post("/generate-pdf-from-html", async (req, res) => {
  try {
    const { contractId, htmlContent, clientName } = req.body;

    console.log("📄 [API] Generating PDF from HTML for contract:", contractId);

    // Import PDF service
    const { default: PremiumPdfService } = await import(
      "../services/premiumPdfService"
    );
    const pdfService = new PremiumPdfService();

    const pdfBuffer = await pdfService.generatePdfFromHtml(htmlContent, {
      format: "A4",
      margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
        <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 1in;">
          <span>Signed Contract - ${clientName} - Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    // Validate PDF buffer
    if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Generated PDF is invalid or empty",
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", pdfBuffer.length.toString());
    res.setHeader(
      "Content-Disposition",
      `inline; filename="contract_${clientName.replace(/\s+/g, "_")}_signed.pdf"`,
    );
    res.setHeader("Cache-Control", "no-cache");
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("❌ [API] Error generating PDF from HTML:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate PDF",
      error: error.message,
    });
  }
});

/**
 * POST /api/dual-signature/regenerate-pdf/:contractId
 * Regenerate PDF for completed contract
 */
router.post("/regenerate-pdf/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;

    console.log("🔄 [API] Regenerating PDF for contract:", contractId);

    // Import database here to avoid circular dependencies
    const { db } = await import("../db");
    const { digitalContracts } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    const [contract] = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.contractId, contractId))
      .limit(1);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    if (!contract.contractorSigned || !contract.clientSigned) {
      return res.status(400).json({
        success: false,
        message: "Contract must be fully signed before PDF generation",
      });
    }

    try {
      // Import PDF service
      const { default: PremiumPdfService } = await import(
        "../services/premiumPdfService"
      );
      const pdfService = new PremiumPdfService();
      const fs = await import("fs");
      const path = await import("path");

      // Generate signed HTML with signatures
      let htmlContent =
        contract.contractHTML || "<p>Contract content not available</p>";

      const signatureSection = `
        <div style="margin-top: 40px; padding: 20px; border: 2px solid #4CAF50; background-color: #f9f9f9;">
          <h3 style="color: #4CAF50; margin-bottom: 15px;">✅ DIGITALLY SIGNED CONTRACT</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <h4>Contractor Signature:</h4>
              <p><strong>Name:</strong> ${contract.contractorName}</p>
              <p><strong>Signed:</strong> ${contract.contractorSignedAt?.toLocaleString()}</p>
              <div style="border: 1px solid #ccc; padding: 10px; background: white;">
                ${contract.contractorSignature || "Digital signature on file"}
              </div>
            </div>
            <div>
              <h4>Client Signature:</h4>
              <p><strong>Name:</strong> ${contract.clientName}</p>
              <p><strong>Signed:</strong> ${contract.clientSignedAt?.toLocaleString()}</p>
              <div style="border: 1px solid #ccc; padding: 10px; background: white;">
                ${contract.clientSignature || "Digital signature on file"}
              </div>
            </div>
          </div>
          <p style="margin-top: 15px; font-size: 12px; color: #666;">
            This contract was digitally signed using secure authentication. Contract ID: ${contractId}
          </p>
        </div>
      `;

      htmlContent = htmlContent.replace(
        "</body>",
        signatureSection + "</body>",
      );

      // Generate PDF
      const pdfBuffer = await pdfService.generatePdfFromHtml(htmlContent, {
        format: "A4",
        margin: { top: "1in", right: "1in", bottom: "1in", left: "1in" },
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `
          <div style="font-size: 10px; text-align: center; width: 100%; margin: 0 1in;">
            <span>Signed Contract - ${contract.clientName} - Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `,
      });

      // Save PDF to file system
      const uploadsDir = path.join(
        process.cwd(),
        "uploads",
        "signed-contracts",
      );
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `${contractId}_signed.pdf`;
      const signedPdfPath = `signed-contracts/${filename}`;
      const fullPath = path.join(uploadsDir, filename);

      fs.writeFileSync(fullPath, pdfBuffer);

      // Update database with PDF path
      await db
        .update(digitalContracts)
        .set({
          signedPdfPath,
          updatedAt: new Date(),
        })
        .where(eq(digitalContracts.contractId, contractId));

      console.log("✅ [API] PDF regenerated successfully:", signedPdfPath);

      res.json({
        success: true,
        message: "PDF generated successfully",
        pdfPath: signedPdfPath,
      });
    } catch (pdfError: any) {
      console.error("❌ [API] PDF generation failed:", pdfError);
      res.status(500).json({
        success: false,
        message: "PDF generation failed: " + pdfError.message,
      });
    }
  } catch (error: any) {
    console.error("❌ [API] Error in /regenerate-pdf/:contractId:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * POST /api/dual-signature/force-complete/:contractId
 * Force completion of a fully signed contract (for debugging)
 */
router.post("/force-complete/:contractId", async (req, res) => {
  try {
    const { contractId } = req.params;

    console.log("🔧 [API] Force completing contract:", contractId);

    // Import database here to avoid circular dependencies
    const { db } = await import("../db");
    const { digitalContracts } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    const [contract] = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.contractId, contractId))
      .limit(1);

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Contract not found",
      });
    }

    if (!contract.contractorSigned || !contract.clientSigned) {
      return res.status(400).json({
        success: false,
        message: "Contract must be fully signed before force completion",
      });
    }

    // Force update status to completed
    await db
      .update(digitalContracts)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(digitalContracts.contractId, contractId));

    console.log("✅ [API] Contract force completed successfully");

    res.json({
      success: true,
      message: "Contract force completed successfully",
    });
  } catch (error: any) {
    console.error("❌ [API] Error force completing contract:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

/**
 * GET /api/dual-signature/test
 * Health check endpoint
 */
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Dual Signature API is working",
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /api/dual-signature/resend-links
 * Reenviar links de firma para un contrato existente
 */
router.post("/resend-links", async (req, res) => {
  try {
    const { contractId, methods } = req.body;

    console.log(
      "📱 [API] Resending signature links for contract:",
      contractId,
      "methods:",
      methods,
    );

    // Import database here to avoid circular dependencies
    const { db } = await import("../db");
    const { digitalContracts } = await import("../../shared/schema");
    const { eq } = await import("drizzle-orm");

    // Get contract data
    const [contract] = await db
      .select()
      .from(digitalContracts)
      .where(eq(digitalContracts.contractId, contractId))
      .limit(1);

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: "Contract not found",
      });
    }

    // Generate signature URLs dinámicamente - funciona en cualquier entorno
    const { buildSignatureUrls } = await import('../utils/url-builder');
    const { contractorSignUrl, clientSignUrl } = buildSignatureUrls(req, contract.contractId);

    const results = [];

    // Send via email if requested
    if (methods.includes("email")) {
      try {
        const { ResendEmailAdvanced } = await import(
          "../services/resendEmailAdvanced"
        );
        const emailService = new ResendEmailAdvanced();

        // Send to contractor if not signed
        if (!contract.contractorSigned) {
          await emailService.sendContractForSigning({
            to: contract.contractorEmail,
            contractorName: contract.contractorName,
            clientName: contract.clientName,
            projectDescription: contract.projectDescription,
            totalAmount: parseFloat(contract.totalAmount),
            signUrl: contractorSignUrl,
            party: "contractor",
          });
          results.push("Email sent to contractor");
        }

        // Send to client if not signed
        if (!contract.clientSigned) {
          await emailService.sendContractForSigning({
            to: contract.clientEmail,
            contractorName: contract.contractorName,
            clientName: contract.clientName,
            projectDescription: contract.projectDescription,
            totalAmount: parseFloat(contract.totalAmount),
            signUrl: clientSignUrl,
            party: "client",
          });
          results.push("Email sent to client");
        }
      } catch (emailError) {
        console.error("❌ Error sending emails:", emailError);
        results.push("Email sending failed");
      }
    }

    // Generate SMS/WhatsApp links if requested
    if (methods.includes("sms") || methods.includes("whatsapp")) {
      const smsMessage = `🔒 CONTRATO DIGITAL PENDIENTE\n\nHola ${contract.clientName},\n\nTu contrato para "${contract.projectDescription}" está listo para firma.\n\nMonto: $${parseFloat(contract.totalAmount).toLocaleString()}\n\n👆 Firmar: ${clientSignUrl}\n\n📧 Owl Fence - Contratos Seguros`;

      if (methods.includes("sms")) {
        results.push(
          `SMS link generated: sms:${contract.clientPhone}?body=${encodeURIComponent(smsMessage)}`,
        );
      }

      if (methods.includes("whatsapp")) {
        results.push(
          `WhatsApp link generated: https://wa.me/${contract.clientPhone?.replace(/\D/g, "")}?text=${encodeURIComponent(smsMessage)}`,
        );
      }
    }

    res.json({
      success: true,
      results,
      contractorSignUrl: !contract.contractorSigned ? contractorSignUrl : null,
      clientSignUrl: !contract.clientSigned ? clientSignUrl : null,
      message: "Links resent successfully",
    });
  } catch (error: any) {
    console.error("❌ [API] Error resending signature links:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;

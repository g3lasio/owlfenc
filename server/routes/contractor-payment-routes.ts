import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { contractorPaymentService } from "../services/contractorPaymentService";
import { storage } from "../storage";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

const router = Router();

// 🔒 Security helper: Map error messages to appropriate HTTP status codes
function getErrorStatusCode(errorMessage: string): number {
  const message = errorMessage.toLowerCase();
  if (message.includes('access denied') || message.includes('do not own')) {
    return 403; // Forbidden
  }
  if (message.includes('not found')) {
    return 404; // Not Found
  }
  if (message.includes('authentication')) {
    return 401; // Unauthorized
  }
  return 500; // Default to internal server error
}

// Use Firebase Authentication instead of JWT
import { verifyFirebaseAuth } from "../middleware/firebase-auth";
import { db } from '../firebase-admin'; // For fetching estimate items for invoice emails
import { requireSubscriptionLevel, PermissionLevel } from "../middleware/subscription-auth";
import { requireCredits, deductFeatureCredits } from "../middleware/credit-check"; // 💳 Pure PAYG: credit-based access

// DEPRECATED: Using Firebase Auth instead of JWT
export const authenticateJWT = verifyFirebaseAuth;

// Use Firebase Authentication middleware
export const isAuthenticated = verifyFirebaseAuth;
// const isAuthenticated = (req: Request, res: Response, next: any) => {
//   if (!req.user) {
//     return res.status(401).json({ message: "Authentication required" });
//   }
//   next();
// };

// Schema for creating project payment structure
const createPaymentStructureSchema = z.object({
  projectId: z.union([z.number(), z.string()]).optional().nullable(),
  totalAmount: z.number().min(1),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientName: z.string().optional().nullable(),
});

// Schema for creating individual payment
// NOTE: projectId is a Firebase document ID (string) or null for quick invoices
const createPaymentSchema = z.object({
  projectId: z.union([z.number(), z.string()]).optional().nullable(),
  amount: z.number().min(1),
  type: z.enum(["deposit", "final", "milestone", "additional"]),
  description: z.string().optional().default("Payment"),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientName: z.string().optional().nullable(),
  clientPhone: z.string().optional().nullable(),
  address: z.string().optional().nullable(), // Project address from Firebase
  dueDate: z.string().optional().nullable(),
  paymentMethod: z.enum(["terminal", "link", "manual"]).optional().nullable(),
  autoSendEmail: z.boolean().optional().default(false), // Auto-send payment link via email
  manualMethod: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  /**
   * Fee Pass-Through Toggle (Decisión 2 — PAYG Strategy)
   * true  = Client pays the 0.5% platform fee (amount is grossed up)
   * false = Contractor absorbs the 0.5% platform fee (default)
   */
  feePassThrough: z.boolean().optional().default(false),
});

// Schema for quick payment link
const quickPaymentSchema = z.object({
  projectId: z.union([z.number(), z.string()]).optional().nullable(),
  type: z.enum(["deposit", "final"]),
  totalAmount: z.number().min(1).optional(), // Total project amount in cents
});

// Schema for manual payment registration (cash, check, zelle, venmo)
const manualPaymentSchema = z.object({
  projectId: z.union([z.number(), z.string()]).optional().nullable(),
  amount: z.number().min(1, "Amount must be at least 1 cent"),
  type: z.enum(["deposit", "final", "milestone", "additional"]).default("additional"),
  description: z.string().optional().default("Manual Payment"),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientName: z.string().optional().nullable(),
  manualMethod: z.enum(["cash", "check", "zelle", "venmo", "other"]),
  referenceNumber: z.string().optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

/**
 * Create automatic payment structure for a project (50/50 split)
 */
router.post(
  "/projects/:projectId/payment-structure",
  isAuthenticated,
  // ✅ Pure PAYG: payment structure creation is free (no credit cost, just auth required)
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      // projectId is a Firebase document ID (string)
      const firebaseProjectId = req.params.projectId;
      const validatedData = createPaymentStructureSchema.parse({
        ...req.body,
        projectId: firebaseProjectId,
      });

      const result =
        await contractorPaymentService.createProjectPaymentStructure(
          firebaseProjectId,
          userId,
          validatedData.totalAmount,
          {
            email: validatedData.clientEmail || undefined,
            name: validatedData.clientName || undefined,
          },
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creating payment structure:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const statusCode = getErrorStatusCode(errorMessage);
      res.status(statusCode).json({
        message: "Error creating payment structure",
        error: errorMessage,
      });
    }
  },
);

/**
 * Create individual payment and payment link
 * Uses Firebase projectId (string) as source of truth for project data
 */
router.post("/create",
  isAuthenticated,
  requireCredits({ featureName: 'paymentLink' }), // 💳 5 créditos por Payment Link generado
  async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
    
    const validatedData = createPaymentSchema.parse(req.body);
    
    // projectId from frontend is a Firebase document ID (string) or null for quick invoices
    const firebaseProjectId = validatedData.projectId ? String(validatedData.projectId) : null;

    const result = await contractorPaymentService.createProjectPayment({
      firebaseProjectId,
      userId,
      amount: validatedData.amount,
      type: validatedData.type,
      description: validatedData.description || "Payment",
      clientEmail: validatedData.clientEmail || undefined,
      clientName: validatedData.clientName || undefined,
      address: validatedData.address || undefined,
      dueDate: validatedData.dueDate
        ? new Date(validatedData.dueDate)
        : undefined,
      feePassThrough: validatedData.feePassThrough ?? false, // 💰 Fee pass-through toggle
    });

    // Auto-send payment link email if requested and payment link was created
    // Base condition on result.paymentLinkUrl presence (not paymentMethod) to handle edge cases
    let emailSent = false;
    if (validatedData.autoSendEmail && result.paymentLinkUrl && validatedData.clientEmail) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(process.env.RESEND_API_KEY);
        
        const amountFormatted = (validatedData.amount / 100).toFixed(2);
        const clientName = validatedData.clientName || 'Valued Customer';
        const description = validatedData.description || 'Payment';

        // Fetch estimate items from Firebase if a project is linked (for detailed invoice)
        let estimateItemsHtml = '';
        let estimateTotalsHtml = '';
        const linkedProjectId = validatedData.projectId ? String(validatedData.projectId) : null;
        if (linkedProjectId) {
          try {
            const docRef = db.collection('estimates').doc(linkedProjectId);
            const docSnap = await docRef.get();
            if (docSnap.exists) {
              const estimateData = docSnap.data();
              const items: any[] = estimateData?.items || estimateData?.lineItems || [];
              const projectTotal: number = estimateData?.total || estimateData?.totalAmount || 0;
              const projectSubtotal: number = estimateData?.subtotal || 0;
              const projectTax: number = estimateData?.tax || 0;
              if (items.length > 0) {
                const rowsHtml = items.map((item: any) => {
                  const qty = item.quantity || 1;
                  const price = item.unitPrice || item.price || 0;
                  const total = item.totalPrice || (qty * price);
                  return `<tr>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151;">${item.name || item.description || 'Item'}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #374151;">${qty}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">$${price.toFixed(2)}</td>
                    <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #374151;">$${total.toFixed(2)}</td>
                  </tr>`;
                }).join('');
                estimateItemsHtml = `
                  <h3 style="color: #374151; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin: 25px 0 10px;">Project Details</h3>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                    <thead>
                      <tr style="background: #f9fafb;">
                        <th style="padding: 10px 12px; text-align: left; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Description</th>
                        <th style="padding: 10px 12px; text-align: center; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Qty</th>
                        <th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Unit Price</th>
                        <th style="padding: 10px 12px; text-align: right; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase;">Total</th>
                      </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                  </table>`;
                estimateTotalsHtml = `
                  <div style="background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                    ${projectSubtotal > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #6b7280;">Subtotal:</span><span>$${projectSubtotal.toFixed(2)}</span></div>` : ''}
                    ${projectTax > 0 ? `<div style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span style="color: #6b7280;">Tax:</span><span>$${projectTax.toFixed(2)}</span></div>` : ''}
                    <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #e5e7eb;"><span style="font-weight: 600; color: #111827;">Project Total:</span><span style="font-weight: 700; color: #0891b2;">$${projectTotal.toFixed(2)}</span></div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #e5e7eb;"><span style="font-weight: 600; color: #111827;">Amount Due Now:</span><span style="font-weight: 700; color: #dc2626;">$${amountFormatted}</span></div>
                  </div>`;
              }
            }
          } catch (fbErr) {
            console.warn('⚠️ [AUTO-EMAIL] Could not fetch estimate items from Firebase:', fbErr);
          }
        }
        
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
            <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 3px solid #22c55e; padding-bottom: 10px;">
                Payment Request — Invoice #${result.invoiceNumber}
              </h2>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">Hello ${clientName},</p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                You have a payment request for <strong>$${amountFormatted}</strong>.
              </p>
              
              <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; color: #166534; font-weight: 500;">${description}</p>
              </div>

              ${estimateItemsHtml}
              ${estimateTotalsHtml}
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${result.paymentLinkUrl}" 
                   style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; 
                          padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; 
                          font-size: 16px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);">
                  Pay Now &#8212; $${amountFormatted}
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Click the button above to complete your secure payment. If you have any questions, please contact us.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
              
              <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                This is an automated payment request. Please do not reply to this email.
              </p>
            </div>
          </div>
        `;
        
        const { data, error } = await resend.emails.send({
          from: 'Owl Fenc Payments <payments@owlfenc.com>',
          to: [validatedData.clientEmail],
          subject: `Payment Request \u2014 Invoice #${result.invoiceNumber} ($${amountFormatted})`,
          html: emailHtml,
        });
        
        if (error) {
          console.error('📧 [AUTO-EMAIL] Failed to send payment link email:', error);
        } else {
          console.log(`📧 [AUTO-EMAIL] Payment link sent to ${validatedData.clientEmail}, ID: ${data?.id}`);
          emailSent = true;
        }
      } catch (emailError) {
        console.error('📧 [AUTO-EMAIL] Error sending payment link email:', emailError);
      }
    }

    // 💳 FIX: Deduct credits AFTER successful payment link creation
    // The requireCredits middleware only checks balance; actual deduction must be called here.
    await deductFeatureCredits(req, result.paymentId?.toString(), `Payment link created — Invoice #${result.invoiceNumber}`);

    res.json({
      success: true,
      data: result,
      emailSent,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = getErrorStatusCode(errorMessage);
    res.status(statusCode).json({
      message: "Error creating payment",
      error: errorMessage,
    });
  }
});

/**
 * Create individual payment and payment link (alternate endpoint)
 * Uses Firebase projectId (string) as source of truth for project data
 * Note: /create is the primary endpoint, this is maintained for compatibility
 */
router.post(
  "/payments",
  isAuthenticated,
  requireCredits({ featureName: 'paymentLink' }), // 💳 5 créditos por Payment Link generado
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      const validatedData = createPaymentSchema.parse(req.body);
      
      // projectId from frontend is a Firebase document ID (string) or null for quick invoices
      const firebaseProjectId = validatedData.projectId ? String(validatedData.projectId) : null;

      const result = await contractorPaymentService.createProjectPayment({
        firebaseProjectId,
        userId,
        amount: validatedData.amount,
        type: validatedData.type,
        description: validatedData.description || "Payment",
        clientEmail: validatedData.clientEmail || undefined,
        clientName: validatedData.clientName || undefined,
        address: validatedData.address || undefined,
        dueDate: validatedData.dueDate
          ? new Date(validatedData.dueDate)
          : undefined,
      });

      // Auto-send payment link email if requested and payment link was created
      // Base condition on result.paymentLinkUrl presence (not paymentMethod) to handle edge cases
      let emailSent = false;
      if (validatedData.autoSendEmail && result.paymentLinkUrl && validatedData.clientEmail) {
        try {
          const { Resend } = await import('resend');
          const resend = new Resend(process.env.RESEND_API_KEY);
          
          const amountFormatted = (validatedData.amount / 100).toFixed(2);
          const clientName = validatedData.clientName || 'Valued Customer';
          const description = validatedData.description || 'Payment';
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
              <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 3px solid #22c55e; padding-bottom: 10px;">
                  Payment Request
                </h2>
                
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  Hello ${clientName},
                </p>
                
                <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                  You have received a payment request for <strong>$${amountFormatted}</strong>.
                </p>
                
                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                  <p style="margin: 0; color: #166534; font-weight: 500;">${description}</p>
                </div>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${result.paymentLinkUrl}" 
                     style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; 
                            padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; 
                            font-size: 16px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);">
                    Pay Now - $${amountFormatted}
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  Click the button above to complete your secure payment. If you have any questions, please contact us.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                  This is an automated payment request. Please do not reply to this email.
                </p>
              </div>
            </div>
          `;
          
          const { data, error } = await resend.emails.send({
            from: 'Owl Fenc Payments <payments@owlfenc.com>',
            to: [validatedData.clientEmail],
            subject: `Payment Request: $${amountFormatted}`,
            html: emailHtml,
          });
          
          if (error) {
            console.error('📧 [AUTO-EMAIL] Failed to send payment link email:', error);
            // Return email failure info to frontend for user notification
            emailSent = false;
          } else {
            console.log(`📧 [AUTO-EMAIL] Payment link sent to ${validatedData.clientEmail}, ID: ${data?.id}`);
            emailSent = true;
          }
        } catch (emailError) {
          console.error('📧 [AUTO-EMAIL] Error sending payment link email:', emailError);
        }
      }

      // 💳 FIX: Deduct credits AFTER successful payment link creation
      await deductFeatureCredits(req, result.paymentId?.toString(), `Payment link created — Invoice #${result.invoiceNumber}`);

      res.json({
        success: true,
        data: result,
        emailSent,
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const statusCode = getErrorStatusCode(errorMessage);
      res.status(statusCode).json({
        message: "Error creating payment",
        error: errorMessage,
      });
    }
  },
);

/**
 * Register a manual payment (cash, check, zelle, venmo)
 * This endpoint does NOT create Stripe session - just records the payment as completed
 * Uses Firebase projectId (string) as source of truth for project data
 */
router.post(
  "/payments/manual",
  isAuthenticated,
  // ✅ Pure PAYG: manual payment registration is free (no Stripe session, just record-keeping)
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      // Validate input using Zod schema
      const validatedData = manualPaymentSchema.parse(req.body);
      
      // projectId from frontend is a Firebase document ID (string) or null
      const firebaseProjectId = validatedData.projectId ? String(validatedData.projectId) : null;

      const result = await contractorPaymentService.registerManualPayment({
        firebaseProjectId,
        userId,
        amount: Math.round(validatedData.amount), // Ensure cents
        type: validatedData.type,
        description: validatedData.description || `${validatedData.manualMethod.toUpperCase()} Payment`,
        clientEmail: validatedData.clientEmail || undefined,
        clientName: validatedData.clientName || undefined,
        manualMethod: validatedData.manualMethod,
        referenceNumber: validatedData.referenceNumber || undefined,
        paymentDate: validatedData.paymentDate ? new Date(validatedData.paymentDate) : new Date(),
        notes: validatedData.notes || undefined,
      });

      console.log(`✅ [MANUAL-PAYMENT-ROUTE] Registered ${validatedData.manualMethod} payment:`, result);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error registering manual payment:", error);
      
      // Return Zod validation errors with clear message
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Validation error",
          errors: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          })),
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const statusCode = getErrorStatusCode(errorMessage);
      res.status(statusCode).json({
        success: false,
        message: "Error registering manual payment",
        error: errorMessage,
      });
    }
  },
);


/**
 * Create quick payment link for deposit or final payment
 * Uses Firebase projectId (string) as source of truth
 */
router.post(
  "/payments/quick-link",
  isAuthenticated,
  requireCredits({ featureName: 'paymentLink' }), // 💳 5 créditos por Quick Payment Link
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      const validatedData = quickPaymentSchema.parse(req.body);
      
      // projectId from frontend is a Firebase document ID (string)
      const firebaseProjectId = validatedData.projectId ? String(validatedData.projectId) : '';
      const totalAmount = validatedData.totalAmount || 0;

      // 🔒 SECURITY: Pass userId for ownership verification
      const result = await contractorPaymentService.createQuickPaymentLink(
        firebaseProjectId,
        userId,
        validatedData.type,
        totalAmount,
      );

      // 💳 FIX: Deduct credits AFTER successful quick payment link creation
      await deductFeatureCredits(req, result.paymentId?.toString(), `Quick payment link created — Invoice #${result.invoiceNumber}`);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creating quick payment link:", error);;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const statusCode = getErrorStatusCode(errorMessage);
      res.status(statusCode).json({
        message: "Error creating quick payment link",
        error: errorMessage,
      });
    }
  },
);

/**
 * Send payment link to client via email
 */
router.post(
  "/payments/:paymentId/send",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      const paymentId = parseInt(req.params.paymentId);

      // Verify payment belongs to user
      const payment = await storage.getProjectPayment(paymentId);
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to internal user_id for comparison
      const { userMappingService } = await import('../services/userMappingService');
      const internalUserId = await userMappingService.getInternalUserId(req.firebaseUser.uid) || 
                           await userMappingService.createMapping(req.firebaseUser.uid, req.firebaseUser.email || `${req.firebaseUser.uid}@firebase.auth`);
      
      if (!payment || payment.userId !== internalUserId) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const result =
        await contractorPaymentService.sendPaymentLinkToClient(paymentId);

      res.json({
        success: true,
        sent: result,
      });
    } catch (error) {
      console.error("Error sending payment link:", error);
      res.status(500).json({
        message: "Error sending payment link",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get payment summary for dashboard
 */
router.get(
  "/dashboard/summary",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      const summary = await contractorPaymentService.getPaymentSummary(userId);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error("Error fetching payment summary:", error);
      res.status(500).json({
        message: "Error fetching payment summary",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get all payments for current user
 */
router.get(
  "/payments",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      const { status, type, projectId } = req.query;

      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const internalUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      let payments = await storage.getProjectPaymentsByUserId(internalUserId);

      // Apply filters
      if (status) {
        payments = payments.filter((p) => p.status === status);
      }
      if (type) {
        payments = payments.filter((p) => p.type === type);
      }
      if (projectId) {
        payments = payments.filter(
          (p) => p.projectId === parseInt(projectId as string),
        );
      }

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      res.status(500).json({
        message: "Error fetching payments",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get payments for specific project
 */
router.get(
  "/projects/:projectId/payments",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);

      // Verify project belongs to user
      const project = await storage.getProject(projectId);
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to internal user_id for comparison
      const { userMappingService } = await import('../services/userMappingService');
      const internalUserId = await userMappingService.getInternalUserId(req.firebaseUser.uid) || 
                           await userMappingService.createMapping(req.firebaseUser.uid, req.firebaseUser.email || `${req.firebaseUser.uid}@firebase.auth`);
      
      if (!project || project.userId !== internalUserId) {
        return res.status(404).json({ message: "Project not found" });
      }

      const payments = await storage.getProjectPaymentsByProjectId(projectId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("Error fetching project payments:", error);
      res.status(500).json({
        message: "Error fetching project payments",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Get single payment details
 */
router.get(
  "/payments/:paymentId",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      const payment = await storage.getProjectPayment(paymentId);

      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to internal user_id for comparison
      const { userMappingService } = await import('../services/userMappingService');
      const internalUserId = await userMappingService.getInternalUserId(req.firebaseUser.uid) || 
                           await userMappingService.createMapping(req.firebaseUser.uid, req.firebaseUser.email || `${req.firebaseUser.uid}@firebase.auth`);
      
      if (!payment || payment.userId !== internalUserId) {
        return res.status(404).json({ message: "Payment not found" });
      }

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error("Error fetching payment:", error);
      res.status(500).json({
        message: "Error fetching payment",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Update payment (for internal use)
 */
router.patch(
  "/payments/:paymentId",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.paymentId);
      const { notes, description } = req.body;

      // Verify payment belongs to user
      const payment = await storage.getProjectPayment(paymentId);
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to internal user_id for comparison
      const { userMappingService } = await import('../services/userMappingService');
      const internalUserId = await userMappingService.getInternalUserId(req.firebaseUser.uid) || 
                           await userMappingService.createMapping(req.firebaseUser.uid, req.firebaseUser.email || `${req.firebaseUser.uid}@firebase.auth`);
      
      if (!payment || payment.userId !== internalUserId) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const updatedPayment = await storage.updateProjectPayment(paymentId, {
        notes,
        description,
      });

      res.json({
        success: true,
        data: updatedPayment,
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      res.status(500).json({
        message: "Error updating payment",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Webhook endpoint for Stripe payment completion
 */
router.post("/webhooks/stripe", async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    if (type === "payment_intent.succeeded") {
      await contractorPaymentService.handlePaymentCompleted(data.object.id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    res.status(500).json({ message: "Webhook processing failed" });
  }
});

/**
 * Get all payments for the authenticated user
 */
router.get("/payments", isAuthenticated, async (req: Request, res: Response) => { // ✅ Pure PAYG: viewing payments is free
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);

    // Fetch REAL payments from database instead of empty array
    const payments = await contractorPaymentService.getUserPayments(userId);

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      message: "Error fetching payments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get payment dashboard summary
 */
router.get("/dashboard/summary", isAuthenticated, async (req: Request, res: Response) => { // ✅ Pure PAYG: viewing dashboard is free
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);

    // Fetch REAL payment summary from database instead of mock data
    const summary = await contractorPaymentService.getPaymentSummary(userId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("Error fetching payment summary:", error);
    res.status(500).json({
      message: "Error fetching payment summary",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Get Stripe account status
 */
router.get("/stripe/account-status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);

    // Fetch REAL Stripe account status from service
    const stripeStatus = await contractorPaymentService.getStripeAccountStatus(userId);

    res.json(stripeStatus);
  } catch (error) {
    console.error("Error fetching Stripe account status:", error);
    res.status(500).json({
      message: "Error fetching Stripe account status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Connect to Stripe - Production Implementation with Real Authentication
 * Creates or manages Stripe Express Connect accounts for contractors
 */
router.post("/stripe/connect", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      console.error("❌ [STRIPE-CONNECT] No Firebase user in request");
      return res.status(401).json({ 
        success: false,
        error: "User not authenticated" 
      });
    }
    
    const firebaseUid = req.firebaseUser.uid;
    const userEmail = req.firebaseUser.email || `${firebaseUid}@firebase.auth`;
    console.log("🔐 [STRIPE-CONNECT-EXPRESS] Iniciando configuración de pagos");
    console.log(`📧 [STRIPE-CONNECT-EXPRESS] User: ${userEmail}`);
    
    // Validate Stripe secret key
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("❌ [STRIPE-CONNECT] STRIPE_SECRET_KEY not configured");
      return res.status(500).json({ 
        success: false,
        error: "Stripe configuration error. Please contact support." 
      });
    }

    // Get Stripe instance (Stripe imported as ESM at top of file)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
    
    // Convert Firebase UID to database user ID
    let dbUserId: number;
    try {
      const { userMappingService } = await import('../services/userMappingService');
      dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(firebaseUid);
      console.log(`✅ [STRIPE-CONNECT-EXPRESS] Database user ID: ${dbUserId}`);
    } catch (mappingError: any) {
      console.error("❌ [STRIPE-CONNECT] User mapping error:", mappingError);
      return res.status(500).json({ 
        success: false,
        error: "Failed to map user account. Please try again." 
      });
    }
    
    // Get user from database to check for existing Stripe Connect account
    let user;
    try {
      user = await storage.getUser(dbUserId);
      if (!user) {
        console.error(`❌ [STRIPE-CONNECT] User not found in database: ${dbUserId}`);
        return res.status(404).json({ 
          success: false,
          error: "User profile not found. Please contact support." 
        });
      }
      console.log(`✅ [STRIPE-CONNECT-EXPRESS] User found: ${user.email}`);
    } catch (storageError: any) {
      console.error("❌ [STRIPE-CONNECT] Storage error:", storageError);
      return res.status(500).json({ 
        success: false,
        error: "Database error. Please try again." 
      });
    }
    
    // Determine the base URL for redirects using centralized helper
    // SECURITY: Use ONLY trusted, whitelisted sources to prevent Host Header Injection
    // CRITICAL: Stripe LIVE mode REQUIRES HTTPS - no exceptions
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    
    let refreshUrl: string;
    let returnUrl: string;
    
    try {
      const { generateStripeRedirectUrl } = await import('../utils/url-helpers');
      
      refreshUrl = generateStripeRedirectUrl('/project-payments', { 
        tab: 'settings', 
        refresh: 'true' 
      }, { isLiveMode });
      
      returnUrl = generateStripeRedirectUrl('/project-payments', { 
        tab: 'settings', 
        connected: 'true' 
      }, { isLiveMode });
    } catch (urlError: any) {
      console.error(`❌ [STRIPE-CONNECT] URL generation error:`, urlError.message);
      return res.status(500).json({
        success: false,
        error: "Server configuration error",
        message: "Payment system is not properly configured. Please contact support.",
        details: process.env.NODE_ENV === 'development' ? urlError.message : undefined
      });
    }
    
    console.log(`🔗 [STRIPE-CONNECT-EXPRESS] Return URL: ${returnUrl}`);
    console.log(`🔗 [STRIPE-CONNECT-EXPRESS] Refresh URL: ${refreshUrl}`);
    
    let accountId = user.stripeConnectAccountId;
    
    // If user already has a Stripe Connect account, use Express Dashboard login link
    if (accountId) {
      try {
        console.log(`🔍 [STRIPE-CONNECT-EXPRESS] Checking existing account: ${accountId}`);
        
        // Verify the account still exists and get its status
        const account = await stripe.accounts.retrieve(accountId);
        
        console.log(`✅ [STRIPE-CONNECT-EXPRESS] Account exists: ${accountId}`);
        console.log(`📊 [STRIPE-CONNECT-EXPRESS] Details submitted: ${account.details_submitted}`);
        console.log(`💳 [STRIPE-CONNECT-EXPRESS] Charges enabled: ${account.charges_enabled}`);
        
        // For Express accounts, use Express Dashboard login link (no redirect URI needed)
        const loginLink = await stripe.accounts.createLoginLink(accountId);
        
        console.log(`✅ [STRIPE-CONNECT-EXPRESS] Dashboard login link created for existing account`);
        
        return res.json({
          success: true,
          url: loginLink.url,
          accountId: accountId,
          isExisting: true,
          accountStatus: {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
          },
          message: "Redirecting to your Stripe Express Dashboard",
        });
      } catch (stripeError: any) {
        // Differentiate between account not found vs other errors
        // Check multiple conditions for robustness across Stripe SDK versions
        const isResourceMissing = 
          // Primary check: Stripe error type and code
          (stripeError.type === 'StripeInvalidRequestError' && stripeError.code === 'resource_missing') ||
          // Fallback: Message content (for older SDK versions or API changes)
          (stripeError.message && (
            stripeError.message.includes('No such account') ||
            stripeError.message.includes('does not exist') ||
            stripeError.message.includes('not found')
          )) ||
          // HTTP status code check (404 = not found)
          (stripeError.statusCode === 404 || stripeError.status === 404);
        
        if (isResourceMissing) {
          // Account truly doesn't exist - safe to create new one
          console.warn(`⚠️ [STRIPE-CONNECT-EXPRESS] Account not found: ${stripeError.message}`);
          console.warn("⚠️ [STRIPE-CONNECT-EXPRESS] Will create a new account");
          accountId = null;
        } else {
          // Could be network error, API issue, permission error - don't create duplicate
          console.error(`❌ [STRIPE-CONNECT-EXPRESS] Stripe API error (not missing resource): ${stripeError.message}`);
          console.error(`❌ [STRIPE-CONNECT-EXPRESS] Error type: ${stripeError.type}, Code: ${stripeError.code}, Status: ${stripeError.statusCode}`);
          
          // Return error instead of creating potential duplicate
          return res.status(500).json({
            success: false,
            error: "Failed to verify existing Stripe account",
            message: "Unable to check your Stripe account status. Please try again in a moment.",
            details: process.env.NODE_ENV === 'development' ? stripeError.message : undefined,
            errorType: stripeError.type,
            errorCode: stripeError.code
          });
        }
      }
    }
    
    // Create a new Stripe Express Connect account
    console.log("🆕 [STRIPE-CONNECT] Creating new Stripe Express account");
    console.log(`📧 [STRIPE-CONNECT] Email: ${user.email}`);
    
    let account;
    try {
      account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        country: 'US', // Default to US, can be made configurable
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual', // Can be made configurable
        metadata: {
          firebase_uid: firebaseUid,
          user_id: dbUserId.toString(),
          app: 'OwlFenc',
        }
      });
      console.log(`✅ [STRIPE-CONNECT] Account created: ${account.id}`);
    } catch (createError: any) {
      console.error("❌ [STRIPE-CONNECT] Account creation failed:", createError.message);
      console.error("❌ [STRIPE-CONNECT] Error details:", createError);
      return res.status(500).json({
        success: false,
        error: "Failed to create Stripe account",
        message: createError.message || "Unable to create payment account. Please try again.",
        details: process.env.NODE_ENV === 'development' ? createError.message : undefined
      });
    }

    // Store the Stripe Connect account ID in the database
    // CRITICAL: This must succeed before returning success to client
    try {
      await storage.updateUser(dbUserId, {
        stripeConnectAccountId: account.id
      });
      console.log(`✅ [STRIPE-CONNECT] Account ID stored in database`);
    } catch (updateError: any) {
      console.error("❌ [STRIPE-CONNECT] CRITICAL: Failed to store account ID in database:", updateError);
      console.error("❌ [STRIPE-CONNECT] Rolling back Stripe account to prevent orphan:", account.id);
      
      // ROLLBACK: Delete the Stripe account we just created since we can't persist it
      try {
        await stripe.accounts.del(account.id);
        console.log(`✅ [STRIPE-CONNECT] Stripe account ${account.id} deleted successfully (rollback)`);
      } catch (deleteError: any) {
        console.error(`❌ [STRIPE-CONNECT] Failed to rollback Stripe account ${account.id}:`, deleteError.message);
        console.error(`⚠️ [STRIPE-CONNECT] ORPHANED ACCOUNT - Manual cleanup required: ${account.id}`);
        // Even if rollback fails, still return error to user
      }
      
      // FATAL ERROR: Cannot proceed without persisting the account ID
      return res.status(500).json({
        success: false,
        error: "Failed to save account connection",
        message: "Unable to complete account setup. Please try again. If this persists, contact support.",
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      });
    }

    // Create account link for onboarding
    let accountLink;
    try {
      accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
      console.log(`✅ [STRIPE-CONNECT] Onboarding link created`);
    } catch (linkError: any) {
      console.error("❌ [STRIPE-CONNECT] Account link creation failed:", linkError.message);
      return res.status(500).json({
        success: false,
        error: "Failed to create onboarding link",
        message: linkError.message || "Unable to create setup link. Please try again.",
        details: process.env.NODE_ENV === 'development' ? linkError.message : undefined
      });
    }
    
    console.log(`✅ [STRIPE-CONNECT] Setup complete, returning onboarding URL`);
    
    res.json({
      success: true,
      url: accountLink.url,
      accountId: account.id,
      isExisting: false,
      message: "Stripe Connect account created successfully. Complete setup to start receiving payments.",
    });
  } catch (error: any) {
    console.error("❌ [STRIPE-CONNECT] Unexpected error:", error);
    console.error("❌ [STRIPE-CONNECT] Stack trace:", error.stack);
    res.status(500).json({
      success: false,
      error: "Unexpected error during Stripe Connect setup",
      message: error.message || "An unexpected error occurred. Please try again.",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Get Stripe Dashboard login link for connected accounts
 */
router.post("/stripe/dashboard", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const firebaseUid = req.firebaseUser.uid;
    
    // Convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(firebaseUid);
    
    // Get user from database
    const user = await storage.getUser(dbUserId);
    
    if (!user || !user.stripeConnectAccountId) {
      return res.status(404).json({ 
        error: "No Stripe Connect account found. Please connect your account first." 
      });
    }

    // Get Stripe instance (Stripe imported as ESM at top of file)
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' as any });
    
    // Create Express Dashboard login link
    const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
    
    res.json({
      success: true,
      url: loginLink.url,
      message: "Stripe Dashboard link created successfully",
    });
  } catch (error) {
    console.error("Error creating Stripe dashboard link:", error);
    res.status(500).json({
      message: "Error creating Stripe dashboard link",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DEPRECATED: Create payment (MOCK ENDPOINT - DUPLICATE)
 * This endpoint is a duplicate of the /create endpoint above (Line 145)
 * It returns mock data and should NOT be used in production
 * Keeping commented out for reference only
 */
/*
router.post("/create", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { projectId, amount, type, description, clientEmail, clientName, dueDate } = req.body;

    // Validate required fields
    if (!projectId || !amount || !type || !description) {
      return res.status(400).json({
        message: "Missing required fields: projectId, amount, type, description",
      });
    }

    // Convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);

    // For now, return mock payment creation
    const mockPayment = {
      id: Math.floor(Math.random() * 1000000),
      projectId,
      userId: dbUserId,
      amount,
      type,
      status: "pending",
      description,
      clientEmail,
      clientName,
      dueDate,
      paymentLinkUrl: `https://owlfenc.com/pay/${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: mockPayment,
      message: "Payment created successfully",
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const statusCode = getErrorStatusCode(errorMessage);
    res.status(statusCode).json({
      message: "Error creating payment",
      error: errorMessage,
    });
  }
});
*/

/**
 * Send payment link invoice via email (REAL implementation with Resend)
 */
router.post("/send-invoice", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const { projectName, clientName, clientEmail, totalAmount, paymentLink } = req.body;

    // Validate required fields
    if (!clientEmail || !totalAmount) {
      return res.status(400).json({
        message: "Missing required fields: clientEmail, totalAmount",
      });
    }

    // Send real email via Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const amountFormatted = typeof totalAmount === 'number' 
      ? totalAmount.toFixed(2) 
      : parseFloat(totalAmount).toFixed(2);
    const name = clientName || 'Valued Customer';
    const project = projectName || 'Your Project';
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 3px solid #22c55e; padding-bottom: 10px;">
            Payment Request - ${project}
          </h2>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Hello ${name},
          </p>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            You have received a payment request for <strong>$${amountFormatted}</strong> for ${project}.
          </p>
          
          ${paymentLink ? `
          <div style="text-align: center; margin: 30px 0;">
            <a href="${paymentLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; 
                      padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; 
                      font-size: 16px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);">
              Pay Now - $${amountFormatted}
            </a>
          </div>
          ` : ''}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Click the button above to complete your secure payment. If you have any questions, please contact us.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated payment request. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
    
    const { data, error } = await resend.emails.send({
      from: 'Owl Fenc Payments <payments@owlfenc.com>',
      to: [clientEmail],
      subject: `Payment Request: $${amountFormatted} - ${project}`,
      html: emailHtml,
    });
    
    if (error) {
      console.error('📧 [SEND-INVOICE] Failed to send invoice email:', error);
      return res.status(500).json({
        success: false,
        message: "Failed to send invoice email",
        error: error.message,
      });
    }

    console.log(`📧 [SEND-INVOICE] Invoice sent to ${clientEmail}, ID: ${data?.id}`);
    
    res.json({
      success: true,
      message: `Invoice sent successfully to ${clientEmail}`,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Error sending invoice:", error);
    res.status(500).json({
      message: "Error sending invoice",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Resend payment link via email (REAL implementation with Resend)
 */
router.post("/:paymentId/resend", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const paymentId = parseInt(req.params.paymentId);

    if (!paymentId) {
      return res.status(400).json({
        message: "Invalid payment ID",
      });
    }

    // Get payment from database
    const payment = await storage.getProjectPayment(paymentId);
    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    // Verify ownership
    const { userMappingService } = await import('../services/userMappingService');
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
    if (payment.userId !== userId) {
      return res.status(403).json({
        message: "Unauthorized to resend this payment link",
      });
    }

    if (!payment.paymentLinkUrl || !payment.clientEmail) {
      return res.status(400).json({
        message: "Payment does not have a valid payment link or client email",
      });
    }

    // Send real email via Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    const amountFormatted = (payment.amount / 100).toFixed(2);
    const clientName = payment.clientName || 'Valued Customer';
    const description = payment.description || 'Payment';
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 3px solid #f59e0b; padding-bottom: 10px;">
            Payment Reminder
          </h2>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Hello ${clientName},
          </p>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            This is a reminder about your pending payment of <strong>$${amountFormatted}</strong>.
          </p>
          
          <div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #92400e; font-weight: 500;">${description}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${payment.paymentLinkUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; 
                      padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; 
                      font-size: 16px; box-shadow: 0 4px 15px rgba(245, 158, 11, 0.4);">
              Pay Now - $${amountFormatted}
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Click the button above to complete your secure payment. If you have any questions, please contact us.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated payment reminder. Please do not reply to this email.
          </p>
        </div>
      </div>
    `;
    
    const { data, error } = await resend.emails.send({
      from: 'Owl Fenc Payments <payments@owlfenc.com>',
      to: [payment.clientEmail],
      subject: `Payment Reminder: $${amountFormatted}`,
      html: emailHtml,
    });
    
    if (error) {
      console.error('📧 [RESEND-LINK] Failed to resend payment link:', error);
      return res.status(500).json({
        success: false,
        message: "Failed to resend payment link",
        error: error.message,
      });
    }

    console.log(`📧 [RESEND-LINK] Payment reminder sent to ${payment.clientEmail}, ID: ${data?.id}`);
    
    res.json({
      success: true,
      message: "Payment link resent successfully",
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Error resending payment link:", error);
    res.status(500).json({
      message: "Error resending payment link",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * DIAGNOSTIC ENDPOINT: Verify Stripe Connect Configuration
 * This endpoint checks if Stripe is properly configured with Connect enabled
 */
router.get("/stripe/diagnostic", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { createStripeClient, getStripePublishableKey, getStripeWebhookSecret, getStripeSecretKey } = await import('../config/stripe');
    
    // Use centralized Stripe client factory
    const stripe = createStripeClient();

    // Get the secret key prefix to identify which account is being used
    const keyPrefix = getStripeSecretKey().substring(0, 15);
    const secretKey = getStripeSecretKey();
    const keyType = secretKey.startsWith("sk_live_") 
      ? "LIVE" 
      : secretKey.startsWith("sk_test_")
      ? "TEST"
      : secretKey.startsWith("sk_org_")
      ? "ORGANIZATION"
      : "UNKNOWN";

    // Try to retrieve account information
    let accountInfo: any = null;
    let connectEnabled = false;
    let accountError = null;

    try {
      // Retrieve the Stripe account details
      const account = await stripe.accounts.retrieve();
      
      accountInfo = {
        id: account.id,
        businessType: account.business_type,
        country: account.country,
        email: account.email,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        type: account.type, // "standard" for platform accounts with Connect
      };

      // Check if Connect is enabled by trying to list connected accounts
      try {
        const connectedAccounts = await stripe.accounts.list({ limit: 1 });
        connectEnabled = true;
      } catch (connectError: any) {
        if (connectError.type === 'StripeInvalidRequestError' && 
            connectError.message.includes("signed up for Connect")) {
          connectEnabled = false;
          accountError = "Stripe Connect is NOT enabled for this account";
        } else {
          connectEnabled = false;
          accountError = connectError.message;
        }
      }
    } catch (error: any) {
      accountError = error.message;
    }

    // Check if webhook secret is configured
    const webhookConfigured = !!getStripeWebhookSecret();
    const publishableKeyConfigured = !!getStripePublishableKey();

    res.json({
      success: true,
      diagnostic: {
        stripe: {
          configured: !!process.env.STRIPE_SECRET_KEY,
          keyPrefix: keyPrefix,
          keyType: keyType,
          webhookSecretConfigured: webhookConfigured,
          publishableKeyConfigured: publishableKeyConfigured,
        },
        account: accountInfo,
        connect: {
          enabled: connectEnabled,
          error: accountError,
          status: connectEnabled 
            ? "✅ Stripe Connect is ENABLED and ready to use" 
            : "❌ Stripe Connect is NOT ENABLED - Please activate it in your Stripe Dashboard",
        },
        recommendations: connectEnabled 
          ? [
              "✅ Your account is ready for Stripe Connect",
              "You can now create connected accounts for contractors",
              "Make sure to configure webhooks for production use"
            ]
          : [
              "❌ Activate Stripe Connect in your Stripe Dashboard",
              "Go to: Dashboard → Settings → Connect",
              "Enable Connect and complete the onboarding process",
              "Make sure you're using the correct API keys (Owl Fenc Company, not Chyrris Technologies)"
            ],
        environment: {
          nodeEnv: process.env.NODE_ENV || "development",
          hasReplitDomains: !!process.env.REPLIT_DOMAINS,
        }
      }
    });
  } catch (error: any) {
    console.error("❌ [STRIPE-DIAGNOSTIC] Error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
      diagnostic: {
        configured: !!process.env.STRIPE_SECRET_KEY,
        error: "Failed to retrieve Stripe account information",
        details: error.message,
      }
    });
  }
});

export default router;

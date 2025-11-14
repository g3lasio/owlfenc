import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { contractorPaymentService } from "../services/contractorPaymentService";
import { storage } from "../storage";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

const router = Router();

// Use Firebase Authentication instead of JWT
import { verifyFirebaseAuth } from "../middleware/firebase-auth";
import { requireSubscriptionLevel, PermissionLevel } from "../middleware/subscription-auth";

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
  projectId: z.number(),
  totalAmount: z.number().min(1),
  clientEmail: z.string().email().optional(),
  clientName: z.string().optional(),
});

// Schema for creating individual payment
const createPaymentSchema = z.object({
  projectId: z.number(),
  amount: z.number().min(1),
  type: z.enum(["deposit", "final", "milestone", "additional"]),
  description: z.string(),
  clientEmail: z.string().email().optional(),
  clientName: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

// Schema for quick payment link
const quickPaymentSchema = z.object({
  projectId: z.number(),
  type: z.enum(["deposit", "final"]),
});

/**
 * Create automatic payment structure for a project (50/50 split)
 */
router.post(
  "/projects/:projectId/payment-structure",
  isAuthenticated,
  requireSubscriptionLevel(PermissionLevel.BASIC),
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      const projectId = parseInt(req.params.projectId);
      const validatedData = createPaymentStructureSchema.parse({
        ...req.body,
        projectId,
      });

      const result =
        await contractorPaymentService.createProjectPaymentStructure(
          projectId,
          userId,
          validatedData.totalAmount,
          {
            email: validatedData.clientEmail,
            name: validatedData.clientName,
          },
        );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creating payment structure:", error);
      res.status(500).json({
        message: "Error creating payment structure",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Create individual payment and payment link
 */
router.post("/create", isAuthenticated, requireSubscriptionLevel(PermissionLevel.BASIC), async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }
    
    // Convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
    
    const validatedData = createPaymentSchema.parse(req.body);

    const result = await contractorPaymentService.createProjectPayment({
      projectId: validatedData.projectId,
      userId,
      amount: validatedData.amount,
      type: validatedData.type,
      description: validatedData.description,
      clientEmail: validatedData.clientEmail,
      clientName: validatedData.clientName,
      dueDate: validatedData.dueDate
        ? new Date(validatedData.dueDate)
        : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      message: "Error creating payment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Create individual payment and payment link
 */
router.post(
  "/payments",
  isAuthenticated,
  requireSubscriptionLevel(PermissionLevel.BASIC),
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      const validatedData = createPaymentSchema.parse(req.body);

      const result = await contractorPaymentService.createProjectPayment({
        projectId: validatedData.projectId,
        userId,
        amount: validatedData.amount,
        type: validatedData.type,
        description: validatedData.description,
        clientEmail: validatedData.clientEmail,
        clientName: validatedData.clientName,
        dueDate: validatedData.dueDate
          ? new Date(validatedData.dueDate)
          : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({
        message: "Error creating payment",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Send invoice to client via email
 */
router.post(
  "/send-invoice",
  isAuthenticated,
  requireSubscriptionLevel(PermissionLevel.BASIC),
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const {
        projectName,
        clientName,
        clientEmail,
        totalAmount,
        paidAmount,
        remainingAmount,
      } = req.body;

      // Import the email service
      const { sendEmail } = require("../services/emailService");

      // Create invoice HTML content
      const invoiceHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          Payment Invoice
        </h2>
        <div style="margin: 20px 0;">
          <h3>Project Details:</h3>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Client:</strong> ${clientName}</p>
          <p><strong>Total Amount:</strong> $${totalAmount.toFixed(2)}</p>
          <p><strong>Amount Paid:</strong> $${paidAmount.toFixed(2)}</p>
          <p><strong>Remaining Balance:</strong> $${remainingAmount.toFixed(2)}</p>
        </div>
        <div style="margin-top: 30px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <p>Thank you for your business!</p>
          <p>If you have any questions about this invoice, please contact us.</p>
        </div>
      </div>
    `;

      // Send the email
      await sendEmail(
        clientEmail,
        `Invoice for ${projectName}`,
        invoiceHtml,
        invoiceHtml,
      );

      res.json({
        success: true,
        message: "Invoice sent successfully",
      });
    } catch (error) {
      console.error("Error sending invoice:", error);
      res.status(500).json({
        message: "Error sending invoice",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
);

/**
 * Create quick payment link for deposit or final payment
 */
router.post(
  "/payments/quick-link",
  isAuthenticated,
  requireSubscriptionLevel(PermissionLevel.BASIC),
  async (req: Request, res: Response) => {
    try {
      if (!req.firebaseUser) {
        return res.status(401).json({ error: "User not authenticated" });
      }
      
      // Convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const userId = await userMappingService.getOrCreateUserIdForFirebaseUid(req.firebaseUser.uid);
      
      const validatedData = quickPaymentSchema.parse(req.body);

      // 🔒 SECURITY: Pass userId for ownership verification
      const result = await contractorPaymentService.createQuickPaymentLink(
        validatedData.projectId,
        userId,
        validatedData.type,
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("Error creating quick payment link:", error);
      res.status(500).json({
        message: "Error creating quick payment link",
        error: error instanceof Error ? error.message : "Unknown error",
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
router.get("/payments", isAuthenticated, requireSubscriptionLevel(PermissionLevel.BASIC), async (req: Request, res: Response) => {
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
router.get("/dashboard/summary", isAuthenticated, requireSubscriptionLevel(PermissionLevel.BASIC), async (req: Request, res: Response) => {
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

    // Get Stripe instance
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
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

    // Get Stripe instance
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
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
 * Create payment
 */
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
    res.status(500).json({
      message: "Error creating payment",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Send invoice
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

    // For now, simulate successful email sending
    res.json({
      success: true,
      message: `Invoice sent successfully to ${clientEmail}`,
      emailId: `email_${Math.random().toString(36).substr(2, 9)}`,
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
 * Resend payment link
 */
router.post("/:paymentId/resend", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const paymentId = parseInt(req.params.paymentId);

    if (!paymentId) {
      return res.status(400).json({
        message: "Invalid payment ID",
      });
    }

    // For now, simulate successful resend
    res.json({
      success: true,
      message: "Payment link resent successfully",
      emailId: `resend_${Math.random().toString(36).substr(2, 9)}`,
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

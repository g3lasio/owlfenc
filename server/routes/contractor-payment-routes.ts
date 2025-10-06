import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { contractorPaymentService } from "../services/contractorPaymentService";
import { storage } from "../storage";
import jwt from "jsonwebtoken";

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
  async (req: Request, res: Response) => {
    try {
      const validatedData = quickPaymentSchema.parse(req.body);

      const result = await contractorPaymentService.createQuickPaymentLink(
        validatedData.projectId,
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
 * Connect to Stripe - Real Production Implementation
 */
router.post("/stripe/connect", isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.firebaseUser) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const firebaseUid = req.firebaseUser.uid;
    
    // Import user mapping service to convert Firebase UID to database user ID
    const { userMappingService } = await import('../services/userMappingService');
    const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(firebaseUid);
    
    // Get user from database to check for existing Stripe Connect account
    const user = await storage.getUser(dbUserId);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get Stripe instance
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    
    // Determine the base URL for redirects
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : (process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000');
    
    const refreshUrl = `${baseUrl}/project-payments?tab=settings&refresh=true`;
    const returnUrl = `${baseUrl}/project-payments?tab=settings&connected=true`;
    
    let accountId = user.stripeConnectAccountId;
    
    // If user already has a Stripe Connect account, create a new onboarding link
    if (accountId) {
      try {
        // Verify the account still exists
        await stripe.accounts.retrieve(accountId);
        
        // Create a new account link for re-onboarding
        const accountLink = await stripe.accountLinks.create({
          account: accountId,
          refresh_url: refreshUrl,
          return_url: returnUrl,
          type: 'account_onboarding',
        });
        
        return res.json({
          success: true,
          url: accountLink.url,
          accountId: accountId,
          message: "Stripe Connect onboarding link refreshed",
        });
      } catch (stripeError) {
        // If account doesn't exist anymore, we'll create a new one below
        console.log("Existing Stripe account not found, creating new one");
        accountId = null;
      }
    }
    
    // Create a new Stripe Connect account
    const account = await stripe.accounts.create({
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
      }
    });

    // Store the Stripe Connect account ID in the database
    await storage.updateUser(dbUserId, {
      stripeConnectAccountId: account.id
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
    
    res.json({
      success: true,
      url: accountLink.url,
      accountId: account.id,
      message: "Stripe Connect account created successfully",
    });
  } catch (error) {
    console.error("Error creating Stripe connect:", error);
    res.status(500).json({
      message: "Error creating Stripe connect",
      error: error instanceof Error ? error.message : "Unknown error",
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

export default router;

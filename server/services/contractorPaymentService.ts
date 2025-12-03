import Stripe from 'stripe';
import { storage } from '../storage';
import type { ProjectPayment, InsertProjectPayment } from '@shared/schema';
import { createStripeClient } from '../config/stripe';
import { stripeHealthService } from './stripeHealthService';
import { db } from '../firebase-admin';

// Initialize Stripe with centralized configuration
const stripe = createStripeClient();

export interface CreateProjectPaymentRequest {
  firebaseProjectId: string | null; // Firebase estimate ID (source of truth)
  userId: number;
  amount: number; // in cents
  type: 'deposit' | 'final' | 'milestone' | 'additional';
  description: string;
  clientEmail?: string;
  clientName?: string;
  clientPhone?: string;
  address?: string;
  dueDate?: Date;
}

export interface PaymentLinkResponse {
  paymentId: number;
  paymentLinkUrl: string;
  invoiceNumber: string;
}

export class ContractorPaymentService {
  /**
   * Creates automatic payment structure when project is created
   * This follows the contractor workflow: 50% deposit + 50% final payment
   * Uses Firebase projectId (string) as source of truth
   */
  async createProjectPaymentStructure(firebaseProjectId: string, userId: number, totalAmount: number, clientInfo: { email?: string; name?: string }) {
    const depositAmount = Math.round(totalAmount * 0.5);
    const finalAmount = totalAmount - depositAmount;

    // Create deposit payment
    const depositPayment = await this.createProjectPayment({
      firebaseProjectId,
      userId,
      amount: depositAmount,
      type: 'deposit',
      description: 'Project Deposit (50%)',
      clientEmail: clientInfo.email,
      clientName: clientInfo.name,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
    });

    // Create final payment
    const finalPayment = await this.createProjectPayment({
      firebaseProjectId,
      userId,
      amount: finalAmount,
      type: 'final',
      description: 'Final Payment (50%)',
      clientEmail: clientInfo.email,
      clientName: clientInfo.name,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Due in 30 days
    });

    return {
      depositPayment,
      finalPayment,
      totalAmount
    };
  }

  /**
   * Creates a payment record and Stripe payment link using Stripe Connect
   * Payments go directly to the contractor's connected Stripe account
   * Now uses Firebase "estimates" collection as the single source of truth for projects
   */
  async createProjectPayment(request: CreateProjectPaymentRequest): Promise<PaymentLinkResponse> {
    // 🔒 CRITICAL GUARDRAIL: Verify platform Stripe account can process payments
    await stripeHealthService.assertCanProcessPayments();

    // Get user first (needed for ownership verification and Stripe Connect)
    const user = await storage.getUser(request.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Get project details from Firebase (single source of truth)
    let projectData: { clientEmail?: string; clientName?: string; address?: string; userId?: string } = {};
    
    if (request.firebaseProjectId) {
      console.log(`📋 [PAYMENT] Looking up Firebase project: ${request.firebaseProjectId}`);
      const docRef = db.collection('estimates').doc(request.firebaseProjectId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        // 🔒 SECURITY: Firebase project must exist when ID is provided
        console.error(`🚨 [SECURITY] Firebase project not found: ${request.firebaseProjectId}`);
        throw new Error('Project not found');
      }
      
      const data = docSnap.data();
      projectData = {
        clientEmail: data?.clientInformation?.email || data?.clientEmail,
        clientName: data?.clientInformation?.name || data?.clientName,
        address: data?.projectDetails?.address || data?.address,
        userId: data?.userId,
      };
      
      // 🔒 SECURITY: Authorization check with graceful handling for legacy projects
      if (!user.firebaseUid) {
        console.error(`🚨 [SECURITY] User ${request.userId} has no firebaseUid, cannot verify ownership`);
        throw new Error('Access denied: User authentication incomplete');
      }
      
      // Handle legacy projects that may not have userId field
      // For these projects, we allow access if the user is authenticated
      // This ensures backward compatibility while maintaining security for new projects
      if (projectData.userId) {
        // Verify ownership: Firebase stores the Firebase UID as userId
        if (projectData.userId !== user.firebaseUid) {
          console.error(`🚨 [SECURITY] Ownership mismatch: Firebase project ${request.firebaseProjectId} belongs to ${projectData.userId}, request from ${user.firebaseUid}`);
          throw new Error('Access denied: You do not own this project');
        }
        console.log(`✅ [PAYMENT] Found Firebase project: ${request.firebaseProjectId}, ownership verified`);
      } else {
        // Legacy project without userId - allow access for authenticated users
        // Log for monitoring but don't block
        console.log(`⚠️ [PAYMENT] Legacy project ${request.firebaseProjectId} has no userId - allowing authenticated user ${user.firebaseUid}`);
      }
    }

    // Check if user has a Stripe Connect account
    if (!user.stripeConnectAccountId) {
      throw new Error('Please connect your Stripe account in Settings before creating payment links');
    }

    // Verify the connected account is active
    try {
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      if (!account.charges_enabled) {
        throw new Error('Please complete your Stripe account setup in Settings before creating payment links');
      }
    } catch (error: any) {
      console.error('Error verifying Stripe Connect account:', error);
      throw new Error('Invalid Stripe account. Please reconnect your account in Settings');
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(request.userId);

    // Resolve client info: request data takes priority, then Firebase data
    const resolvedClientEmail = request.clientEmail || projectData.clientEmail;
    const resolvedClientName = request.clientName || projectData.clientName;
    const resolvedAddress = request.address || projectData.address || 'Project';

    // Create payment record in database
    // CRITICAL: Convert amount to integer to prevent PostgreSQL type errors
    // Float precision issues (e.g., 965329.9999999999) cause "invalid input syntax for type integer"
    const paymentData: InsertProjectPayment = {
      projectId: 0, // Using 0 for Firebase-based projects
      firebaseProjectId: request.firebaseProjectId || undefined,
      userId: request.userId,
      amount: Math.round(request.amount), // Ensure integer for PostgreSQL
      type: request.type,
      status: 'pending',
      description: request.description,
      clientEmail: resolvedClientEmail,
      clientName: resolvedClientName,
      invoiceNumber,
      dueDate: request.dueDate,
    };

    const payment = await storage.createProjectPayment(paymentData);

    // 💾 ATOMIC TRANSACTION: Wrap Stripe API call with automatic rollback on failure
    try {
      // Determine the base URL for redirects using centralized helper
      const { resolveAppBaseUrl } = await import('../utils/url-helpers');
      const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
      const baseUrl = resolveAppBaseUrl({ isLiveMode });

      // Create Stripe Checkout Session directly in the connected account
      // For Express accounts, we create the session directly on their account
      // All payments go directly to the contractor's bank account
      // CRITICAL: unit_amount must be an integer (cents) - Stripe rejects floats
      const roundedAmount = Math.round(request.amount);
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: request.description,
                description: `Invoice #${invoiceNumber} - ${resolvedAddress}`,
              },
              unit_amount: roundedAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/payment-success?payment_id=${payment.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/project-payments`,
        metadata: {
          paymentId: payment.id.toString(),
          firebaseProjectId: request.firebaseProjectId || '',
          userId: request.userId.toString(),
          type: request.type,
          invoiceNumber,
          platformUserId: request.userId.toString(),
        },
        customer_email: resolvedClientEmail || undefined,
      }, {
        // Create the session directly on the connected account
        // This ensures all funds go directly to the contractor
        stripeAccount: user.stripeConnectAccountId,
      });

      console.log(`✅ [PAYMENT-LINK] Created checkout session for connected account: ${user.stripeConnectAccountId}`);

      // Update payment with Stripe details
      await storage.updateProjectPayment(payment.id, {
        stripeCheckoutSessionId: session.id,
        checkoutUrl: session.url || '',
        paymentLinkUrl: session.url || '',
      });

      return {
        paymentId: payment.id,
        paymentLinkUrl: session.url || '',
        invoiceNumber,
      };
    } catch (stripeError: any) {
      // 🔄 ROLLBACK: Delete orphaned payment record if Stripe API call fails
      console.error(`❌ [PAYMENT-ROLLBACK] Stripe API failed for payment ${payment.id}:`, stripeError.message);
      console.log(`🔄 [PAYMENT-ROLLBACK] Rolling back payment record ${payment.id}...`);
      
      try {
        await storage.deleteProjectPayment(payment.id);
        console.log(`✅ [PAYMENT-ROLLBACK] Successfully deleted orphaned payment ${payment.id}`);
      } catch (deleteError: any) {
        console.error(`⚠️ [PAYMENT-ROLLBACK] Failed to delete orphaned payment ${payment.id}:`, deleteError.message);
        // Log critical error but still throw the original Stripe error
      }

      // Re-throw the original Stripe error with context
      throw new Error(`Failed to create payment link: ${stripeError.message}. Please try again or contact support if the issue persists.`);
    }
  }

  /**
   * Sends payment link to client via email (placeholder for now)
   */
  async sendPaymentLinkToClient(paymentId: number): Promise<boolean> {
    const payment = await storage.getProjectPayment(paymentId);
    if (!payment || !payment.clientEmail) {
      throw new Error('Payment or client email not found');
    }

    // Update sent date
    await storage.updateProjectPayment(paymentId, {
      sentDate: new Date(),
    });

    // TODO: Integrate with email service (SendGrid, etc.)
    console.log(`Payment link sent to ${payment.clientEmail}: ${payment.paymentLinkUrl}`);
    
    return true;
  }

  /**
   * Handles Stripe webhook events for payment completion
   */
  async handlePaymentCompleted(stripePaymentIntentId: string): Promise<void> {
    // Find payment by Stripe payment intent ID
    const payments = await storage.getProjectPaymentsByUserId(0); // This needs to be updated to search by stripe ID
    const payment = payments.find(p => p.stripePaymentIntentId === stripePaymentIntentId);

    if (!payment) {
      console.log('Payment not found for Stripe payment intent:', stripePaymentIntentId);
      return;
    }

    // Update payment status
    await storage.updateProjectPayment(payment.id, {
      status: 'succeeded',
      paidDate: new Date(),
    });

    // Update project payment status
    await this.updateProjectPaymentStatus(payment.projectId!);

    console.log(`Payment completed: ${payment.invoiceNumber}`);
  }

  /**
   * Updates project payment status based on completed payments
   */
  async updateProjectPaymentStatus(projectId: number): Promise<void> {
    const payments = await storage.getProjectPaymentsByProjectId(projectId);
    
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const paidAmount = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    let paymentStatus: string;
    if (paidAmount === 0) {
      paymentStatus = 'pending';
    } else if (paidAmount === totalAmount) {
      paymentStatus = 'paid';
    } else {
      paymentStatus = 'partial';
    }

    // Update project
    await storage.updateProject(projectId, {
      paymentStatus,
      paymentDetails: {
        totalAmount,
        paidAmount,
        lastPaymentDate: new Date().toISOString(),
      },
    });
  }

  /**
   * Gets payment summary for contractor dashboard
   */
  /**
   * Get all payments for a specific user from REAL database
   */
  async getUserPayments(userId: number): Promise<ProjectPayment[]> {
    try {
      // Fetch real payments from database instead of empty array
      const payments = await storage.getProjectPaymentsByUserId(userId);
      return payments || [];
    } catch (error) {
      console.error('Error fetching user payments:', error);
      return [];
    }
  }

  /**
   * Get payment summary for dashboard with REAL data
   */
  async getPaymentSummary(userId: number) {
    try {
      const payments = await storage.getProjectPaymentsByUserId(userId);
    
    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPaid = payments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalOverdue = payments
      .filter(p => p.status === 'pending' && p.dueDate && new Date(p.dueDate) < new Date())
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingCount = payments.filter(p => p.status === 'pending').length;
    const paidCount = payments.filter(p => p.status === 'succeeded').length;

    return {
      totalPending: totalPending / 100, // Convert to dollars
      totalPaid: totalPaid / 100,
      totalOverdue: totalOverdue / 100,
      totalRevenue: totalPaid / 100,
      pendingCount,
      paidCount,
    };
    } catch (error) {
      console.error('Error fetching payment summary:', error);
      // Return empty summary for error cases
      return {
        totalPending: 0,
        totalPaid: 0,
        totalOverdue: 0,
        totalRevenue: 0,
        pendingCount: 0,
        paidCount: 0,
      };
    }
  }

  /**
   * Get Stripe account status for user from REAL data
   * Returns standardized contract with activation flags and requirements
   */
  async getStripeAccountStatus(userId: number) {
    try {
      console.log(`🔍 [STRIPE-STATUS] Verificando estado de cuenta Connect`);
      
      // Get user from database to check for Stripe Connect account ID
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeConnectAccountId) {
        console.log(`⚠️ [STRIPE-STATUS] Usuario sin cuenta Connect`);
        return {
          hasStripeAccount: false,
          accountDetails: null,
          isActive: false,
          needsOnboarding: true,
          needsDashboardLink: false,
          requirements: {
            currently_due: [],
            past_due: [],
            eventually_due: []
          },
          lastUpdated: new Date().toISOString()
        };
      }

      // Fetch real Stripe account status
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      
      // Calculate activation status
      const chargesEnabled = account.charges_enabled;
      const payoutsEnabled = account.payouts_enabled;
      const isActive = chargesEnabled && payoutsEnabled;
      const needsOnboarding = !isActive;
      
      // Extract requirements from Stripe account
      const requirements = {
        currently_due: account.requirements?.currently_due || [],
        past_due: account.requirements?.past_due || [],
        eventually_due: account.requirements?.eventually_due || [],
        errors: account.requirements?.errors || [],
        disabled_reason: account.requirements?.disabled_reason || null
      };
      
      const hasRequirements = requirements.currently_due.length > 0 || 
                             requirements.past_due.length > 0;
      const hasErrors = requirements.errors.length > 0;
      
      console.log(`✅ [STRIPE-STATUS] Estado: {
  accountId: '${account.id}',
  chargesEnabled: ${chargesEnabled},
  payoutsEnabled: ${payoutsEnabled},
  fullyActive: ${isActive},
  needsMoreInfo: ${hasRequirements},
  verificationErrors: ${hasErrors}
}`);
      
      // Log verification errors if present
      if (hasErrors) {
        console.warn(`⚠️ [STRIPE-VERIFICATION] Account ${account.id} has verification errors:`);
        requirements.errors.forEach((error: any, index: number) => {
          console.warn(`  ${index + 1}. [${error.code}] ${error.reason}`);
          console.warn(`     Requirement: ${error.requirement}`);
        });
      }
      
      return {
        hasStripeAccount: true,
        accountDetails: {
          id: account.id,
          email: account.email || undefined,
          businessType: account.business_type || undefined,
          chargesEnabled,
          payoutsEnabled,
          defaultCurrency: account.default_currency || undefined,
          country: account.country || undefined,
        },
        isActive,
        needsOnboarding,
        needsDashboardLink: hasRequirements,
        requirements,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ [STRIPE-STATUS] Error fetching account:', error);
      
      // CRITICAL: Preserve hasStripeAccount status if account ID exists in DB
      // This prevents showing "connect account" when it's just a temporary Stripe API error
      // Re-fetch user to get account ID in error handler
      let accountIdStored: string | null = null;
      try {
        const userInError = await storage.getUser(userId);
        accountIdStored = userInError?.stripeConnectAccountId || null;
      } catch (userError) {
        console.error('❌ [STRIPE-STATUS] Failed to fetch user in error handler:', userError);
      }
      
      const hasAccountInDB = !!accountIdStored;
      
      if (accountIdStored) {
        console.warn(`⚠️ [STRIPE-STATUS] Stripe API error for account ${accountIdStored}, but preserving hasStripeAccount=true`);
      }
      
      return {
        hasStripeAccount: hasAccountInDB,
        accountDetails: accountIdStored ? {
          id: accountIdStored,
          email: undefined,
          businessType: undefined,
          chargesEnabled: false, // Unknown due to error
          payoutsEnabled: false,  // Unknown due to error
          defaultCurrency: undefined,
          country: undefined,
        } : null,
        isActive: false, // Conservative: treat as inactive during error
        needsOnboarding: hasAccountInDB, // If account exists but we can't verify, assume needs attention
        needsDashboardLink: hasAccountInDB, // Show dashboard link if account exists
        requirements: {
          currently_due: [],
          past_due: [],
          eventually_due: []
        },
        error: error instanceof Error ? error.message : 'Failed to check Stripe status',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Generates a unique invoice number
   */
  private async generateInvoiceNumber(userId: number): Promise<string> {
    const year = new Date().getFullYear();
    
    const userPayments = await storage.getProjectPaymentsByUserId(userId);
    const count = userPayments.length + 1;
    
    return `INV-${year}-${userId.toString().padStart(8, '0')}-${count.toString().padStart(4, '0')}`;
  }

  /**
   * Creates a one-click payment link for specific project phase
   * Uses Firebase projectId (string) as source of truth
   */
  async createQuickPaymentLink(firebaseProjectId: string, userId: number, type: 'deposit' | 'final', totalAmount: number): Promise<PaymentLinkResponse> {
    // Get project from Firebase
    let projectData: { clientEmail?: string; clientName?: string; address?: string } = {};
    
    const docRef = db.collection('estimates').doc(firebaseProjectId);
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      const data = docSnap.data();
      projectData = {
        clientEmail: data?.clientInformation?.email || data?.clientEmail,
        clientName: data?.clientInformation?.name || data?.clientName,
        address: data?.projectDetails?.address || data?.address || 'Project',
      };
    }

    // Calculate amount based on type
    const amount = Math.round(totalAmount * 0.5);

    // Create payment using authenticated userId
    return this.createProjectPayment({
      firebaseProjectId,
      userId,
      amount,
      type,
      description: `${type === 'deposit' ? 'Project Deposit' : 'Final Payment'} - ${projectData.address}`,
      clientEmail: projectData.clientEmail || undefined,
      clientName: projectData.clientName || undefined,
      address: projectData.address,
    });
  }

  /**
   * Register a manual payment (cash, check, zelle, venmo, etc.)
   * This does NOT create a Stripe session - just records the payment as completed
   */
  async registerManualPayment(request: {
    firebaseProjectId: string | null;
    userId: number;
    amount: number;
    type: 'deposit' | 'final' | 'milestone' | 'additional';
    description: string;
    clientEmail?: string;
    clientName?: string;
    manualMethod: 'cash' | 'check' | 'zelle' | 'venmo' | 'other';
    referenceNumber?: string;
    paymentDate?: Date;
    notes?: string;
  }): Promise<{ paymentId: number; invoiceNumber: string; status: string }> {
    console.log(`📝 [MANUAL-PAYMENT] Registering ${request.manualMethod} payment for user ${request.userId}`);

    // Get user for ownership verification
    const user = await storage.getUser(request.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // For manual payments with a Firebase project, fetch project data and verify ownership
    let projectData: { clientEmail?: string; clientName?: string; userId?: string } = {};
    if (request.firebaseProjectId) {
      console.log(`📋 [MANUAL-PAYMENT] Looking up Firebase project: ${request.firebaseProjectId}`);
      const docRef = db.collection('estimates').doc(request.firebaseProjectId);
      const docSnap = await docRef.get();
      
      if (!docSnap.exists) {
        // 🔒 SECURITY: Firebase project must exist when ID is provided
        console.error(`🚨 [SECURITY] Firebase project not found for manual payment: ${request.firebaseProjectId}`);
        throw new Error('Project not found');
      }
      
      const data = docSnap.data();
      projectData = {
        clientEmail: data?.clientInformation?.email || data?.clientEmail,
        clientName: data?.clientInformation?.name || data?.clientName,
        userId: data?.userId,
      };
      
      // 🔒 SECURITY: Authorization check with graceful handling for legacy projects
      if (!user.firebaseUid) {
        console.error(`🚨 [SECURITY] User ${request.userId} has no firebaseUid for manual payment`);
        throw new Error('Access denied: User authentication incomplete');
      }
      
      // Handle legacy projects that may not have userId field
      if (projectData.userId) {
        // Verify ownership
        if (projectData.userId !== user.firebaseUid) {
          console.error(`🚨 [SECURITY] Manual payment ownership mismatch: Firebase project ${request.firebaseProjectId} belongs to ${projectData.userId}, request from ${user.firebaseUid}`);
          throw new Error('Access denied: You do not own this project');
        }
        console.log(`✅ [MANUAL-PAYMENT] Found Firebase project: ${request.firebaseProjectId}, ownership verified`);
      } else {
        // Legacy project without userId - allow access for authenticated users
        console.log(`⚠️ [MANUAL-PAYMENT] Legacy project ${request.firebaseProjectId} has no userId - allowing authenticated user ${user.firebaseUid}`);
      }
    }

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(request.userId);

    // Resolve client info
    const resolvedClientEmail = request.clientEmail || projectData.clientEmail;
    const resolvedClientName = request.clientName || projectData.clientName;

    // Create payment record with SUCCEEDED status (already paid)
    // Note: Store payment method in notes since paymentMethod column doesn't exist
    const methodNote = `[${request.manualMethod.toUpperCase()}]${request.referenceNumber ? ` Ref: ${request.referenceNumber}` : ''}${request.notes ? ` - ${request.notes}` : ''}`;
    
    // CRITICAL: Convert amount to integer to prevent PostgreSQL type errors
    // Float precision issues (e.g., 965329.9999999999) cause "invalid input syntax for type integer"
    const paymentData: InsertProjectPayment = {
      projectId: 0, // Using 0 for Firebase-based projects
      firebaseProjectId: request.firebaseProjectId || undefined,
      userId: request.userId,
      amount: Math.round(request.amount), // Ensure integer for PostgreSQL
      type: request.type,
      status: 'succeeded', // Manual payments are already completed
      description: request.description,
      clientEmail: resolvedClientEmail || undefined,
      clientName: resolvedClientName || undefined,
      invoiceNumber,
      notes: methodNote,
      paidDate: request.paymentDate || new Date(),
    };

    const payment = await storage.createProjectPayment(paymentData);

    console.log(`✅ [MANUAL-PAYMENT] Recorded ${request.manualMethod} payment #${payment.id} - $${(request.amount / 100).toFixed(2)}`);

    // Note: Project payment status updates not needed for Firebase-based projects
    // Firebase estimates are the source of truth and don't need PostgreSQL sync

    return {
      paymentId: payment.id,
      invoiceNumber,
      status: 'succeeded',
    };
  }
}

export const contractorPaymentService = new ContractorPaymentService();
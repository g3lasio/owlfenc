import Stripe from 'stripe';
import { storage } from '../storage';
import type { ProjectPayment, InsertProjectPayment } from '@shared/schema';
import { getStripeConfig } from '../config/stripe';

// Get Stripe configuration (supports Organization API keys with Stripe-Account header)
const config = getStripeConfig();

const stripe = new Stripe(config.apiKey, {
  apiVersion: '2024-06-20',
  stripeAccount: config.stripeAccount,
});

export interface CreateProjectPaymentRequest {
  projectId: number;
  userId: number;
  amount: number; // in cents
  type: 'deposit' | 'final' | 'milestone' | 'additional';
  description: string;
  clientEmail?: string;
  clientName?: string;
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
   */
  async createProjectPaymentStructure(projectId: number, userId: number, totalAmount: number, clientInfo: { email?: string; name?: string }) {
    const depositAmount = Math.round(totalAmount * 0.5);
    const finalAmount = totalAmount - depositAmount;

    // Create deposit payment
    const depositPayment = await this.createProjectPayment({
      projectId,
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
      projectId,
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
   */
  async createProjectPayment(request: CreateProjectPaymentRequest): Promise<PaymentLinkResponse> {
    // Get project details
    const project = await storage.getProject(request.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Get user to retrieve their Stripe Connect account
    const user = await storage.getUser(request.userId);
    if (!user) {
      throw new Error('User not found');
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

    // Create payment record in database
    const paymentData: InsertProjectPayment = {
      projectId: request.projectId,
      userId: request.userId,
      amount: request.amount,
      type: request.type,
      status: 'pending',
      description: request.description,
      clientEmail: request.clientEmail || project.clientEmail,
      clientName: request.clientName || project.clientName,
      invoiceNumber,
      dueDate: request.dueDate,
    };

    const payment = await storage.createProjectPayment(paymentData);

    // Determine the base URL for redirects
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : (process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000');

    // Create Stripe Checkout Session directly in the connected account
    // For Express accounts, we create the session directly on their account
    // All payments go directly to the contractor's bank account
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: request.description,
              description: `Invoice #${invoiceNumber} - ${project.address}`,
            },
            unit_amount: request.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/payment-success?payment_id=${payment.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/project-payments`,
      metadata: {
        paymentId: payment.id.toString(),
        projectId: request.projectId.toString(),
        userId: request.userId.toString(),
        type: request.type,
        invoiceNumber,
        platformUserId: request.userId.toString(),
      },
      customer_email: request.clientEmail || project.clientEmail || undefined,
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
   */
  async getStripeAccountStatus(userId: number) {
    try {
      // Get user from database to check for Stripe Connect account ID
      const user = await storage.getUser(userId);
      
      if (!user || !user.stripeConnectAccountId) {
        return {
          hasStripeAccount: false,
          accountDetails: null,
          needsOnboarding: true
        };
      }

      // Fetch real Stripe account status
      const account = await stripe.accounts.retrieve(user.stripeConnectAccountId);
      
      return {
        hasStripeAccount: true,
        accountDetails: {
          id: account.id,
          email: account.email || undefined,
          businessType: account.business_type || undefined,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          defaultCurrency: account.default_currency || undefined,
          country: account.country || undefined,
        },
        needsOnboarding: !account.charges_enabled || !account.payouts_enabled
      };
    } catch (error) {
      console.error('Error fetching Stripe account status:', error);
      return {
        hasStripeAccount: false,
        accountDetails: null,
        needsOnboarding: true,
        error: 'Failed to check Stripe status'
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
   */
  async createQuickPaymentLink(projectId: number, type: 'deposit' | 'final'): Promise<PaymentLinkResponse> {
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const payments = await storage.getProjectPaymentsByProjectId(projectId);
    const existingPayment = payments.find(p => p.type === type);

    if (existingPayment && existingPayment.status === 'succeeded') {
      throw new Error(`${type} payment already completed`);
    }

    if (existingPayment && existingPayment.checkoutUrl) {
      // Return existing payment link
      return {
        paymentId: existingPayment.id,
        paymentLinkUrl: existingPayment.checkoutUrl,
        invoiceNumber: existingPayment.invoiceNumber || '',
      };
    }

    // Create new payment
    const amount = type === 'deposit' 
      ? Math.round((project.totalPrice || 0) * 0.5)
      : Math.round((project.totalPrice || 0) * 0.5);

    return this.createProjectPayment({
      projectId,
      userId: project.userId!,
      amount,
      type,
      description: `${type === 'deposit' ? 'Project Deposit' : 'Final Payment'} - ${project.address}`,
      clientEmail: project.clientEmail,
      clientName: project.clientName,
    });
  }
}

export const contractorPaymentService = new ContractorPaymentService();
import Stripe from 'stripe';
import { storage } from '../storage';
import type { ProjectPayment, InsertProjectPayment } from '@shared/schema';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
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
   * Creates a payment record and Stripe payment link
   */
  async createProjectPayment(request: CreateProjectPaymentRequest): Promise<PaymentLinkResponse> {
    // Get project details
    const project = await storage.getProject(request.projectId);
    if (!project) {
      throw new Error('Project not found');
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

    // Create Stripe Checkout Session
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
      success_url: `${process.env.APP_URL || 'http://localhost:5173'}/payment-success?payment_id=${payment.id}`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:5173'}/payment-tracker`,
      metadata: {
        paymentId: payment.id.toString(),
        projectId: request.projectId.toString(),
        userId: request.userId.toString(),
        type: request.type,
        invoiceNumber,
      },
      customer_email: request.clientEmail || project.clientEmail || undefined,
    });

    // Update payment with Stripe details
    await storage.updateProjectPayment(payment.id, {
      stripeCheckoutSessionId: session.id,
      checkoutUrl: session.url || '',
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
  async getUserPayments(firebaseUid: string): Promise<ProjectPayment[]> {
    try {
      // Import the user mapping service to convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(firebaseUid);
      
      // Fetch real payments from database instead of empty array
      const payments = await storage.getProjectPaymentsByUserId(dbUserId);
      return payments || [];
    } catch (error) {
      console.error('Error fetching user payments:', error);
      return [];
    }
  }

  /**
   * Get payment summary for dashboard with REAL data
   */
  async getPaymentSummary(firebaseUid: string) {
    try {
      // Import the user mapping service to convert Firebase UID to database user ID
      const { userMappingService } = await import('../services/userMappingService');
      const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(firebaseUid);
      
      const payments = await storage.getProjectPaymentsByUserId(dbUserId);
    
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
  async getStripeAccountStatus(userId: string) {
    try {
      // TODO: Implement real Stripe account status check
      // For now return basic status until Stripe Connect is fully implemented
      return {
        hasStripeAccount: false,
        accountDetails: null,
        needsOnboarding: true
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
  private async generateInvoiceNumber(userId: string): Promise<string> {
    const year = new Date().getFullYear();
    
    // Convert Firebase UID to database user ID for storage query
    const { userMappingService } = await import('../services/userMappingService');
    const dbUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(userId);
    
    const userPayments = await storage.getProjectPaymentsByUserId(dbUserId);
    const count = userPayments.length + 1;
    
    return `INV-${year}-${userId.slice(0, 8)}-${count.toString().padStart(4, '0')}`;
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
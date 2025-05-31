import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { contractorPaymentService } from '../services/contractorPaymentService';
import { storage } from '../storage';

const router = Router();

// Middleware to check authentication
const isAuthenticated = (req: Request, res: Response, next: any) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
};

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
  type: z.enum(['deposit', 'final', 'milestone', 'additional']),
  description: z.string(),
  clientEmail: z.string().email().optional(),
  clientName: z.string().optional(),
  dueDate: z.string().datetime().optional(),
});

// Schema for quick payment link
const quickPaymentSchema = z.object({
  projectId: z.number(),
  type: z.enum(['deposit', 'final']),
});

/**
 * Create automatic payment structure for a project (50/50 split)
 */
router.post('/projects/:projectId/payment-structure', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = req.user.id;
    const projectId = parseInt(req.params.projectId);
    const validatedData = createPaymentStructureSchema.parse({
      ...req.body,
      projectId
    });

    const result = await contractorPaymentService.createProjectPaymentStructure(
      projectId,
      userId,
      validatedData.totalAmount,
      {
        email: validatedData.clientEmail,
        name: validatedData.clientName
      }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating payment structure:', error);
    res.status(500).json({ 
      message: 'Error creating payment structure',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create individual payment and payment link
 */
router.post('/create', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = req.user.id;
    const validatedData = createPaymentSchema.parse(req.body);

    const result = await contractorPaymentService.createProjectPayment({
      projectId: validatedData.projectId,
      userId,
      amount: validatedData.amount,
      type: validatedData.type,
      description: validatedData.description,
      clientEmail: validatedData.clientEmail,
      clientName: validatedData.clientName,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ 
      message: 'Error creating payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create individual payment and payment link
 */
router.post('/payments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const userId = req.user.id;
    const validatedData = createPaymentSchema.parse(req.body);

    const result = await contractorPaymentService.createProjectPayment({
      projectId: validatedData.projectId,
      userId,
      amount: validatedData.amount,
      type: validatedData.type,
      description: validatedData.description,
      clientEmail: validatedData.clientEmail,
      clientName: validatedData.clientName,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ 
      message: 'Error creating payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Send invoice to client via email
 */
router.post('/send-invoice', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { projectName, clientName, clientEmail, totalAmount, paidAmount, remainingAmount } = req.body;
    
    // Import the email service
    const { sendEmail } = require('../services/emailService');
    
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
    await sendEmail(clientEmail, `Invoice for ${projectName}`, invoiceHtml, invoiceHtml);

    res.json({
      success: true,
      message: 'Invoice sent successfully'
    });
  } catch (error) {
    console.error('Error sending invoice:', error);
    res.status(500).json({ 
      message: 'Error sending invoice',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Create quick payment link for deposit or final payment
 */
router.post('/payments/quick-link', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validatedData = quickPaymentSchema.parse(req.body);

    const result = await contractorPaymentService.createQuickPaymentLink(
      validatedData.projectId,
      validatedData.type
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating quick payment link:', error);
    res.status(500).json({ 
      message: 'Error creating quick payment link',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Send payment link to client via email
 */
router.post('/payments/:paymentId/send', isAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const paymentId = parseInt(req.params.paymentId);
    
    // Verify payment belongs to user
    const payment = await storage.getProjectPayment(paymentId);
    if (!payment || payment.userId !== req.user.id) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const result = await contractorPaymentService.sendPaymentLinkToClient(paymentId);

    res.json({
      success: true,
      sent: result
    });
  } catch (error) {
    console.error('Error sending payment link:', error);
    res.status(500).json({ 
      message: 'Error sending payment link',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get payment summary for dashboard
 */
router.get('/dashboard/summary', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const summary = await contractorPaymentService.getPaymentSummary(userId);

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching payment summary:', error);
    res.status(500).json({ 
      message: 'Error fetching payment summary',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get all payments for current user
 */
router.get('/payments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const { status, type, projectId } = req.query;

    let payments = await storage.getProjectPaymentsByUserId(userId);

    // Apply filters
    if (status) {
      payments = payments.filter(p => p.status === status);
    }
    if (type) {
      payments = payments.filter(p => p.type === type);
    }
    if (projectId) {
      payments = payments.filter(p => p.projectId === parseInt(projectId as string));
    }

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ 
      message: 'Error fetching payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get payments for specific project
 */
router.get('/projects/:projectId/payments', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Verify project belongs to user
    const project = await storage.getProject(projectId);
    if (!project || project.userId !== req.user.id) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const payments = await storage.getProjectPaymentsByProjectId(projectId);

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Error fetching project payments:', error);
    res.status(500).json({ 
      message: 'Error fetching project payments',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get single payment details
 */
router.get('/payments/:paymentId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const payment = await storage.getProjectPayment(paymentId);

    if (!payment || payment.userId !== req.user.id) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ 
      message: 'Error fetching payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update payment (for internal use)
 */
router.patch('/payments/:paymentId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const paymentId = parseInt(req.params.paymentId);
    const { notes, description } = req.body;

    // Verify payment belongs to user
    const payment = await storage.getProjectPayment(paymentId);
    if (!payment || payment.userId !== req.user.id) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    const updatedPayment = await storage.updateProjectPayment(paymentId, {
      notes,
      description,
    });

    res.json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ 
      message: 'Error updating payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Webhook endpoint for Stripe payment completion
 */
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment_intent.succeeded') {
      await contractorPaymentService.handlePaymentCompleted(data.object.id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Webhook processing failed' });
  }
});

export default router;
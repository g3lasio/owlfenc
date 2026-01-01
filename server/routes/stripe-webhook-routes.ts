import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { storage } from "../storage";
import { db } from "../firebase-admin";
import { createStripeClient } from "../config/stripe";

const router = Router();
const stripe = createStripeClient();

/**
 * Stripe Webhook Handler for Payment Events
 * 
 * CRITICAL: This endpoint processes real-time payment events from Stripe
 * It updates both PostgreSQL (payment records) and Firebase (project status)
 * 
 * Security: Verifies webhook signature to prevent unauthorized requests
 * Idempotency: Handles duplicate events gracefully
 */
router.post(
  "/stripe-webhooks",
  // IMPORTANT: Use express.raw() for webhook signature verification
  // This must be applied BEFORE any JSON body parsing middleware
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];

    if (!sig) {
      console.error("❌ [WEBHOOK] Missing Stripe signature");
      return res.status(400).json({ error: "Missing signature" });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("❌ [WEBHOOK] STRIPE_WEBHOOK_SECRET not configured");
      return res.status(500).json({ error: "Webhook not configured" });
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature for security
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
      console.log(`✅ [WEBHOOK] Verified event: ${event.type}`);
    } catch (err: any) {
      console.error(`❌ [WEBHOOK] Signature verification failed: ${err.message}`);
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Handle the event based on type
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;

        case "checkout.session.expired":
          await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
          break;

        case "payment_intent.succeeded":
          await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case "payment_intent.payment_failed":
          await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case "account.updated":
          await handleAccountUpdated(event.data.object as Stripe.Account);
          break;

        default:
          console.log(`ℹ️ [WEBHOOK] Unhandled event type: ${event.type}`);
      }

      // Always return 200 to acknowledge receipt
      res.json({ received: true });
    } catch (error: any) {
      console.error(`❌ [WEBHOOK] Error processing event ${event.type}:`, error);
      // Still return 200 to prevent Stripe from retrying
      // Log the error for manual investigation
      res.json({ received: true, error: error.message });
    }
  }
);

/**
 * Handle successful checkout session completion
 * Updates payment status in PostgreSQL and project status in Firebase
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log(`💳 [WEBHOOK] Processing checkout.session.completed: ${session.id}`);

  const paymentId = session.metadata?.paymentId;
  const firebaseProjectId = session.metadata?.firebaseProjectId;
  const paymentType = session.metadata?.type;

  if (!paymentId) {
    console.error("❌ [WEBHOOK] Missing paymentId in session metadata");
    return;
  }

  try {
    // 1. Update payment record in PostgreSQL
    const payment = await storage.getProjectPayment(parseInt(paymentId));
    
    if (!payment) {
      console.error(`❌ [WEBHOOK] Payment ${paymentId} not found in database`);
      return;
    }

    // Check if already processed (idempotency)
    if (payment.status === "succeeded") {
      console.log(`ℹ️ [WEBHOOK] Payment ${paymentId} already marked as succeeded (idempotent)`);
      return;
    }

    await storage.updateProjectPayment(parseInt(paymentId), {
      status: "succeeded",
      stripeCheckoutSessionId: session.id,
      paidDate: new Date(),
      paymentMethod: session.payment_method_types?.[0] || "card",
    });

    console.log(`✅ [WEBHOOK] Updated payment ${paymentId} status to succeeded`);

    // 2. Update Firebase project payment status
    if (firebaseProjectId) {
      await updateFirebaseProjectPaymentStatus(
        firebaseProjectId,
        paymentType as string,
        "succeeded"
      );
      console.log(`✅ [WEBHOOK] Updated Firebase project ${firebaseProjectId} payment status`);
    }

    // 3. Send receipt email to client (optional)
    if (session.customer_email && session.receipt_url) {
      await sendPaymentReceiptEmail(
        session.customer_email,
        session.amount_total || 0,
        session.receipt_url
      );
    }

  } catch (error: any) {
    console.error(`❌ [WEBHOOK] Error processing checkout session:`, error);
    throw error;
  }
}

/**
 * Handle expired checkout session
 */
async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  console.log(`⏰ [WEBHOOK] Processing checkout.session.expired: ${session.id}`);

  const paymentId = session.metadata?.paymentId;

  if (!paymentId) {
    console.error("❌ [WEBHOOK] Missing paymentId in session metadata");
    return;
  }

  try {
    const payment = await storage.getProjectPayment(parseInt(paymentId));
    
    if (!payment) {
      console.error(`❌ [WEBHOOK] Payment ${paymentId} not found in database`);
      return;
    }

    // Only update if still pending
    if (payment.status === "pending") {
      await storage.updateProjectPayment(parseInt(paymentId), {
        status: "expired",
      });
      console.log(`✅ [WEBHOOK] Updated payment ${paymentId} status to expired`);
    }
  } catch (error: any) {
    console.error(`❌ [WEBHOOK] Error processing expired session:`, error);
    throw error;
  }
}

/**
 * Handle successful payment intent
 */
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`💰 [WEBHOOK] Processing payment_intent.succeeded: ${paymentIntent.id}`);
  
  // This is a backup handler - checkout.session.completed is the primary event
  // Only process if we have metadata
  if (paymentIntent.metadata?.paymentId) {
    const paymentId = parseInt(paymentIntent.metadata.paymentId);
    
    const payment = await storage.getProjectPayment(paymentId);
    if (payment && payment.status !== "succeeded") {
      await storage.updateProjectPayment(paymentId, {
        status: "succeeded",
        stripePaymentIntentId: paymentIntent.id,
        paidDate: new Date(),
      });
      console.log(`✅ [WEBHOOK] Updated payment ${paymentId} via payment_intent.succeeded`);
    }
  }
}

/**
 * Handle failed payment intent
 */
async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`❌ [WEBHOOK] Processing payment_intent.payment_failed: ${paymentIntent.id}`);
  
  if (paymentIntent.metadata?.paymentId) {
    const paymentId = parseInt(paymentIntent.metadata.paymentId);
    
    await storage.updateProjectPayment(paymentId, {
      status: "failed",
      stripePaymentIntentId: paymentIntent.id,
    });
    console.log(`✅ [WEBHOOK] Updated payment ${paymentId} status to failed`);
  }
}

/**
 * Handle Stripe Connect account updates
 */
async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`🔄 [WEBHOOK] Processing account.updated: ${account.id}`);
  
  // Find user by Stripe Connect account ID and update their account status
  try {
    const users = await storage.getAllUsers();
    const user = users.find(u => u.stripeConnectAccountId === account.id);
    
    if (user) {
      console.log(`✅ [WEBHOOK] Found user ${user.id} for account ${account.id}`);
      // Could store additional account status info if needed
      // For now, just log the update
      console.log(`📊 [WEBHOOK] Account charges_enabled: ${account.charges_enabled}, payouts_enabled: ${account.payouts_enabled}`);
    }
  } catch (error: any) {
    console.error(`❌ [WEBHOOK] Error processing account update:`, error);
  }
}

/**
 * Update Firebase project payment status based on payment type
 */
async function updateFirebaseProjectPaymentStatus(
  firebaseProjectId: string,
  paymentType: string,
  status: string
) {
  try {
    const docRef = db.collection("estimates").doc(firebaseProjectId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.error(`❌ [WEBHOOK] Firebase project ${firebaseProjectId} not found`);
      return;
    }

    const currentData = docSnap.data();
    const currentPaymentStatus = currentData?.paymentStatus || "pending";

    // Determine new payment status based on payment type
    let newPaymentStatus = currentPaymentStatus;

    if (status === "succeeded") {
      if (paymentType === "deposit") {
        newPaymentStatus = "deposit-paid";
      } else if (paymentType === "final") {
        // Check if deposit was already paid
        if (currentPaymentStatus === "deposit-paid") {
          newPaymentStatus = "paid-in-full";
        } else {
          newPaymentStatus = "final-paid";
        }
      } else if (paymentType === "milestone" || paymentType === "additional") {
        // For milestone/additional, mark as partial payment
        newPaymentStatus = "partial-paid";
      }
    }

    // Update Firebase project
    await docRef.update({
      paymentStatus: newPaymentStatus,
      updatedAt: new Date(),
    });

    console.log(`✅ [WEBHOOK] Updated Firebase project ${firebaseProjectId} paymentStatus: ${currentPaymentStatus} → ${newPaymentStatus}`);
  } catch (error: any) {
    console.error(`❌ [WEBHOOK] Error updating Firebase project:`, error);
    throw error;
  }
}

/**
 * Send payment receipt email to client
 */
async function sendPaymentReceiptEmail(
  clientEmail: string,
  amountInCents: number,
  receiptUrl: string
) {
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    const amountFormatted = (amountInCents / 100).toFixed(2);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8f9fa;">
        <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <h2 style="color: #1a1a1a; margin-bottom: 20px; border-bottom: 3px solid #22c55e; padding-bottom: 10px;">
            Payment Received ✓
          </h2>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
            Thank you for your payment!
          </p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0; color: #166534; font-size: 24px; font-weight: bold;">$${amountFormatted}</p>
            <p style="margin: 5px 0 0 0; color: #166534; font-size: 14px;">Payment Successful</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${receiptUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; 
                      padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; 
                      font-size: 16px; box-shadow: 0 4px 15px rgba(34, 197, 94, 0.4);">
              View Receipt
            </a>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Your payment has been processed successfully. You can view and download your receipt using the link above.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center;">
            This is an automated receipt from Owl Fenc. Please save this for your records.
          </p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: "Owl Fenc Payments <payments@owlfenc.com>",
      to: [clientEmail],
      subject: `Payment Receipt - $${amountFormatted}`,
      html: emailHtml,
    });

    if (error) {
      console.error("📧 [WEBHOOK] Failed to send receipt email:", error);
    } else {
      console.log(`📧 [WEBHOOK] Receipt sent to ${clientEmail}, ID: ${data?.id}`);
    }
  } catch (emailError) {
    console.error("📧 [WEBHOOK] Error sending receipt email:", emailError);
  }
}

export default router;

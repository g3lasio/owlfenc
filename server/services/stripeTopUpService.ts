/**
 * STRIPE TOP-UP SERVICE — PAY AS YOU GROW
 * Mervin AI / Owl Fenc App
 * 
 * Maneja:
 * 1. Creación/verificación de productos y precios de top-up en Stripe
 * 2. Creación de Checkout Sessions para top-ups
 * 3. Actualización de credit_packages con los Stripe Price IDs reales
 */

import Stripe from 'stripe';
import { db as pgDb } from '../db';
import { eq, sql } from 'drizzle-orm';
import { creditPackages, walletAccounts, users } from '@shared/schema';
import { createStripeClient } from '../config/stripe';
import { CREDIT_PACKAGES_DATA } from '@shared/wallet-schema';

// ================================
// TIPOS
// ================================

export interface TopUpCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

// ================================
// STRIPE TOP-UP SERVICE
// ================================

class StripeTopUpService {

  /**
   * Inicializa los productos de Top-Up en Stripe.
   * Idempotente — verifica si ya existen antes de crear.
   * Se llama al arrancar el servidor.
   */
  async initializeTopUpProducts(): Promise<void> {
    if (!pgDb) {
      console.warn('⚠️  [STRIPE-TOPUP] Database not available — skipping product initialization');
      return;
    }

    let stripe: Stripe;
    try {
      stripe = createStripeClient();
    } catch (error) {
      console.warn('⚠️  [STRIPE-TOPUP] Stripe not configured — skipping product initialization');
      return;
    }

    console.log('🔄 [STRIPE-TOPUP] Initializing top-up products in Stripe...');

    // Obtener paquetes existentes
    const existingPackages = await pgDb
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.isActive, true));

    for (const pkg of existingPackages) {
      // Si ya tiene un Stripe Price ID válido, verificar que existe
      if (pkg.stripePriceId && pkg.stripePriceId.startsWith('price_')) {
        try {
          await stripe.prices.retrieve(pkg.stripePriceId);
          console.log(`  ✅ Package "${pkg.name}" already has valid Stripe Price: ${pkg.stripePriceId}`);
          continue;
        } catch {
          console.log(`  ⚠️  Package "${pkg.name}" has invalid Stripe Price ID — recreating...`);
        }
      }

      // Crear producto y precio en Stripe
      try {
        const totalCredits = pkg.credits + pkg.bonusCredits;
        const priceUsd = (pkg.priceUsdCents / 100).toFixed(2);

        // Crear producto
        const product = await stripe.products.create({
          name: pkg.name,
          description: `${totalCredits} Mervin AI credits${pkg.bonusCredits > 0 ? ` (${pkg.credits} + ${pkg.bonusCredits} bonus)` : ''}. Use for AI estimates, contracts, invoices, permits, and more.`,
          metadata: {
            type: 'credit_topup',
            package_id: String(pkg.id),
            credits: String(pkg.credits),
            bonus_credits: String(pkg.bonusCredits),
            total_credits: String(totalCredits),
          },
        });

        // Crear precio one-time
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: pkg.priceUsdCents,
          currency: 'usd',
          metadata: {
            type: 'credit_topup',
            package_id: String(pkg.id),
            package_name: pkg.name,
            total_credits: String(totalCredits),
          },
        });

        // Actualizar la DB con el Stripe Price ID
        await pgDb
          .update(creditPackages)
          .set({ stripePriceId: price.id })
          .where(eq(creditPackages.id, pkg.id));

        console.log(`  ✅ Created Stripe product for "${pkg.name}": ${price.id} ($${priceUsd})`);

      } catch (error) {
        console.error(`  ❌ Error creating Stripe product for "${pkg.name}":`, error);
      }
    }

    console.log('✅ [STRIPE-TOPUP] Product initialization complete');
  }

  /**
   * Crea una Checkout Session de Stripe para un top-up.
   * El webhook checkout.session.completed es quien otorga los créditos.
   */
  async createTopUpCheckoutSession(params: {
    firebaseUid: string;
    packageId: number;
    successUrl: string;
    cancelUrl: string;
    userEmail?: string; // Para receipt_email en Stripe Checkout (recibos automáticos)
  }): Promise<TopUpCheckoutResult> {
    if (!pgDb) throw new Error('Database not available');

    const stripe = createStripeClient();

    // Obtener el paquete
    const packageResult = await pgDb
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.id, params.packageId))
      .limit(1);

    if (packageResult.length === 0) {
      throw new Error(`Credit package ${params.packageId} not found`);
    }

    const pkg = packageResult[0];

    if (!pkg.stripePriceId || !pkg.stripePriceId.startsWith('price_')) {
      throw new Error(`Package "${pkg.name}" does not have a valid Stripe Price ID. Run initializeTopUpProducts() first.`);
    }

    // Obtener o crear Stripe Customer ID
    const walletResult = await pgDb
      .select({ stripeCustomerId: walletAccounts.stripeCustomerId, userId: walletAccounts.userId })
      .from(walletAccounts)
      .where(eq(walletAccounts.firebaseUid, params.firebaseUid))
      .limit(1);

    let stripeCustomerId: string | undefined;

    if (walletResult.length > 0 && walletResult[0].stripeCustomerId) {
      stripeCustomerId = walletResult[0].stripeCustomerId;
    } else {
      // Buscar en user_subscriptions
      const subResult = await pgDb.execute(sql`
        SELECT us.stripe_customer_id 
        FROM user_subscriptions us
        JOIN users u ON u.id = us.user_id
        WHERE u.firebase_uid = ${params.firebaseUid}
          AND us.stripe_customer_id IS NOT NULL
        LIMIT 1
      `);

      if (subResult.rows.length > 0) {
        stripeCustomerId = subResult.rows[0].stripe_customer_id as string;
        
        // Guardar en wallet
        if (walletResult.length > 0) {
          await pgDb
            .update(walletAccounts)
            .set({ stripeCustomerId })
            .where(eq(walletAccounts.firebaseUid, params.firebaseUid));
        }
      }
    }

    const totalCredits = pkg.credits + pkg.bonusCredits;

    // Crear Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [
        {
          price: pkg.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${params.successUrl}?session_id={CHECKOUT_SESSION_ID}&package=${params.packageId}`,
      cancel_url: params.cancelUrl,
      metadata: {
        firebase_uid: params.firebaseUid,
        package_id: String(params.packageId),
        package_name: pkg.name,
        total_credits: String(totalCredits),
        type: 'credit_topup',
      },
      payment_intent_data: {
        metadata: {
          firebase_uid: params.firebaseUid,
          package_id: String(params.packageId),
          type: 'credit_topup',
        },
      },
    };

    // V1 FIX: Validate Stripe customer exists before using it.
    // A stored customer ID can become stale if:
    //   - The Stripe account was switched between test/live mode
    //   - The customer was manually deleted in the Stripe dashboard
    // If validation fails, we clear the stored ID and fall through to customer_email.
    if (stripeCustomerId) {
      try {
        await stripe.customers.retrieve(stripeCustomerId);
        // Customer is valid — associate with checkout session
        sessionParams.customer = stripeCustomerId;
        // Sincronizar email si ha cambiado (Best effort)
        if (params.userEmail) {
          stripe.customers.update(stripeCustomerId, { email: params.userEmail }).catch(err => {
            console.warn(`⚠️ [STRIPE] Failed to sync email for customer ${stripeCustomerId}:`, err.message);
          });
        }
      } catch (customerErr: any) {
        if (customerErr?.code === 'resource_missing') {
          // Customer no longer exists in Stripe — clear the stale ID from DB
          console.warn(`⚠️ [STRIPE-TOPUP] Stale customer ID ${stripeCustomerId} cleared for ${params.firebaseUid}`);
          await pgDb
            .update(walletAccounts)
            .set({ stripeCustomerId: null })
            .where(eq(walletAccounts.firebaseUid, params.firebaseUid));
          stripeCustomerId = undefined;
          // Fall through: session will use customer_email instead
        } else {
          // Unexpected Stripe error — re-throw to avoid silently proceeding
          throw customerErr;
        }
      }
    }

    // Configurar receipt_email para recibos automáticos de Stripe
    // Stripe envía un recibo por email después de cada pago exitoso
    // NOTA: Si el customer ya tiene email en Stripe, este campo es ignorado
    if (params.userEmail && !stripeCustomerId) {
      sessionParams.customer_email = params.userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      throw new Error('Stripe Checkout Session created but no URL returned');
    }

    console.log(`🛒 [STRIPE-TOPUP] Checkout session created: ${session.id} for ${params.firebaseUid}`);

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Verifica el estado de una Checkout Session (para polling desde el frontend).
   */
  async getCheckoutSessionStatus(sessionId: string): Promise<{
    status: string;
    paymentStatus: string;
    creditsGranted: boolean;
  }> {
    const stripe = createStripeClient();
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    return {
      status: session.status || 'unknown',
      paymentStatus: session.payment_status,
      creditsGranted: session.payment_status === 'paid',
    };
  }

  /**
   * Get full details of a Checkout Session including metadata needed for instant credit grant.
   * Used by the /api/wallet/top-up/status endpoint for the primary credit-grant path.
   */
  async getCheckoutSessionDetails(sessionId: string): Promise<{
    status: string;
    paymentStatus: string;
    firebaseUid: string | null;
    packageId: number | null;
    packageName: string | null;
    amountTotal: number;
    paymentIntentId: string | null;
  }> {
    const stripe = createStripeClient();
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    const packageIdRaw = session.metadata?.package_id;
    const packageId = packageIdRaw ? parseInt(packageIdRaw, 10) : null;
    
    return {
      status: session.status || 'unknown',
      paymentStatus: session.payment_status,
      firebaseUid: session.metadata?.firebase_uid || null,
      packageId: packageId && !isNaN(packageId) ? packageId : null,
      packageName: session.metadata?.package_name || null,
      amountTotal: session.amount_total || 0,
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
    };
  }
}

export const stripeTopUpService = new StripeTopUpService();

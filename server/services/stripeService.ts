import Stripe from "stripe";
import {
  SubscriptionPlan,
  UserSubscription,
  PaymentHistory,
  users,
} from "@shared/schema";
import { storage } from "../storage";
import { firebaseSubscriptionService } from "./firebaseSubscriptionService";
import { createStripeClient, logStripeConfig } from "../config/stripe";
import { stripeHealthService } from "./stripeHealthService";
import { getPriceIdForPlan } from "../config/stripePriceRegistry";
import { db } from "../db";
import { eq } from "drizzle-orm";

// Initialize Stripe with centralized configuration
const stripe = createStripeClient();

// Log configuration
logStripeConfig();

interface SubscriptionCheckoutOptions {
  planId: number;
  userId: string; // Changed to string to support Firebase UIDs
  email: string;
  name: string;
  billingCycle: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
  couponCode?: string; // Optional partnership/agency discount coupon (Master Contractor only)
}

interface ManageSubscriptionOptions {
  subscriptionId: number;
  userId: number;
  successUrl: string;
  cancelUrl: string;
}

class StripeService {
  /**
   * Crea un producto en Stripe para un plan de suscripción
   */
  async createOrUpdateStripePlan(plan: SubscriptionPlan): Promise<string> {
    // Verificar si ya existe un producto con este código
    let stripeProductId = "";

    try {
      console.log(
        `[${new Date().toISOString()}] Iniciando creación/actualización de plan Stripe - Plan ID: ${plan.id}, Código: ${plan.code}`,
      );
      // Buscar si existe un producto con el mismo código en los metadatos
      const products = await stripe.products.list({
        active: true,
        limit: 100,
      });

      const existingProduct = products.data.find(
        (p) => p.metadata.plan_code === plan.code,
      );

      if (existingProduct) {
        console.log(
          `[${new Date().toISOString()}] Plan encontrado en Stripe - ID: ${existingProduct.id}`,
        );
        // Actualizar el producto existente
        const updatedProduct = await stripe.products.update(
          existingProduct.id,
          {
            name: plan.name,
            description: plan.description || "",
            metadata: {
              plan_code: plan.code,
              plan_id: plan.id.toString(),
            },
          },
        );
        stripeProductId = updatedProduct.id;
        console.log(
          `[${new Date().toISOString()}] Plan actualizado en Stripe - ID: ${updatedProduct.id}`,
        );

        // Actualizar precios existentes o crear nuevos si es necesario
        // Aquí podríamos manejar cambios de precio, pero por ahora lo mantenemos simple
      } else {
        console.log(
          `[${new Date().toISOString()}] Plan NO encontrado en Stripe - Creando nuevo plan`,
        );
        // Crear un nuevo producto
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description || "",
          metadata: {
            plan_code: plan.code,
            plan_id: plan.id.toString(),
          },
        });
        stripeProductId = product.id;
        console.log(
          `[${new Date().toISOString()}] Plan creado en Stripe - ID: ${product.id}`,
        );

        // Crear precios para el producto (mensual y anual)
        await stripe.prices.create({
          product: product.id,
          unit_amount: plan.price,
          currency: "usd",
          recurring: { interval: "month" },
          metadata: {
            plan_code: plan.code,
            billing_cycle: "monthly",
          },
        });
        console.log(
          `[${new Date().toISOString()}] Precio mensual creado para plan - ID: ${product.id}`,
        );
        await stripe.prices.create({
          product: product.id,
          unit_amount: plan.yearly_price || plan.price * 12,
          currency: "usd",
          recurring: { interval: "year" },
          metadata: {
            plan_code: plan.code,
            billing_cycle: "yearly",
          },
        });
        console.log(
          `[${new Date().toISOString()}] Precio anual creado para plan - ID: ${product.id}`,
        );
      }

      return stripeProductId;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al crear/actualizar el producto en Stripe:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Crea una sesión de checkout para suscripción
   */
  async createSubscriptionCheckout(
    options: SubscriptionCheckoutOptions,
  ): Promise<string> {
    try {
      const startTime = Date.now();
      console.log(
        `[${new Date().toISOString()}] Iniciando checkout - Plan ID: ${options.planId}, Ciclo: ${options.billingCycle}`,
      );

      // 🔒 CRITICAL GUARDRAIL: Verify Stripe account can process payments
      await stripeHealthService.assertCanProcessPayments();

      // Primero verificar la conexión con Stripe
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Free trial eliminado por diseño — el sistema de créditos (wallet) maneja el onboarding
      // Los usuarios nuevos reciben créditos de bienvenida al registrarse (no free trial de Stripe)

      // Use hardcoded plans with both monthly and yearly pricing
      // IMPORTANT: These IDs MUST match the database (subscription_plans table)
      const subscriptionPlans = [
        {
          id: 4,
          name: "Free Trial",
          price: 0,
          yearlyPrice: 0,
          interval: "monthly",
          code: "FREE_TRIAL",
          description: "14 días gratis - acceso completo",
        },
        {
          id: 5,
          name: "Primo Chambeador",
          price: 0,
          yearlyPrice: 0,
          interval: "monthly",
          code: "PRIMO_CHAMBEADOR",
          description: "Ningún trabajo es pequeño cuando tu espíritu es grande",
        },
        {
          id: 9,
          name: "Mero Patrón",
          price: 4999, // $49.99 in cents (monthly)
          yearlyPrice: 50988, // $509.88 in cents (yearly - 15% discount)
          interval: "monthly",
          code: "mero_patron",
          description: "Para contratistas profesionales",
        },
        {
          id: 6,
          name: "Master Contractor",
          price: 9999, // $99.99 in cents (monthly)
          yearlyPrice: 101989, // $1,019.89 in cents (yearly - 15% discount)
          interval: "monthly",
          code: "MASTER_CONTRACTOR",
          description: "Sin límites para profesionales",
        },
      ];

      const plan = subscriptionPlans.find((p) => p.id === options.planId);
      if (!plan) {
        throw new Error(`Plan con ID ${options.planId} no encontrado`);
      }

      console.log(
        `[${new Date().toISOString()}] Plan encontrado: ${plan.name} (${plan.code})`,
      );

      // Handle free plan separately - no Stripe checkout needed
      if (plan.price === 0) {
        console.log(
          `[${new Date().toISOString()}] Plan gratuito seleccionado, redirigiendo a success`,
        );
        return options.successUrl;
      }

      try {
        // Get Price ID from centralized registry
        const priceId = getPriceIdForPlan(options.planId, options.billingCycle);
        
        if (!priceId) {
          throw new Error(
            `No Price ID configured for plan ${plan.name} (${options.billingCycle} billing). ` +
            `Please configure Stripe Prices in stripePriceRegistry.ts`
          );
        }

        console.log(
          `[${new Date().toISOString()}] Using Stripe Price ID: ${priceId} for ${plan.name} (${options.billingCycle} billing)`,
        );

        // 🎯 Prepare checkout session configuration
        const sessionConfig: Stripe.Checkout.SessionCreateParams = {
          payment_method_types: ["card"],
          line_items: [
            {
              price: priceId,  // Use pre-configured Price ID instead of inline price_data
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: options.successUrl,
          cancel_url: options.cancelUrl,
          customer_email: options.email,
          client_reference_id: options.userId,
          metadata: {
            userId: options.userId,
            planId: options.planId.toString(),
            billingCycle: options.billingCycle,
          },
        };

        // No free trial — checkout directo sin periodo de prueba
        // El sistema de créditos (wallet) maneja el onboarding con créditos de bienvenida

        // 🎟️ PARTNERSHIP DISCOUNT: Dynamic Stripe coupon validation
        // Looks up the coupon by ID, exact name, or partial name match in Stripe.
        // Any coupon created in Stripe (or via the admin dashboard) works automatically.
        if (options.couponCode && options.planId === 6) {
          const normalizedCode = options.couponCode.trim().toUpperCase();
          try {
            const coupons = await stripe.coupons.list({ limit: 100 });
            
            // Step 1: Try exact match by ID or name
            let matchedCoupon = coupons.data.find(
              (c) => c.id.toUpperCase() === normalizedCode || c.name?.toUpperCase() === normalizedCode
            );
            
            // Step 2: If no exact match, try partial match (e.g. "NEXLEAD" matches "NEXLEAD – Agency Partner Discount")
            if (!matchedCoupon) {
              matchedCoupon = coupons.data.find(
                (c) => c.name?.toUpperCase().startsWith(normalizedCode) || normalizedCode.startsWith(c.id.toUpperCase())
              );
            }
            
            // Step 3: Try contains match as last resort
            if (!matchedCoupon) {
              matchedCoupon = coupons.data.find(
                (c) => c.name?.toUpperCase().includes(normalizedCode) || normalizedCode.includes(c.name?.toUpperCase() || '')
              );
            }

            if (matchedCoupon && matchedCoupon.valid) {
              console.log(`[CHECKOUT] ✅ Partner coupon applied: "${normalizedCode}" → Stripe ID: "${matchedCoupon.id}" (${matchedCoupon.percent_off}% off)`);
              sessionConfig.discounts = [{ coupon: matchedCoupon.id }];
            } else if (matchedCoupon && !matchedCoupon.valid) {
              console.warn(`[CHECKOUT] ⚠️ Partner coupon "${normalizedCode}" found but is expired or depleted — not applied`);
            } else {
              console.warn(`[CHECKOUT] ⚠️ Partner coupon "${normalizedCode}" not found in Stripe — not applied`);
            }
          } catch (couponError: any) {
            // Non-fatal: if coupon lookup fails, proceed with checkout without discount
            console.warn(`[CHECKOUT] ⚠️ Could not validate partner coupon "${normalizedCode}": ${couponError.message}`);
          }
        } else if (options.couponCode && options.planId !== 6) {
          console.warn(`[CHECKOUT] Coupon "${options.couponCode}" rejected — only valid for Master Contractor plan (planId 6)`);
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create(sessionConfig);

        if (!session || !session.url) {
          throw new Error("No se pudo crear la sesión de checkout");
        }

        console.log(
          `[${new Date().toISOString()}] Sesión de checkout creada correctamente con ID:`,
          session.id,
        );
        const endTime = Date.now();
        console.log(
          `[${new Date().toISOString()}] Checkout completado en ${endTime - startTime}ms`,
        );
        return session.url;
      } catch (stripeError: any) {
        console.error(
          `[${new Date().toISOString()}] Error específico de Stripe durante la creación de checkout:`,
          stripeError,
        );
        if (stripeError.type === "StripeAuthenticationError") {
          throw new Error(
            "Error de autenticación con Stripe: La clave API no es válida.",
          );
        }
        throw stripeError;
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error general al crear sesión de checkout:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Crea un portal de cliente para gestionar la suscripción
   */
  async createCustomerPortalSession(
    options: ManageSubscriptionOptions,
  ): Promise<string> {
    try {
      console.log(
        `[${new Date().toISOString()}] Preparando portal de cliente para suscripción ID ${options.subscriptionId}`,
      );

      // Primero verificar la conexión con Stripe
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      const subscription = await storage.getUserSubscription(
        options.subscriptionId,
      );
      if (!subscription || subscription.userId !== options.userId) {
        throw new Error("Suscripción no encontrada o no pertenece al usuario");
      }

      console.log(
        `[${new Date().toISOString()}] Suscripción encontrada: ID ${subscription.id}, Plan ID ${subscription.planId}`,
      );

      if (!subscription.stripeCustomerId) {
        throw new Error(
          "No hay un cliente de Stripe asociado a esta suscripción",
        );
      }

      console.log(
        `[${new Date().toISOString()}] Cliente de Stripe ID: ${subscription.stripeCustomerId}`,
      );

      try {
        const session = await stripe.billingPortal.sessions.create({
          customer: subscription.stripeCustomerId,
          return_url: options.successUrl,
        });

        if (!session || !session.url) {
          throw new Error("No se pudo crear la sesión del portal de cliente");
        }

        console.log(
          `[${new Date().toISOString()}] Portal de cliente creado correctamente con URL:`,
          session.url.substring(0, 60) + "...",
        );
        return session.url;
      } catch (stripeError: any) {
        console.error(
          `[${new Date().toISOString()}] Error específico de Stripe durante la creación del portal:`,
          stripeError,
        );
        if (stripeError.type === "StripeAuthenticationError") {
          throw new Error(
            "Error de autenticación con Stripe: La clave API no es válida.",
          );
        }
        throw stripeError;
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error general al crear portal de cliente:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Maneja un evento de webhook de Stripe
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      console.log(
        `[${new Date().toISOString()}] Evento de webhook recibido: ${event.type}`,
      );
      switch (event.type) {
        case "checkout.session.completed":
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case "customer.subscription.created":
          await this.handleSubscriptionCreated(event.data.object);
          break;
        case "customer.subscription.updated":
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case "customer.subscription.deleted":
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        case "invoice.payment_succeeded":
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case "invoice.payment_failed":
          await this.handlePaymentFailed(event.data.object);
          break;
        default:
          console.log(
            `[${new Date().toISOString()}] Evento de Stripe no manejado: ${event.type}`,
          );
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al manejar evento de webhook:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Maneja un evento de checkout completado
   */
  private async handleCheckoutCompleted(session: any): Promise<void> {
    try {
      console.log(
        `[${new Date().toISOString()}] Manejando evento checkout.session.completed - Sesión ID: ${session.id}`,
      );
      
      // Extract Firebase UID from client_reference_id (set during checkout creation)
      const firebaseUid = session.client_reference_id || session.metadata?.userId;
      const userEmail = session.customer_email || session.customer_details?.email;
      const planId = parseInt(session.metadata?.planId || '0');
      const billingCycle = session.metadata?.billingCycle || 'monthly';

      if (!firebaseUid) {
        console.error(`[${new Date().toISOString()}] No Firebase UID in client_reference_id or metadata.userId`);
        return;
      }
      if (!userEmail) {
        console.error(`[${new Date().toISOString()}] No customer email found in session metadata`);
        return;
      }

      const userId = firebaseUid; // Use real Firebase UID

      // Save stripe_customers mapping so webhook service can find user by Stripe customerId
      try {
        const { db: firestoreDb, admin: adminSdk } = await import('../lib/firebase-admin.js');
        await firestoreDb.collection('stripe_customers').doc(session.customer).set({
          customerId: session.customer,
          uid: firebaseUid,
          email: userEmail,
          createdAt: adminSdk.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ [STRIPE-WEBHOOK] stripe_customers mapping saved: ${session.customer} → ${firebaseUid}`);
      } catch (mappingError) {
        console.error('⚠️ [STRIPE-WEBHOOK] Failed to save stripe_customers mapping (non-fatal):', mappingError);
      }

      console.log(
        `[${new Date().toISOString()}] Processing checkout.session.completed for Firebase UID: ${userId} (email: ${userEmail}), plan: ${planId}`,
      );

      // Get subscription details from Stripe
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );

      // Convert Unix timestamps to Date objects
      const currentPeriodStart = new Date(
        (subscription as any).current_period_start * 1000,
      );
      const currentPeriodEnd = new Date((subscription as any).current_period_end * 1000);

      // Create subscription data for Firebase
      const subscriptionData = {
        id: subscription.id,
        status: subscription.status as "active" | "inactive" | "canceled" | "trialing",
        planId: planId,
        stripeSubscriptionId: session.subscription,
        stripeCustomerId: session.customer,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        billingCycle: billingCycle as "monthly" | "yearly",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Create or update subscription in Firebase
      await firebaseSubscriptionService.createOrUpdateSubscription(
        userId,
        subscriptionData,
      );

      console.log(
        `[${new Date().toISOString()}] ✅ Subscription created/updated in Firebase for user: ${userId}`,
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al manejar checkout completado:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Maneja un evento de suscripción creada
   */
  private async handleSubscriptionCreated(subscription: any): Promise<void> {
    console.log(
      `[${new Date().toISOString()}] Evento customer.subscription.created recibido - ID: ${subscription.id}`,
    );
    // Este evento ya es manejado por checkout.session.completed
    // Pero podríamos agregar lógica adicional aquí si es necesario
  }

  /**
   * Maneja un evento de suscripción actualizada
   */
  private async handleSubscriptionUpdated(
    stripeSubscription: any,
  ): Promise<void> {
    try {
      console.log(
        `[${new Date().toISOString()}] Evento customer.subscription.updated recibido - ID: ${stripeSubscription.id}`,
      );
      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(
        stripeSubscription.id,
      );

      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];

        // Convertir los timestamp de Unix a objetos Date
        const currentPeriodStart = new Date(
          stripeSubscription.current_period_start * 1000,
        );
        const currentPeriodEnd = new Date(
          stripeSubscription.current_period_end * 1000,
        );

        // Actualizar la suscripción con la información más reciente
        await storage.updateUserSubscription(subscription.id, {
          status: stripeSubscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
          updatedAt: new Date(),
        });
        console.log(
          `[${new Date().toISOString()}] Suscripción actualizada - ID: ${subscription.id}`,
        );
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al manejar actualización de suscripción:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Maneja un evento de suscripción eliminada
   */
  private async handleSubscriptionDeleted(
    stripeSubscription: any,
  ): Promise<void> {
    try {
      console.log(
        `[${new Date().toISOString()}] Evento customer.subscription.deleted recibido - ID: ${stripeSubscription.id}`,
      );
      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(
        stripeSubscription.id,
      );

      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];

        // Marcar la suscripción como cancelada
        await storage.updateUserSubscription(subscription.id, {
          status: "canceled",
          updatedAt: new Date(),
        });
        console.log(
          `[${new Date().toISOString()}] Suscripción marcada como cancelada - ID: ${subscription.id}`,
        );
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al manejar eliminación de suscripción:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Maneja un evento de pago exitoso
   */
  private async handlePaymentSucceeded(invoice: any): Promise<void> {
    try {
      console.log(
        `[${new Date().toISOString()}] Evento invoice.payment_succeeded recibido - ID: ${invoice.id}`,
      );
      if (!invoice.subscription) {
        return; // No es un pago de suscripción
      }

      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(
        invoice.subscription,
      );

      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];

        // Registrar el pago exitoso
        await storage.createPaymentHistory({
          userId: subscription.userId,
          amount: (invoice.amount_paid / 100).toString(), // Convertir a dólares para decimal schema
          status: "succeeded",
          paymentDate: new Date(),
        });
        console.log(
          `[${new Date().toISOString()}] Pago exitoso registrado - ID: ${invoice.id}`,
        );

        // Actualizar la suscripción si es necesario
        if (subscription.status !== "active") {
          await storage.updateUserSubscription(subscription.id, {
            status: "active",
            updatedAt: new Date(),
          });
          console.log(
            `[${new Date().toISOString()}] Estado de suscripción actualizado a 'active' - ID: ${subscription.id}`,
          );
        }
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al manejar pago exitoso:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Maneja un evento de pago fallido
   */
  private async handlePaymentFailed(invoice: any): Promise<void> {
    try {
      console.log(
        `[${new Date().toISOString()}] Evento invoice.payment_failed recibido - ID: ${invoice.id}`,
      );
      if (!invoice.subscription) {
        return; // No es un pago de suscripción
      }

      // Encontrar la suscripción en nuestra base de datos
      const subscriptions = await this.findSubscriptionsByStripeId(
        invoice.subscription,
      );

      if (subscriptions && subscriptions.length > 0) {
        const subscription = subscriptions[0];

        // Registrar el pago fallido
        await storage.createPaymentHistory({
          userId: subscription.userId,
          amount: (invoice.amount_due / 100).toString(), // Convertir a dólares para decimal schema
          status: "failed",
          paymentDate: new Date(),
        });
        console.log(
          `[${new Date().toISOString()}] Pago fallido registrado - ID: ${invoice.id}`,
        );

        // Actualizar el estado de la suscripción
        await storage.updateUserSubscription(subscription.id, {
          status: "past_due",
          updatedAt: new Date(),
        });
        console.log(
          `[${new Date().toISOString()}] Estado de suscripción actualizado a 'past_due' - ID: ${subscription.id}`,
        );
      }
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al manejar pago fallido:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Busca suscripciones por ID de suscripción de Stripe
   */
  private async findSubscriptionsByStripeId(
    stripeSubscriptionId: string,
  ): Promise<UserSubscription[]> {
    try {
      console.log(
        `[${new Date().toISOString()}] Buscando suscripciones por ID de Stripe - ID: ${stripeSubscriptionId}`,
      );
      // Aquí normalmente haríamos una consulta a la base de datos
      // Pero como estamos usando un almacenamiento en memoria, tenemos que cargar todas las suscripciones
      // y filtrar manualmente
      const allSubscriptions = await Promise.all(
        Array.from(Array(1000).keys()).map((id) =>
          storage.getUserSubscription(id),
        ),
      );

      const subscriptions = allSubscriptions
        .filter(Boolean)
        .filter(
          (sub) => sub?.stripeSubscriptionId === stripeSubscriptionId,
        ) as UserSubscription[];
      console.log(
        `[${new Date().toISOString()}] Se encontraron ${subscriptions.length} suscripciones`,
      );
      return subscriptions;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al buscar suscripciones por ID de Stripe:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Verifica la conexión con Stripe y que las credenciales sean válidas
   */
  async verifyStripeConnection(): Promise<boolean> {
    try {
      console.log(
        `[${new Date().toISOString()}] Verificando conexión con Stripe`,
      );
      // Usar timeout para evitar bloqueos largos
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 5000);
      });

      const verifyPromise = stripe.products.list({ limit: 1 });
      await Promise.race([verifyPromise, timeoutPromise]);
      console.log(`[${new Date().toISOString()}] Conexión con Stripe exitosa`);
      return true;
    } catch (error: any) {
      if (error.message === "Timeout") {
        console.error(
          `[${new Date().toISOString()}] Timeout al verificar conexión con Stripe`,
        );
      } else {
        console.error(
          `[${new Date().toISOString()}] Error al verificar la conexión con Stripe:`,
          error.message,
        );
      }
      return false;
    }
  }

  /**
   * Crea un cliente en Stripe
   */
  async createCustomer(customerData: {
    email?: string;
    name: string;
  }): Promise<Stripe.Customer> {
    try {
      console.log(
        `[${new Date().toISOString()}] Creando cliente en Stripe - Email: ${customerData.email}, Nombre: ${customerData.name}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Crear cliente en Stripe
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
      });

      console.log(
        `[${new Date().toISOString()}] Cliente creado en Stripe - ID: ${customer.id}`,
      );
      return customer;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al crear cliente en Stripe:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Validates that a Stripe customer ID exists in the current Stripe environment.
   * Returns true if valid, false if the customer was not found (stale/wrong env).
   */
  async validateCustomer(customerId: string): Promise<boolean> {
    try {
      const customer = await stripe.customers.retrieve(customerId);
      // A deleted customer is returned as { deleted: true } — treat as invalid
      return !(customer as any).deleted;
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Crea un Setup Intent para registrar una tarjeta
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      console.log(
        `[${new Date().toISOString()}] Creando Setup Intent para cliente ID: ${customerId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Crear un setup intent en Stripe
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
      });

      console.log(
        `[${new Date().toISOString()}] Setup Intent creado - ID: ${setupIntent.id}`,
      );
      return setupIntent;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al crear Setup Intent:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sincroniza todos los planes de suscripción con Stripe
   */
  async syncPlansWithStripe(): Promise<void> {
    try {
      console.log(
        `[${new Date().toISOString()}] Iniciando sincronización de planes con Stripe`,
      );
      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales.",
        );
      }

      const plans = await storage.getAllSubscriptionPlans();

      for (const plan of plans) {
        await this.createOrUpdateStripePlan(plan);
      }

      console.log(
        `[${new Date().toISOString()}] Sincronizados ${plans.length} planes con Stripe`,
      );
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al sincronizar planes con Stripe:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtiene los métodos de pago de un cliente en Stripe
   */
  async getCustomerPaymentMethods(customerId: string): Promise<any[]> {
    try {
      console.log(
        `[${new Date().toISOString()}] Obteniendo métodos de pago para cliente ID: ${customerId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Obtener métodos de pago de tipo tarjeta
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
      });

      console.log(
        `[${new Date().toISOString()}] Se encontraron ${paymentMethods.data.length} métodos de pago`,
      );
      return paymentMethods.data;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al obtener métodos de pago:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtiene el historial de facturas de un cliente en Stripe
   */
  async getCustomerInvoices(customerId: string): Promise<any[]> {
    try {
      console.log(
        `[${new Date().toISOString()}] Obteniendo facturas para cliente ID: ${customerId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Obtener facturas
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 100,
      });

      console.log(
        `[${new Date().toISOString()}] Se encontraron ${invoices.data.length} facturas`,
      );
      return invoices.data;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al obtener facturas:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Crea una sesión de configuración de método de pago
   */
  async createSetupSession(options: {
    customerId: string;
    returnUrl: string;
  }): Promise<any> {
    try {
      console.log(
        `[${new Date().toISOString()}] Creando sesión de configuración para cliente ID: ${options.customerId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Crear sesión
      const session = await stripe.checkout.sessions.create({
        customer: options.customerId,
        payment_method_types: ["card"],
        mode: "setup",
        success_url: options.returnUrl,
        cancel_url: options.returnUrl.replace("success=true", "canceled=true"),
      });

      if (!session || !session.url) {
        throw new Error("No se pudo crear la sesión de configuración");
      }

      console.log(
        `[${new Date().toISOString()}] Sesión de configuración creada correctamente con URL:`,
        session.url.substring(0, 60) + "...",
      );
      return session;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al crear sesión de configuración:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Crea un enlace de onboarding para Stripe Connect
   * Permite a los usuarios conectar su cuenta bancaria para recibir pagos
   */
  async createConnectOnboardingLink(
    userId: number,
    refreshUrl: string,
    returnUrl: string,
  ): Promise<string> {
    try {
      console.log(
        `[${new Date().toISOString()}] Creando enlace de onboarding de Stripe Connect para usuario ID: ${userId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Buscar si el usuario ya tiene una cuenta de Connect
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error(`Usuario con ID ${userId} no encontrado`);
      }

      let stripeConnectAccountId = "";

      // Para esta implementación de prueba, vamos a manejar el ID de la cuenta de Stripe Connect
      // directamente en el objeto de usuario
      // En un entorno de producción, se agregaría una tabla userSettings

      // Verificamos si el usuario ya tiene una cuenta conectada (asumimos que está en el campo userId)
      if (user.stripeConnectAccountId) {
        stripeConnectAccountId = user.stripeConnectAccountId;
        console.log(
          `[${new Date().toISOString()}] Usuario ya tiene cuenta de Stripe Connect: ${stripeConnectAccountId}`,
        );
      } else {
        // Crear una cuenta de Connect nueva para el usuario
        const account = await stripe.accounts.create({
          type: "express",
          email: user.email || undefined,
          metadata: {
            userId: userId.toString(),
          },
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
        });

        stripeConnectAccountId = account.id;

        // Guardar el ID de la cuenta de Connect en el usuario usando el método específico
        await storage.updateStripeConnectAccountId(userId, account.id);

        console.log(
          `[${new Date().toISOString()}] Cuenta de Stripe Connect creada - ID: ${account.id}`,
        );
      }

      // Crear el enlace de onboarding
      const accountLink = await stripe.accountLinks.create({
        account: stripeConnectAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: "account_onboarding",
      });

      console.log(
        `[${new Date().toISOString()}] Enlace de onboarding creado: ${accountLink.url.substring(0, 60)}...`,
      );
      return accountLink.url;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al crear enlace de onboarding de Stripe Connect:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtiene el estado de la cuenta de Stripe Connect
   */
  async getConnectAccountStatus(userId: number): Promise<any> {
    try {
      console.log(
        `[${new Date().toISOString()}] Obteniendo estado de cuenta Connect para usuario ID: ${userId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Buscar el usuario
      const user = await storage.getUser(userId);

      if (!user) {
        return {
          connected: false,
          message: "Usuario no encontrado",
        };
      }

      if (!user.stripeConnectAccountId) {
        return {
          connected: false,
          message: "El usuario no tiene una cuenta de Stripe Connect asociada",
        };
      }

      // Obtener los detalles de la cuenta
      const account = await stripe.accounts.retrieve(
        user.stripeConnectAccountId,
      );

      // Determinar si la cuenta está completamente configurada
      const isComplete =
        account.details_submitted &&
        account.charges_enabled &&
        account.payouts_enabled;

      return {
        connected: true,
        accountId: user.stripeConnectAccountId,
        isComplete,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        defaultCurrency: account.default_currency,
        createdAt: new Date((account.created || 0) * 1000),
        businessType: account.business_type,
        accountType: account.type,
      };
    } catch (error: any) {
      // Si el error es que la cuenta no existe, devolver un estado de no conectado
      if (
        error.type === "StripeInvalidRequestError" &&
        error.message.includes("No such account")
      ) {
        return {
          connected: false,
          message:
            "La cuenta de Stripe Connect asociada no existe o fue eliminada",
        };
      }

      console.error(
        `[${new Date().toISOString()}] Error al obtener estado de cuenta Connect:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtiene la lista de cuentas bancarias externas asociadas a una cuenta de Stripe Connect
   */
  async getConnectExternalAccounts(userId: number): Promise<any[]> {
    try {
      console.log(
        `[${new Date().toISOString()}] Obteniendo cuentas bancarias externas para usuario ID: ${userId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Buscar el usuario
      const user = await storage.getUser(userId);

      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      if (!user.stripeConnectAccountId) {
        throw new Error(
          "El usuario no tiene una cuenta de Stripe Connect asociada",
        );
      }

      // Obtener las cuentas bancarias externas
      const bankAccounts = await stripe.accounts.listExternalAccounts(
        user.stripeConnectAccountId,
        { object: "bank_account", limit: 10 },
      );

      // Mapear los resultados para simplificar la respuesta
      const formattedAccounts = bankAccounts.data.map((account: any) => ({
        id: account.id,
        accountHolderName: account.account_holder_name,
        accountHolderType: account.account_holder_type,
        bankName: account.bank_name,
        country: account.country,
        currency: account.currency,
        lastFour: account.last4,
        routingNumber: account.routing_number,
        status: account.status,
        isDefault: account.default_for_currency,
      }));

      console.log(
        `[${new Date().toISOString()}] Se encontraron ${formattedAccounts.length} cuentas bancarias externas`,
      );
      return formattedAccounts;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al obtener cuentas bancarias externas:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Crea un enlace de dashboard de Stripe Connect para que el usuario pueda gestionar su cuenta
   */
  async createConnectDashboardLink(
    userId: number,
    returnUrl: string,
  ): Promise<string> {
    try {
      console.log(
        `[${new Date().toISOString()}] Creando enlace de dashboard de Stripe Connect para usuario ID: ${userId}`,
      );

      // Verificar primero que la conexión a Stripe funciona
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Buscar el usuario
      const user = await storage.getUser(userId);

      if (!user) {
        throw new Error("Usuario no encontrado");
      }

      if (!user.stripeConnectAccountId) {
        throw new Error(
          "El usuario no tiene una cuenta de Stripe Connect asociada",
        );
      }

      // Crear el enlace al dashboard - la documentación más reciente usa una API diferente
      const loginLink = await stripe.accounts.createLoginLink(
        user.stripeConnectAccountId,
      );

      console.log(
        `[${new Date().toISOString()}] Enlace de dashboard creado: ${loginLink.url.substring(0, 60)}...`,
      );
      return loginLink.url;
    } catch (error) {
      console.error(
        `[${new Date().toISOString()}] Error al crear enlace de dashboard de Stripe Connect:`,
        error,
      );
      throw error;
    }
  }

  // 🎟️ VALIDATE PARTNER COUPON: Check if a partner code is valid in Stripe
  async validatePartnerCoupon(couponCode: string): Promise<{
    valid: boolean;
    percentOff?: number | null;
    amountOff?: number | null;
    duration?: string;
    name?: string;
    error?: string;
  }> {
    try {
      const normalizedCode = couponCode.trim().toUpperCase();
      console.log(`🎟️ [COUPON-VALIDATION] Validating coupon code: "${normalizedCode}"`);
      
      const coupons = await stripe.coupons.list({ limit: 100 });
      console.log(`🎟️ [COUPON-VALIDATION] Found ${coupons.data.length} coupons in Stripe`);
      
      // Log all available coupons for debugging
      coupons.data.forEach((c, idx) => {
        console.log(`  [${idx}] ID: "${c.id}" | Name: "${c.name}" | Valid: ${c.valid} | Percent Off: ${c.percent_off}% | Duration: ${c.duration}`);
      });
      
      // Improved matching logic: try exact match first
      let matched = coupons.data.find(
        (c) => c.id.toUpperCase() === normalizedCode || c.name?.toUpperCase() === normalizedCode
      );
      
      // If no exact match, try partial match on name
      if (!matched && coupons.data.length > 0) {
        matched = coupons.data.find(
          (c) => c.name?.toUpperCase().includes(normalizedCode) || normalizedCode.includes(c.name?.toUpperCase() || '')
        );
      }
      
      if (!matched) {
        console.log(`❌ [COUPON-VALIDATION] No matching coupon found for: "${normalizedCode}"`);
        return { valid: false, error: 'Invalid partner code. Please check the code and try again.' };
      }
      
      console.log(`✅ [COUPON-VALIDATION] Matched coupon: ID="${matched.id}" | Name="${matched.name}"`);
      
      if (!matched.valid) {
        console.log(`⚠️ [COUPON-VALIDATION] Coupon is invalid/expired: ${matched.id}`);
        return { valid: false, error: 'This partner code has expired or reached its usage limit.' };
      }
      
      console.log(`✅ [COUPON-VALIDATION] Coupon is valid - returning discount info`);
      return {
        valid: true,
        percentOff: matched.percent_off,
        amountOff: matched.amount_off,
        duration: matched.duration,
        name: matched.name || matched.id,
      };
    } catch (err: any) {
      console.error(`[${new Date().toISOString()}] ❌ [COUPON-VALIDATION] Error:`, err.message);
      console.error(`Stack trace:`, err.stack);
      return { valid: false, error: 'Could not validate coupon at this time. Please try again later.' };
    }
  }
}

export const stripeService = new StripeService();

import Stripe from "stripe";
import {
  SubscriptionPlan,
  UserSubscription,
  PaymentHistory,
} from "@shared/schema";
import { storage } from "../storage";

// Verificar que la clave secreta de Stripe esté configurada
// FORZAR MODO DE PRUEBA - usar solo la clave de test
const stripeKey = process.env.STRIPE_API_TEST_KEY;
console.log(stripeKey);

if (!stripeKey) {
  console.warn(
    "¡ADVERTENCIA! La clave secreta de Stripe no está configurada. Las funciones de pago no funcionarán correctamente.",
  );
}

// Inicializar Stripe con la clave secreta (usando clave de prueba para testing)
const stripe = new Stripe(stripeKey || "sk_test_placeholder", {
  apiVersion: "2023-10-16" as any, // Usar una versión compatible
});

// Log para identificar qué clave estamos usando
console.log(
  "🔑 [STRIPE-CONFIG] Using API key:",
  stripeKey ? `${stripeKey.substring(0, 12)}...` : "No key configured",
);
console.log("🔑 [STRIPE-CONFIG] Environment: FORCED TEST MODE");
console.log(
  "🔑 [STRIPE-CONFIG] Test key available:",
  !!process.env.STRIPE_API_TEST_KEY,
);

interface SubscriptionCheckoutOptions {
  planId: number;
  userId: number;
  email: string;
  name: string;
  billingCycle: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
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
          unit_amount: plan.yearlyPrice,
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

      // Primero verificar la conexión con Stripe
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error(
          "No se pudo establecer conexión con Stripe. Verifique las credenciales API.",
        );
      }

      // Use hardcoded plans instead of database
      const subscriptionPlans = [
        {
          id: 1,
          name: "Primo Chambeador",
          price: 0,
          interval: "monthly",
          code: "primo-chambeador",
          description: "Plan básico con funcionalidades esenciales",
        },
        {
          id: 2,
          name: "Mero Patrón",
          price: 4999, // $49.99 in cents
          interval: "monthly",
          code: "mero-patron",
          description: "Plan avanzado para contratistas profesionales",
        },
        {
          id: 3,
          name: "Master Contractor",
          price: 9999, // $99.99 in cents
          interval: "monthly",
          code: "master-contractor",
          description: "Plan completo con todas las funcionalidades",
        },
      ];

      const plan = subscriptionPlans.find((p) => p.id === options.planId);
      if (!plan) {
        throw new Error(`Plan con ID ${options.planId} no encontrado`);
      }

      console.log(
        `[${new Date().toISOString()}] Plan encontrado: ${plan.name} (${plan.code})`,
      );

      // Handle free plan separately
      if (plan.price === 0) {
        console.log(
          `[${new Date().toISOString()}] Plan gratuito seleccionado, redirigiendo a success`,
        );
        return options.successUrl;
      }

      try {
        // Create checkout session with inline price data
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: plan.name,
                  description: plan.description,
                },
                unit_amount: plan.price,
                recurring: {
                  interval:
                    options.billingCycle === "yearly" ? "year" : "month",
                },
              },
              quantity: 1,
            },
          ],
          mode: "subscription",
          success_url: options.successUrl,
          cancel_url: options.cancelUrl,
          customer_email: options.email,
          client_reference_id: options.userId.toString(),
          metadata: {
            userId: options.userId.toString(),
            planId: options.planId.toString(),
            billingCycle: options.billingCycle,
          },
        });

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
      const userId = parseInt(session.metadata.userId);
      const planId = parseInt(session.metadata.planId);
      const billingCycle = session.metadata.billingCycle;

      // Obtener detalles de la suscripción de Stripe
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription,
      );

      // Convertir los timestamp de Unix a objetos Date
      const currentPeriodStart = new Date(
        subscription.current_period_start * 1000,
      );
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000);

      // Crear o actualizar la suscripción en nuestra base de datos
      const existingSubscription =
        await storage.getUserSubscriptionByUserId(userId);

      if (existingSubscription) {
        console.log(
          `[${new Date().toISOString()}] Actualizando suscripción existente - ID: ${existingSubscription.id}`,
        );
        // Actualizar la suscripción existente
        await storage.updateUserSubscription(existingSubscription.id, {
          planId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          status: subscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          billingCycle,
          updatedAt: new Date(),
        });
      } else {
        console.log(
          `[${new Date().toISOString()}] Creando nueva suscripción para usuario - ID: ${userId}`,
        );
        // Crear una nueva suscripción
        await storage.createUserSubscription({
          userId,
          planId,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
          status: subscription.status,
          currentPeriodStart: currentPeriodStart,
          currentPeriodEnd: currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          billingCycle,
        });
      }
      console.log(
        `[${new Date().toISOString()}] Evento checkout.session.completed manejado correctamente`,
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
          subscriptionId: subscription.id,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid,
          status: "succeeded",
          paymentMethod: invoice.payment_method_details?.type || "unknown",
          receiptUrl: invoice.hosted_invoice_url,
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
          subscriptionId: subscription.id,
          stripePaymentIntentId: invoice.payment_intent,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due,
          status: "failed",
          paymentMethod: invoice.payment_method_details?.type || "unknown",
          receiptUrl: invoice.hosted_invoice_url,
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
}

export const stripeService = new StripeService();

import Stripe from 'stripe';
import { ProjectPayment, InsertProjectPayment, Project } from '@shared/schema';
import { storage } from '../storage';

// Verify that the Stripe secret key is configured
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('WARNING! Stripe secret key is not configured. Payment functions will not work correctly.');
}

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any, // Use a compatible version
});

// Options for creating a project payment checkout
interface ProjectPaymentCheckoutOptions {
  projectId: number;
  paymentType: 'deposit' | 'final';
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
}

// Options for creating a standalone payment link
interface PaymentLinkOptions {
  amount: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  userId: number;
  projectId?: number;
}

// Options for Stripe Connect onboarding
interface ConnectAccountOptions {
  userId: number;
  email: string;
  refreshUrl: string;
  returnUrl: string;
  businessType?: 'individual' | 'company';
  country?: string;
}

// Class to handle project payments with Stripe
export class ProjectPaymentService {
  /**
   * Verifies the connection to Stripe
   */
  async verifyStripeConnection(): Promise<boolean> {
    try {
      console.log(`[${new Date().toISOString()}] Verifying connection with Stripe`);
      // Use timeout to avoid long blocks
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout connecting to Stripe')), 10000);
      });

      // Make a simple query to Stripe
      const balancePromise = new Promise<boolean>(async (resolve) => {
        try {
          await stripe.balance.retrieve();
          resolve(true);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error verifying connection with Stripe:`, error);
          resolve(false);
        }
      });

      // Return the result of the first promise to resolve
      return await Promise.race([balancePromise, timeoutPromise]);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] General error verifying connection with Stripe:`, error);
      return false;
    }
  }
  
  /**
   * Creates a Stripe Connect account for a contractor
   */
  async createConnectAccount(options: ConnectAccountOptions): Promise<string> {
    try {
      console.log(`[${new Date().toISOString()}] Creating Stripe Connect account for user ID: ${options.userId}`);
      
      // Verify connection to Stripe first
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error('Could not establish connection with Stripe. Please verify API credentials.');
      }
      
      let existingAccountId: string | null = null;
      
      // Try to get existing user, but don't fail if user doesn't exist in storage
      try {
        const user = await storage.getUser(options.userId);
        if (user && user.stripeConnectAccountId) {
          existingAccountId = user.stripeConnectAccountId;
        }
      } catch (error) {
        console.log(`[${new Date().toISOString()}] User not found in storage, creating new Stripe account`);
        // Continue without failing - we'll create a new account
      }
      
      // If user has existing Connect account, refresh the onboarding link
      if (existingAccountId) {
        console.log(`[${new Date().toISOString()}] Existing Stripe account found: ${existingAccountId}`);
        return await this.refreshConnectAccountLink(
          existingAccountId, 
          options.refreshUrl, 
          options.returnUrl
        );
      }
      
      // Create a new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        email: options.email,
        business_type: options.businessType || 'individual',
        country: options.country || 'US',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId: options.userId.toString(),
          created: new Date().toISOString()
        }
      });
      
      // Try to update user record, but don't fail if storage operation fails
      try {
        await storage.updateUser(options.userId, {
          stripeConnectAccountId: account.id
        });
        console.log(`[${new Date().toISOString()}] User storage updated with Stripe account ID`);
      } catch (storageError) {
        console.warn(`[${new Date().toISOString()}] Could not update user storage:`, storageError);
        // Continue - Stripe account is already created successfully
      }
      
      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: options.refreshUrl,
        return_url: options.returnUrl,
        type: 'account_onboarding',
      });
      
      console.log(`[${new Date().toISOString()}] Stripe Connect account created successfully: ${account.id}`);
      return accountLink.url;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating Stripe Connect account:`, error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid API Key')) {
          throw new Error('Stripe API key is invalid or not configured properly');
        }
        if (error.message.includes('connection')) {
          throw new Error('Could not connect to Stripe services. Please check connectivity');
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Creates a new onboarding link for existing Stripe Connect account
   */
  async refreshConnectAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string> {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
      
      return accountLink.url;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error refreshing Connect account link:`, error);
      throw error;
    }
  }
  
  /**
   * Creates a dashboard link for a Stripe Connect account
   */
  async createConnectDashboardLink(userId: number): Promise<string> {
    try {
      // Get user with Connect account ID
      const user = await storage.getUser(userId);
      if (!user || !user.stripeConnectAccountId) {
        throw new Error('User does not have a Stripe Connect account');
      }
      
      // Create login link to Stripe dashboard
      const loginLink = await stripe.accounts.createLoginLink(user.stripeConnectAccountId);
      
      return loginLink.url;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating Connect dashboard link:`, error);
      throw error;
    }
  }
  
  /**
   * Creates a standalone payment link that can be shared with clients
   */
  async createPaymentLink(options: PaymentLinkOptions): Promise<string> {
    try {
      console.log(`[${new Date().toISOString()}] Creating payment link for $${options.amount}`);
      
      // Verify connection to Stripe
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error('Could not establish connection with Stripe. Please verify API credentials.');
      }
      
      // Get user to check if they have a Connect account
      const user = await storage.getUser(options.userId);
      if (!user) {
        throw new Error(`User with ID ${options.userId} not found`);
      }
      
      // Create a product for this payment
      const product = await stripe.products.create({
        name: options.description,
        metadata: {
          userId: options.userId.toString(),
          projectId: options.projectId?.toString() || 'standalone',
          createdAt: new Date().toISOString()
        }
      });
      
      // Create a price for the product
      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(options.amount * 100), // Convert to cents
        currency: 'usd',
      });
      
      // Create payment link with the price
      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price: price.id,
            quantity: 1,
          },
        ],
        after_completion: {
          type: 'redirect',
          redirect: {
            url: options.successUrl,
          },
        },
        payment_method_types: ['card'],
        metadata: {
          userId: options.userId.toString(),
          projectId: options.projectId?.toString() || 'standalone',
          description: options.description
        }
      });
      
      // Store the payment link in the database
      const paymentData: InsertProjectPayment = {
        userId: options.userId,
        projectId: options.projectId,
        amount: options.amount * 100, // Store in cents for consistency
        type: 'custom',
        status: 'pending',
        checkoutUrl: paymentLink.url
      };
      
      await storage.createProjectPayment(paymentData);
      
      console.log(`[${new Date().toISOString()}] Payment link created: ${paymentLink.url}`);
      return paymentLink.url;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error creating payment link:`, error);
      throw error;
    }
  }

  /**
   * Crea una sesión de checkout para un pago de proyecto
   */
  async createProjectPaymentCheckout(options: ProjectPaymentCheckoutOptions): Promise<string> {
    const { projectId: projectIdParam, paymentType, successUrl, cancelUrl, customerEmail, customerName } = options;
    const startTime = Date.now();
    
    try {
      console.log(`[${new Date().toISOString()}] Iniciando creación de checkout para proyecto ${projectIdParam}, tipo: ${paymentType}`);
      
      // Verificamos primero la conexión con Stripe
      const isConnected = await this.verifyStripeConnection();
      if (!isConnected) {
        throw new Error('No se pudo establecer conexión con Stripe. Verifique las credenciales API.');
      }
      
      // Obtener el proyecto
      const project = await storage.getProject(projectIdParam);
      if (!project) {
        throw new Error(`Proyecto con ID ${projectIdParam} no encontrado`);
      }
      
      // Verificar que los campos necesarios existen
      if (!project.totalPrice || project.totalPrice <= 0) {
        throw new Error('El proyecto no tiene un precio válido definido');
      }
      
      const totalPrice = project.totalPrice;
      const fenceType = project.fenceType || 'Proyecto';
      const address = project.address || 'Sin dirección';
      const projectId = project.id;
      const userId = project.userId || 0;
      const projectIdString = project.projectId || `PROJ-${projectId}`;
      
      if (userId === 0) {
        throw new Error('El proyecto no tiene un usuario válido asignado');
      }
      
      // Calcular el monto a cobrar según el tipo de pago (depósito o final)
      let amount: number;
      let paymentDescription: string;
      
      if (paymentType === 'deposit') {
        // Depósito del 50%
        amount = Math.round(totalPrice * 0.5);
        paymentDescription = `Depósito (50%) - ${fenceType} - ${address}`;
      } else {
        // Pago final del 50% restante
        amount = Math.round(totalPrice * 0.5); 
        paymentDescription = `Pago final (50%) - ${fenceType} - ${address}`;
      }
      
      console.log(`[${new Date().toISOString()}] Monto calculado para el pago: $${amount / 100} (${amount}¢)`);
      
      // Crear la sesión de checkout en Stripe
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: paymentDescription,
                  description: `Proyecto: ${projectIdString} - ${address}`,
                },
                unit_amount: amount,
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: successUrl,
          cancel_url: cancelUrl,
          customer_email: customerEmail || (project.clientEmail as string | undefined),
          metadata: {
            projectId: projectId.toString(),
            userId: userId.toString(),
            paymentType,
            projectIdString: projectIdString,
          },
        });
        
        if (!session || !session.url) {
          throw new Error('No se pudo crear la sesión de checkout');
        }
        
        // Guardar la información del pago en nuestra base de datos
        const paymentData: InsertProjectPayment = {
          projectId: project.id,
          userId: project.userId,
          amount,
          type: paymentType,
          status: 'pending',
          stripeCheckoutSessionId: session.id,
          checkoutUrl: session.url,
        };
        
        await storage.createProjectPayment(paymentData);
        
        console.log(`[${new Date().toISOString()}] Sesión de checkout creada correctamente con ID:`, session.id);
        const endTime = Date.now();
        console.log(`[${new Date().toISOString()}] Checkout completado en ${endTime - startTime}ms`);
        return session.url;
      } catch (stripeError: any) {
        console.error(`[${new Date().toISOString()}] Error específico de Stripe durante la creación de checkout:`, stripeError);
        if (stripeError.type === 'StripeAuthenticationError') {
          throw new Error('Error de autenticación con Stripe: La clave API no es válida.');
        }
        throw stripeError;
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error general al crear sesión de checkout para proyecto:`, error);
      throw error;
    }
  }

  /**
   * Maneja el evento checkout.session.completed de Stripe para pagos de proyectos
   */
  async handleProjectCheckoutCompleted(session: any): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Manejando evento checkout.session.completed para proyecto - Sesión ID: ${session.id}`);
      
      // Verificar que la sesión es para un pago de proyecto (debe tener projectId en metadata)
      if (!session.metadata?.projectId) {
        console.log(`[${new Date().toISOString()}] Sesión ${session.id} no es para un pago de proyecto, ignorando`);
        return;
      }
      
      const projectId = parseInt(session.metadata.projectId);
      const paymentType = session.metadata.paymentType;
      const paymentIntentId = session.payment_intent;
      
      // Buscar el pago en nuestra base de datos
      const projectPayments = await storage.getProjectPaymentsByCheckoutSessionId(session.id);
      
      if (!projectPayments || projectPayments.length === 0) {
        console.error(`[${new Date().toISOString()}] No se encontró el pago con sessionId ${session.id} en la base de datos`);
        return;
      }
      
      const payment = projectPayments[0];
      
      // Obtener detalles del PaymentIntent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      // Actualizar el estado del pago
      await storage.updateProjectPayment(payment.id, {
        status: 'succeeded',
        stripePaymentIntentId: paymentIntentId,
        paymentMethod: Array.isArray(paymentIntent.payment_method_types) 
          ? paymentIntent.payment_method_types[0] 
          : 'card',
        paymentDate: new Date(),
      });
      
      // Obtener el proyecto
      const project = await storage.getProject(projectId);
      
      if (!project) {
        console.error(`[${new Date().toISOString()}] Proyecto ${projectId} no encontrado`);
        return;
      }
      
      // Actualizar el estado de pago del proyecto
      let paymentStatus = project.paymentStatus || 'pending';
      
      // Inicializar paymentDetails
      let paymentDetails: any = { history: [] };
      
      // Si existe paymentDetails, intentar parsearlo
      if (project.paymentDetails) {
        if (typeof project.paymentDetails === 'string') {
          try {
            paymentDetails = JSON.parse(project.paymentDetails);
          } catch (e) {
            console.error('Error al parsear paymentDetails del proyecto, inicializando nuevo:', e);
            paymentDetails = { history: [] };
          }
        } else {
          paymentDetails = project.paymentDetails;
        }
      }
      
      // Asegurar que history sea un array
      if (!paymentDetails.history || !Array.isArray(paymentDetails.history)) {
        paymentDetails.history = [];
      }
      
      // Agregar el pago al historial
      paymentDetails.history.push({
        date: new Date(),
        amount: payment.amount || 0,
        method: Array.isArray(paymentIntent.payment_method_types) 
          ? paymentIntent.payment_method_types[0] 
          : 'card',
        type: paymentType,
        reference: paymentIntentId,
      });
      
      // Calcular el total pagado
      const totalPaid = paymentDetails.history.reduce((sum: number, payment: any) => sum + (payment.amount || 0), 0);
      paymentDetails.totalPaid = totalPaid;
      
      // Determinar el estado de pago
      const projectTotalPrice = project.totalPrice || 0;
      if (totalPaid >= projectTotalPrice && projectTotalPrice > 0) {
        paymentStatus = 'paid';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }
      
      // Actualizar el proyecto
      await storage.updateProject(projectId, {
        paymentStatus,
        paymentDetails,
      });
      
      // Si era un pago de depósito, actualizar el progreso del proyecto
      if (paymentType === 'deposit' && project.projectProgress === 'contract_signed') {
        await storage.updateProject(projectId, {
          projectProgress: 'scheduled',
        });
      }
      
      console.log(`[${new Date().toISOString()}] Pago de proyecto procesado correctamente. ID: ${payment.id}, Estado: ${paymentStatus}`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error al procesar checkout completado para proyecto:`, error);
      throw error;
    }
  }
  
  /**
   * Maneja un evento de webhook de Stripe
   */
  async handleWebhookEvent(event: any): Promise<void> {
    try {
      console.log(`[${new Date().toISOString()}] Evento de webhook recibido para pagos de proyecto: ${event.type}`);
      
      switch (event.type) {
        case 'checkout.session.completed':
          // Sólo manejar si es un pago de proyecto (tiene projectId en metadata)
          if (event.data.object.metadata?.projectId) {
            await this.handleProjectCheckoutCompleted(event.data.object);
          }
          break;
        default:
          console.log(`[${new Date().toISOString()}] Evento de Stripe no manejado por ProjectPaymentService: ${event.type}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error al manejar evento de webhook para pagos de proyecto:`, error);
      throw error;
    }
  }

  /**
   * Reenvía el enlace de pago a un cliente
   */
  async resendPaymentLink(paymentId: number): Promise<string> {
    try {
      console.log(`[${new Date().toISOString()}] Reenviando enlace de pago ID: ${paymentId}`);
      
      // Obtener datos del pago
      const payment = await storage.getProjectPayment(paymentId);
      
      if (!payment) {
        throw new Error(`Pago con ID ${paymentId} no encontrado`);
      }
      
      // Si el pago ya está completado, no reenviar
      if (payment.status === 'succeeded') {
        throw new Error('Este pago ya ha sido completado y no puede reenviarse');
      }
      
      // Si el pago tiene un URL válido y su estado es pending, devolver el mismo URL
      if (payment.checkoutUrl && payment.status === 'pending') {
        return payment.checkoutUrl;
      }
      
      // De lo contrario, crear un nuevo checkout
      if (!payment.projectId) {
        throw new Error(`El pago no tiene un proyecto asociado válido`);
      }
      
      const projectId = payment.projectId;
      const project = await storage.getProject(projectId);
      
      if (!project) {
        throw new Error(`Proyecto con ID ${projectId} no encontrado`);
      }
      
      // Asegurar que el tipo de pago sea válido
      const paymentType: 'deposit' | 'final' = 
        (payment.type === 'deposit' || payment.type === 'final') 
          ? payment.type 
          : 'deposit';
      
      // Usar un projectId string seguro
      const projectIdString = project.projectId || `PROJ-${project.id}`;
      
      // Crear nuevo checkout con los mismos parámetros
      const checkoutUrl = await this.createProjectPaymentCheckout({
        projectId: projectId,
        paymentType: paymentType,
        successUrl: `${process.env.APP_URL || 'http://localhost:5000'}/projects/${projectIdString}?payment_success=true`,
        cancelUrl: `${process.env.APP_URL || 'http://localhost:5000'}/projects/${projectIdString}?payment_canceled=true`,
        customerEmail: project.clientEmail ? String(project.clientEmail) : undefined,
      });
      
      return checkoutUrl;
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error al reenviar enlace de pago:`, error);
      throw error;
    }
  }
}

// Instancia singleton del servicio
export const projectPaymentService = new ProjectPaymentService();

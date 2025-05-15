import Stripe from 'stripe';
import { ProjectPayment, InsertProjectPayment, Project } from '@shared/schema';
import { storage } from '../storage';

// Verificar que la clave secreta de Stripe esté configurada
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('¡ADVERTENCIA! La clave secreta de Stripe no está configurada. Las funciones de pago no funcionarán correctamente.');
}

// Inicializar Stripe con la clave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2023-10-16' as any, // Usar una versión compatible
});

// Opciones para crear un checkout de pago de proyecto
interface ProjectPaymentCheckoutOptions {
  projectId: number;
  paymentType: 'deposit' | 'final';
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  customerName?: string;
}

// Clase para manejar los pagos de proyectos con Stripe
export class ProjectPaymentService {
  /**
   * Verifica la conexión con Stripe
   */
  async verifyStripeConnection(): Promise<boolean> {
    try {
      console.log(`[${new Date().toISOString()}] Verificando conexión con Stripe`);
      // Usar timeout para evitar bloqueos largos
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout al conectar con Stripe')), 10000);
      });

      // Realizar una consulta simple a Stripe
      const balancePromise = new Promise<boolean>(async (resolve) => {
        try {
          await stripe.balance.retrieve();
          resolve(true);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error al verificar conexión con Stripe:`, error);
          resolve(false);
        }
      });

      // Devolver el resultado de la primera promesa que se resuelva
      return await Promise.race([balancePromise, timeoutPromise]);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error general al verificar conexión con Stripe:`, error);
      return false;
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
        paymentMethod: paymentIntent.payment_method_types[0],
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
      let paymentDetails = project.paymentDetails || { history: [] };
      
      if (!paymentDetails.history) {
        paymentDetails = { ...paymentDetails, history: [] };
      }
      
      // Agregar el pago al historial
      paymentDetails.history.push({
        date: new Date(),
        amount: payment.amount,
        method: paymentIntent.payment_method_types[0],
        type: paymentType,
        reference: paymentIntentId,
      });
      
      // Calcular el total pagado
      const totalPaid = paymentDetails.history.reduce((sum: number, payment: any) => sum + payment.amount, 0);
      paymentDetails.totalPaid = totalPaid;
      
      // Determinar el estado de pago
      if (totalPaid >= project.totalPrice) {
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
      const project = await storage.getProject(payment.projectId);
      
      if (!project) {
        throw new Error(`Proyecto con ID ${payment.projectId} no encontrado`);
      }
      
      // Crear nuevo checkout con los mismos parámetros
      const checkoutUrl = await this.createProjectPaymentCheckout({
        projectId: payment.projectId,
        paymentType: payment.type as 'deposit' | 'final',
        successUrl: `${process.env.APP_URL || 'http://localhost:5000'}/projects/${project.projectId}?payment_success=true`,
        cancelUrl: `${process.env.APP_URL || 'http://localhost:5000'}/projects/${project.projectId}?payment_canceled=true`,
        customerEmail: project.clientEmail,
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
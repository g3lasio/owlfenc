
import { apiRequest } from '@/lib/queryClient';

// Tipos para los pagos
export interface PaymentLink {
  id: number;
  projectId?: number;
  projectName?: string;
  type: 'deposit' | 'final' | 'custom';
  status: 'pending' | 'paid' | 'succeeded' | 'expired' | 'cancelled' | 'canceled';
  amount: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  checkoutUrl?: string;
  description?: string;
  paymentMethod?: string;
  createdAt: string;
  updatedAt?: string;
  paymentDate?: string;
}

export interface StripeAccountStatus {
  hasStripeAccount: boolean;
  accountDetails?: {
    id: string;
    email?: string;
    businessType?: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    defaultCurrency?: string;
    country?: string;
  };
}

export interface CreatePaymentLinkRequest {
  amount: number;
  description: string;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
  projectId?: number;
}

export interface CreatePaymentLinkResponse {
  url: string;
}

class PaymentService {
  /**
   * Obtiene todos los enlaces de pago del usuario actual
   */
  async getPaymentLinks(): Promise<PaymentLink[]> {
    try {
      return await apiRequest<PaymentLink[]>('GET', '/api/payment-links');
    } catch (error) {
      console.error('Error al obtener enlaces de pago:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado de la cuenta Stripe Connect del usuario
   */
  async getStripeAccountStatus(): Promise<StripeAccountStatus> {
    try {
      return await apiRequest<StripeAccountStatus>('GET', '/api/stripe/account-status');
    } catch (error) {
      console.error('Error al obtener estado de cuenta Stripe:', error);
      throw error;
    }
  }

  /**
   * Inicia el proceso de onboarding de Stripe Connect
   */
  async connectStripeAccount(businessType?: 'individual' | 'company', country?: string): Promise<{ url: string }> {
    try {
      return await apiRequest<{ url: string }>('POST', '/api/stripe/connect', {
        businessType,
        country
      });
    } catch (error) {
      console.error('Error al conectar cuenta de Stripe:', error);
      throw error;
    }
  }

  /**
   * Obtiene un enlace al dashboard de Stripe Connect
   */
  async getStripeDashboardLink(): Promise<{ url: string }> {
    try {
      return await apiRequest<{ url: string }>('GET', '/api/stripe/dashboard');
    } catch (error) {
      console.error('Error al obtener enlace del dashboard de Stripe:', error);
      throw error;
    }
  }

  /**
   * Crea un enlace de pago
   */
  async createPaymentLink(data: CreatePaymentLinkRequest): Promise<CreatePaymentLinkResponse> {
    try {
      return await apiRequest<CreatePaymentLinkResponse>('POST', '/api/payment-links', data);
    } catch (error) {
      console.error('Error al crear enlace de pago:', error);
      throw error;
    }
  }

  /**
   * Reenvía un enlace de pago existente
   */
  async resendPaymentLink(paymentId: number): Promise<{ url: string }> {
    try {
      return await apiRequest<{ url: string }>('POST', `/api/payment-links/${paymentId}/resend`);
    } catch (error) {
      console.error('Error al reenviar enlace de pago:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();

/**
 * PublicCheckout — Client-Facing Payment Page with Tip Support
 * 
 * Decisión 3 — PAYG Strategy:
 * This is a PUBLIC page (no login required) that the client opens via a payment link.
 * The client can optionally add a tip before paying.
 * 
 * Route: /pay/:paymentId
 * 
 * Flow:
 * 1. Load payment details from /api/public-checkout/:paymentId
 * 2. Client selects optional tip (0%, 10%, 15%, 20%, or custom)
 * 3. Create PaymentIntent via /api/public-checkout/:paymentId/create-intent
 * 4. Stripe Elements handles card collection
 * 5. On success, confirm via /api/public-checkout/:paymentId/confirm
 * 6. Show success screen
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { getStripe } from '@/lib/stripe';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, CreditCard, DollarSign, Loader2, Heart } from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PublicPaymentData {
  id: number;
  amount: number;       // Base amount in cents
  type: string;
  description: string | null;
  clientName: string | null;
  invoiceNumber: string | null;
  status: string;
  dueDate: string | null;
}

type TipOption = 0 | 10 | 15 | 20 | 'custom';

// ─────────────────────────────────────────────────────────────────────────────
// Stripe Payment Form (inner component, must be inside <Elements>)
// ─────────────────────────────────────────────────────────────────────────────

interface StripeFormProps {
  paymentId: number;
  totalAmount: number;   // Total in cents (base + tip)
  tipAmount: number;     // Tip in cents
  onSuccess: () => void;
}

const StripePaymentForm: React.FC<StripeFormProps> = ({ paymentId, totalAmount, tipAmount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: 'Pago fallido',
          description: error.message,
          variant: 'destructive',
        });
        setProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm with backend
        await fetch(`/api/public-checkout/${paymentId}/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            tipAmount,
          }),
        });

        onSuccess();
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Error procesando el pago',
        variant: 'destructive',
      });
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 text-lg font-semibold rounded-xl"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Procesando...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Pagar ${(totalAmount / 100).toFixed(2)}
          </>
        )}
      </Button>

      <p className="text-center text-xs text-gray-400">
        Pago seguro procesado por Stripe. Tu información de tarjeta nunca se almacena en nuestros servidores.
      </p>
    </form>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const PublicCheckout: React.FC = () => {
  const params = useParams<{ paymentId: string }>();
  const paymentId = parseInt(params.paymentId || '0');
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<PublicPaymentData | null>(null);
  const [stripeKey, setStripeKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tip state
  const [selectedTip, setSelectedTip] = useState<TipOption>(0);
  const [customTipDollars, setCustomTipDollars] = useState('');

  // Checkout state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [paid, setPaid] = useState(false);

  // ── Load payment details ──────────────────────────────────────────────────

  useEffect(() => {
    if (!paymentId || isNaN(paymentId)) {
      setError('Enlace de pago inválido.');
      setLoading(false);
      return;
    }

    fetch(`/api/public-checkout/${paymentId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error || 'No se encontró el pago.');
        } else {
          setPayment(data.data);
          setStripeKey(data.stripePublishableKey);
          setTotalAmount(data.data.amount);
        }
      })
      .catch(() => setError('Error cargando los detalles del pago.'))
      .finally(() => setLoading(false));
  }, [paymentId]);

  // ── Tip calculation ───────────────────────────────────────────────────────

  const computedTipCents = (): number => {
    if (!payment) return 0;
    if (selectedTip === 'custom') {
      const dollars = parseFloat(customTipDollars) || 0;
      return Math.round(dollars * 100);
    }
    return Math.round(payment.amount * (selectedTip / 100));
  };

  const computedTotal = (): number => {
    if (!payment) return 0;
    return payment.amount + computedTipCents();
  };

  // ── Create PaymentIntent ──────────────────────────────────────────────────

  const handleProceedToPayment = async () => {
    if (!payment) return;
    setCreatingIntent(true);

    const tip = computedTipCents();

    try {
      const res = await fetch(`/api/public-checkout/${paymentId}/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipAmount: tip }),
      });
      const data = await res.json();

      if (!data.success) {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
        return;
      }

      setClientSecret(data.clientSecret);
      setTotalAmount(data.totalAmount);
      setTipAmount(data.tipAmount);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setCreatingIntent(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-green-400" />
          <p className="text-lg">Cargando detalles del pago...</p>
        </div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace no válido</h2>
          <p className="text-gray-500">{error || 'Este enlace de pago no existe o ha expirado.'}</p>
        </div>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 to-green-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Pago Exitoso!</h2>
          <p className="text-gray-500 mb-4">
            Tu pago de <strong>${(totalAmount / 100).toFixed(2)}</strong> ha sido procesado correctamente.
          </p>
          {tipAmount > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
              <p className="text-green-700 text-sm flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" />
                Gracias por tu propina de ${(tipAmount / 100).toFixed(2)}. ¡El contratista lo agradece!
              </p>
            </div>
          )}
          <p className="text-xs text-gray-400">
            Factura #{payment.invoiceNumber} · Recibirás una confirmación por correo.
          </p>
        </div>
      </div>
    );
  }

  const baseAmountDollars = (payment.amount / 100).toFixed(2);
  const tipDollars = (computedTipCents() / 100).toFixed(2);
  const totalDollars = (computedTotal() / 100).toFixed(2);
  const tipOptions: TipOption[] = [0, 10, 15, 20, 'custom'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-green-100 text-sm">Solicitud de Pago</p>
              <h1 className="text-xl font-bold">
                {payment.description || `Pago ${payment.type}`}
              </h1>
            </div>
          </div>
          {payment.invoiceNumber && (
            <p className="text-green-200 text-xs mt-1">Factura #{payment.invoiceNumber}</p>
          )}
        </div>

        <div className="p-6 space-y-6">

          {/* Amount Summary */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Monto base</span>
              <span className="font-medium">${baseAmountDollars}</span>
            </div>
            {computedTipCents() > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3" /> Propina
                </span>
                <span className="font-medium">+${tipDollars}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-gray-800">
              <span>Total</span>
              <span className="text-lg">${totalDollars}</span>
            </div>
          </div>

          {/* Tip Selector (only shown before creating the intent) */}
          {!clientSecret && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Heart className="w-4 h-4 text-pink-500" />
                ¿Deseas agregar una propina? (Opcional)
              </p>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {tipOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedTip(opt)}
                    className={`py-2 px-1 rounded-lg text-sm font-medium border transition-all ${
                      selectedTip === opt
                        ? 'bg-green-600 text-white border-green-600 shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
                    }`}
                  >
                    {opt === 0 ? 'Sin propina' : opt === 'custom' ? 'Otro' : `${opt}%`}
                  </button>
                ))}
              </div>

              {selectedTip === 'custom' && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-gray-500 font-medium">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={customTipDollars}
                    onChange={(e) => setCustomTipDollars(e.target.value)}
                    className="flex-1"
                  />
                </div>
              )}

              {computedTipCents() > 0 && (
                <p className="text-xs text-green-600 mt-2 text-center">
                  ¡Genial! Tu propina de ${tipDollars} irá directamente al contratista.
                </p>
              )}

              <Button
                onClick={handleProceedToPayment}
                disabled={creatingIntent}
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white py-4 text-base font-semibold rounded-xl"
              >
                {creatingIntent ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Preparando pago...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5 mr-2" />
                    Continuar al Pago — ${totalDollars}
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Stripe Elements (shown after creating the intent) */}
          {clientSecret && stripeKey && (
            <Elements
              stripe={getStripe()}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#16a34a',
                    borderRadius: '8px',
                  },
                },
              }}
            >
              <StripePaymentForm
                paymentId={paymentId}
                totalAmount={totalAmount}
                tipAmount={tipAmount}
                onSuccess={() => setPaid(true)}
              />
            </Elements>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublicCheckout;

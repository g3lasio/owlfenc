import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { 
  CardElement, 
  useStripe, 
  useElements 
} from "@stripe/react-stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// 🔧 FIX: Safe Stripe loading with error handling
const getStripePromise = () => {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!stripeKey) {
    console.warn('🔧 [STRIPE-FIX] VITE_STRIPE_PUBLIC_KEY not found - Stripe payments disabled');
    return null;
  }
  
  try {
    return loadStripe(stripeKey);
  } catch (error) {
    console.warn('🔧 [STRIPE-FIX] Failed to load Stripe.js:', error);
    return null;
  }
};

const stripePromise = getStripePromise();

// Estilos para CardElement
const cardElementStyle = {
  style: {
    base: {
      fontSize: "16px",
      color: "var(--card-foreground)",
      "::placeholder": {
        color: "var(--muted-foreground)",
      },
    },
    invalid: {
      color: "var(--destructive)",
      iconColor: "var(--destructive)",
    },
  },
};

// Componente CardForm interno que utiliza los hooks de Stripe
function CardFormContent({ clientSecret, onSuccess }: { clientSecret: string, onSuccess?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe aún no está cargado
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      return;
    }

    if (!cardComplete) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Por favor complete los datos de la tarjeta",
      });
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: setupError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {},
          },
        }
      );

      if (setupError) {
        // Mostrar error
        setError(setupError.message || "Error al procesar la tarjeta");
        toast({
          variant: "destructive",
          title: "Error de tarjeta",
          description: setupError.message || "No se pudo verificar la tarjeta. Inténtelo de nuevo.",
        });
      } else if (setupIntent.status === "succeeded") {
        // Éxito
        toast({
          title: "Tarjeta guardada",
          description: "Su tarjeta ha sido guardada correctamente",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al procesar la tarjeta");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Ocurrió un problema al procesar la tarjeta. Inténtelo de nuevo.",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <div className="font-medium">Datos de la tarjeta</div>
        <div className="border rounded-md p-4">
          <CardElement 
            options={cardElementStyle} 
            onChange={(e) => {
              setCardComplete(e.complete);
              setError(e.error ? e.error.message : "");
            }}
          />
        </div>
        {error && (
          <div className="text-sm text-destructive mt-1">{error}</div>
        )}
      </div>
      
      <Button 
        type="submit" 
        className="w-full" 
        disabled={processing || !stripe || !elements || !cardComplete}
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Procesando...
          </>
        ) : (
          "Guardar Tarjeta"
        )}
      </Button>
    </form>
  );
}

// Componente principal que carga Stripe Elements
export function CardForm({ onSuccess }: { onSuccess?: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Obtener el setup intent desde el servidor
    const fetchSetupIntent = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/subscription/setup-intent", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("No se pudo obtener la configuración de pago");
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "No se pudo inicializar el formulario de pago",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSetupIntent();
  }, [toast]);

  // 🔧 FIX: Handle Stripe loading errors
  if (!stripePromise) {
    return (
      <div className="text-center py-8 px-4 border rounded-lg bg-yellow-50">
        <div className="text-yellow-600 mb-2">⚠️ Payment System Unavailable</div>
        <p className="text-sm text-gray-600">
          Stripe payment processing is currently unavailable. Please contact support or try again later.
        </p>
      </div>
    );
  }

  if (loading || !clientSecret) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardFormContent clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  );
}
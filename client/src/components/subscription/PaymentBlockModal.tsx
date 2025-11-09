import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useLocation } from "wouter";

interface PaymentBlockModalProps {
  isOpen: boolean;
  onClose?: () => void;
  reason?: 'payment_failed' | 'subscription_inactive' | 'subscription_canceled';
  nextBillingDate?: string;
}

export function PaymentBlockModal({
  isOpen,
  onClose,
  reason = 'payment_failed',
  nextBillingDate
}: PaymentBlockModalProps) {
  const [, setLocation] = useLocation();

  const getMessage = () => {
    switch (reason) {
      case 'payment_failed':
        return {
          title: "Tu cuenta está temporalmente suspendida",
          description: "Tu pago no pudo ser procesado y tu acceso premium está pausado.",
          action: "Actualiza tu método de pago para no perder tus beneficios.",
          footer: "Te damos chance, pero no tardes… la chamba no espera."
        };
      case 'subscription_inactive':
        return {
          title: "Tu suscripción está inactiva",
          description: "Detectamos un problema con tu suscripción y tu acceso está limitado.",
          action: "Revisa tu método de pago para reactivar tu cuenta.",
          footer: "Las oportunidades no esperan, compa. Reactiva tu plan ahora."
        };
      case 'subscription_canceled':
        return {
          title: "Tu suscripción ha sido cancelada",
          description: "Has cancelado tu plan premium y ahora tienes acceso limitado.",
          action: "Si cambiaste de opinión, puedes reactivar tu suscripción en cualquier momento.",
          footer: "Aquí seguimos cuando estés listo para darle con todo de nuevo."
        };
      default:
        return {
          title: "Acceso limitado",
          description: "Tu cuenta tiene acceso limitado a las funciones premium.",
          action: "Actualiza tu suscripción para desbloquear todas las herramientas.",
          footer: "Las mejores herramientas están esperándote."
        };
    }
  };

  const message = getMessage();

  const handleUpdatePayment = () => {
    setLocation('/subscription');
    if (onClose) onClose();
  };

  const handleViewPlans = () => {
    setLocation('/subscription');
    if (onClose) onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/20">
              <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
            </div>
          </div>
          <AlertDialogTitle className="text-center text-xl">
            {message.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center space-y-3 pt-2">
            <p className="text-base">
              {message.description}
            </p>
            <p className="text-base font-medium text-foreground">
              {message.action}
            </p>
            {nextBillingDate && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Próximo intento de cobro:</strong>
                  <br />
                  {new Date(nextBillingDate).toLocaleDateString('es-MX', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            )}
            <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-r-lg">
              <p className="text-sm italic text-amber-900 dark:text-amber-200">
                {message.footer}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2">
          {reason !== 'subscription_canceled' && (
            <Button
              onClick={handleUpdatePayment}
              className="w-full"
              size="lg"
              data-testid="button-update-payment"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Actualizar Método de Pago
            </Button>
          )}
          <Button
            onClick={handleViewPlans}
            variant={reason === 'subscription_canceled' ? 'default' : 'outline'}
            className="w-full"
            size="lg"
            data-testid="button-view-plans"
          >
            {reason === 'subscription_canceled' ? 'Reactivar Suscripción' : 'Ver Mi Cuenta'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

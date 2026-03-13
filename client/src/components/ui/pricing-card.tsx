import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Hammer, Crown, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface PricingCardProps {
  name: string;
  description: string;
  price: number;
  yearlyPrice: number;
  features: string[];
  isYearly: boolean;
  motto: string;
  isMostPopular?: boolean;
  onSelectPlan: (planId: number) => void;
  planId: number;
  isLoading?: boolean;
  code?: string;
  isActive?: boolean;
  expirationDate?: Date;
  currentUserPlanId?: number;
  onManageSubscription?: () => void;
  // hasUsedTrial kept for backward compat but no longer used
  hasUsedTrial?: boolean;
}

export function PricingCard({
  name,
  description,
  price,
  yearlyPrice,
  features,
  isYearly,
  motto,
  isMostPopular = false,
  onSelectPlan,
  planId,
  isLoading = false,
  code = '',
  isActive = false,
  expirationDate,
  currentUserPlanId = 1,
  onManageSubscription,
}: PricingCardProps) {
  const isPrimoChambeador = code === 'PRIMO_CHAMBEADOR' || code === 'primo_chambeador';
  const isPaidPlan = price > 0;

  // For yearly: show monthly equivalent price
  const monthlyEquivalent = isPaidPlan && isYearly ? yearlyPrice / 12 / 100 : null;
  const displayPrice = isYearly ? yearlyPrice / 100 : price / 100;
  const period = isYearly ? "/año" : "/mes";

  // Determinar el tipo de acción según el plan actual del usuario
  const getActionType = () => {
    if (isActive) return 'current';
    if (planId > currentUserPlanId) return 'upgrade';
    if (planId < currentUserPlanId) return 'downgrade';
    return 'select';
  };

  const actionType = getActionType();

  // Función para formatear precio en dólares estadounidenses
  const formatPrice = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Etiqueta del botón de upgrade — sin ninguna referencia a "trial"
  const getUpgradeLabel = () => {
    if (isPrimoChambeador) return "Empezar Ahora";
    if (code === 'mero_patron') return "Upgrade to Mero Patrón";
    if (code === 'MASTER_CONTRACTOR' || code === 'master_contractor') return "Upgrade to Master";
    return "Upgrade Now";
  };

  // Determinar el ícono según el código del plan
  const renderPlanIcon = () => {
    switch (code) {
      case 'PRIMO_CHAMBEADOR':
      case 'primo_chambeador':
        return <Hammer className="h-6 w-6 text-orange-500" />;
      case 'mero_patron':
        return <Crown className="h-6 w-6 text-primary" />;
      case 'MASTER_CONTRACTOR':
      case 'master_contractor':
        return <Zap className="h-6 w-6 text-purple-500" />;
      default:
        return <Trophy className="h-6 w-6 text-amber-500" />;
    }
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col justify-between transition-all duration-200",
        isMostPopular
          ? "border-primary shadow-lg scale-[1.02] z-10"
          : "hover:border-primary hover:shadow-md hover:scale-[1.01]"
      )}
    >
      {isMostPopular && (
        <div className="absolute -top-4 left-0 right-0 flex justify-center">
          <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
            MÁS POPULAR
          </span>
        </div>
      )}
      <div>
        <CardHeader className="pb-2 text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            {renderPlanIcon()}
            <CardTitle className="text-xl">{name}</CardTitle>
          </div>
          {/* PAYG badge for Primo Chambeador */}
          {isPrimoChambeador && (
            <div className="flex justify-center mb-1">
              <span className="inline-block rounded-full bg-orange-100 dark:bg-orange-950/40 px-3 py-0.5 text-xs font-semibold text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                Pay As You Go
              </span>
            </div>
          )}
          <CardDescription className="text-sm pt-1 text-center">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="mb-6 text-center">
            {displayPrice === 0 ? (
              <>
                {/* Pay As You Grow pricing display — no monthly fee */}
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold">$0.20</span>
                  <span className="text-muted-foreground text-sm">/crédito</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">Sin suscripción mensual</div>
                {/* Highlight the welcome credits for Primo Chambeador */}
                {isPrimoChambeador && (
                  <div className="mt-2 text-sm font-semibold text-cyan-400">
                    🎁 20 AI credits incluidos para empezar
                  </div>
                )}
              </>
            ) : isYearly ? (
              <>
                {/* Annual: show total annual price prominently */}
                <span className="text-3xl font-bold">{formatPrice(displayPrice)}</span>
                <span className="text-muted-foreground ml-1">{period}</span>
                {/* Monthly equivalent in small text */}
                {monthlyEquivalent !== null && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    ≈ {formatPrice(monthlyEquivalent)}/mes · pago único anual
                  </div>
                )}
              </>
            ) : (
              <>
                <span className="text-3xl font-bold">{formatPrice(displayPrice)}</span>
                <span className="text-muted-foreground ml-1">{period}</span>
              </>
            )}
          </div>

          <div className="mb-6 text-center relative">
            <div className="relative p-4 mx-2">
              {/* Futuristic arrow-style border */}
              <div className="absolute inset-0">
                {/* Top arrow */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-cyan-400"></div>

                {/* Bottom arrow */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-cyan-400"></div>

                {/* Side lines with gradient */}
                <div className="absolute left-0 top-4 bottom-4 w-[2px] bg-gradient-to-b from-cyan-400 via-blue-500 to-cyan-400"></div>
                <div className="absolute right-0 top-4 bottom-4 w-[2px] bg-gradient-to-b from-cyan-400 via-blue-500 to-cyan-400"></div>

                {/* Corner tech details */}
                <div className="absolute top-2 left-2 w-3 h-[2px] bg-cyan-400"></div>
                <div className="absolute top-2 left-2 w-[2px] h-3 bg-cyan-400"></div>
                <div className="absolute top-2 right-2 w-3 h-[2px] bg-cyan-400"></div>
                <div className="absolute top-2 right-2 w-[2px] h-3 bg-cyan-400"></div>
                <div className="absolute bottom-2 left-2 w-3 h-[2px] bg-cyan-400"></div>
                <div className="absolute bottom-2 left-2 w-[2px] h-3 bg-cyan-400"></div>
                <div className="absolute bottom-2 right-2 w-3 h-[2px] bg-cyan-400"></div>
                <div className="absolute bottom-2 right-2 w-[2px] h-3 bg-cyan-400"></div>
              </div>

              {/* Clear, readable neon text */}
              <div className="relative z-10 text-base font-bold italic text-cyan-300 leading-relaxed py-3 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">
                "{motto}"
              </div>
            </div>
          </div>

          <ul className="space-y-2">
            {features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </div>
      <CardFooter>
        <div className="w-full">
          {actionType === 'current' ? (
            <>
              <Button
                className="w-full mb-2"
                variant="default"
                disabled
              >
                ✓ PLAN ACTUAL
              </Button>
              {onManageSubscription && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={onManageSubscription}
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? "Procesando..." : "🔧 Gestionar"}
                </Button>
              )}
              {expirationDate && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  Válido hasta: {expirationDate.toLocaleDateString()}
                </p>
              )}
            </>
          ) : actionType === 'upgrade' ? (
            <Button
              className="w-full"
              variant={isMostPopular ? "default" : "outline"}
              onClick={() => onSelectPlan(planId)}
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : getUpgradeLabel()}
            </Button>
          ) : actionType === 'downgrade' ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                if (window.confirm(`¿Estás seguro de que quieres cambiar a ${name}? Perderás algunas funciones.`)) {
                  onSelectPlan(planId);
                }
              }}
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : "⬇️ DOWNGRADE"}
            </Button>
          ) : (
            <Button
              className="w-full"
              variant={isMostPopular ? "default" : "outline"}
              onClick={() => onSelectPlan(planId)}
              disabled={isLoading}
            >
              {isLoading ? "Procesando..." : getUpgradeLabel()}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

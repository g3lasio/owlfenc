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
}: PricingCardProps) {
  const currentPrice = isYearly ? yearlyPrice / 100 : price / 100;
  const period = isYearly ? "/año" : "/mes";

  // Determinar el ícono según el código del plan
  const renderPlanIcon = () => {
    switch (code) {
      case 'primo_chambeador':
        return <Hammer className="h-6 w-6 text-orange-500" />;
      case 'mero_patron':
        return <Crown className="h-6 w-6 text-primary" />;
      case 'chingon_mayor':
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
          <CardDescription className="text-sm pt-1 text-center">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="mb-6 text-center">
            <span className="text-3xl font-bold">${currentPrice}</span>
            <span className="text-muted-foreground ml-1">{period}</span>
          </div>
          
          <div className="mb-6 text-center relative">
            <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 border-2 border-transparent bg-clip-padding">
              {/* Transformers-style geometric border */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-lg"></div>
              <div className="absolute inset-[2px] bg-slate-900 rounded-lg"></div>
              
              {/* Corner accents like Transformers */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
              
              {/* Glowing neon text */}
              <div className="relative z-10 text-sm font-bold tracking-wide uppercase text-transparent bg-gradient-to-r from-cyan-300 via-green-400 to-cyan-300 bg-clip-text leading-relaxed py-2">
                <div className="drop-shadow-[0_0_10px_rgba(34,211,238,0.7)] animate-pulse">
                  "{motto}"
                </div>
              </div>
              
              {/* Animated glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-green-400/20 to-cyan-400/20 rounded-lg blur-sm animate-pulse"></div>
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
        <Button 
          className="w-full" 
          variant={isMostPopular ? "default" : "outline"}
          onClick={() => onSelectPlan(planId)}
          disabled={isLoading}
        >
          {isLoading ? "Procesando..." : "Seleccionar Plan"}
        </Button>
      </CardFooter>
    </Card>
  );
}
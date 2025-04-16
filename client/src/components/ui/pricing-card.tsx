import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
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
}: PricingCardProps) {
  const currentPrice = isYearly ? yearlyPrice / 100 : price / 100;
  const period = isYearly ? "/año" : "/mes";

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
        <CardHeader className="pb-2">
          <CardTitle className="text-xl">{name}</CardTitle>
          <CardDescription className="text-sm pt-1">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="mb-6">
            <span className="text-3xl font-bold">${currentPrice}</span>
            <span className="text-muted-foreground ml-1">{period}</span>
          </div>
          
          <div className="text-sm italic text-muted-foreground mb-6">
            "{motto}"
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
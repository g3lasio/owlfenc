import * as React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PricingToggleProps {
  onToggle: (value: boolean) => void;
  isYearly: boolean;
  className?: string;
}

export function PricingToggle({ onToggle, isYearly, className }: PricingToggleProps) {
  return (
    <div className={cn("flex items-center justify-center gap-4", className)}>
      <Label
        htmlFor="billing-toggle"
        className={cn(
          "text-sm font-medium transition-colors",
          !isYearly ? "text-primary" : "text-muted-foreground"
        )}
      >
        Mensual
      </Label>
      <Switch
        id="billing-toggle"
        checked={isYearly}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-primary"
      />
      <div className="flex items-center gap-2">
        <Label
          htmlFor="billing-toggle"
          className={cn(
            "text-sm font-medium transition-colors",
            isYearly ? "text-primary" : "text-muted-foreground"
          )}
        >
          Anual
        </Label>
        <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          Ahorra 20%
        </span>
      </div>
    </div>
  );
}
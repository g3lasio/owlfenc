/**
 * AUTOMATIC UPGRADE CTA SYSTEM
 * Intelligent upgrade prompts that appear based on usage patterns and triggers
 * Integrates with trial countdown and usage limits
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Crown, 
  Zap, 
  ArrowUp, 
  X, 
  Star,
  Sparkles,
  TrendingUp,
  Lock,
  CheckCircle,
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface UpgradeTrigger {
  type: 'limit_reached' | 'trial_expiring' | 'usage_pattern' | 'feature_locked' | 'manual';
  feature?: string;
  daysRemaining?: number;
  usagePercent?: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  title: string;
}

export interface AutoUpgradeCTAProps {
  triggers: UpgradeTrigger[];
  currentPlan: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'modal' | 'inline' | 'floating' | 'banner';
  maxShowsPerDay?: number;
  respectDismissals?: boolean;
}

export function AutoUpgradeCTA({
  triggers,
  currentPlan,
  onUpgrade,
  onDismiss,
  className,
  variant = 'inline',
  maxShowsPerDay = 3,
  respectDismissals = true
}: AutoUpgradeCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showCount, setShowCount] = useState(0);
  const [dismissedTriggers, setDismissedTriggers] = useState<Set<string>>(new Set());
  const [selectedTrigger, setSelectedTrigger] = useState<UpgradeTrigger | null>(null);

  // Filter triggers based on priority and dismissals
  const activeTriggers = triggers.filter(trigger => {
    const triggerKey = `${trigger.type}_${trigger.feature || 'general'}`;
    
    if (respectDismissals && dismissedTriggers.has(triggerKey)) {
      return false;
    }
    
    return true;
  }).sort((a, b) => {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  // Auto-show logic
  useEffect(() => {
    if (activeTriggers.length === 0 || showCount >= maxShowsPerDay) {
      return;
    }

    // Get highest priority trigger
    const highestPriorityTrigger = activeTriggers[0];
    
    // Show immediately for critical triggers
    if (highestPriorityTrigger.priority === 'critical') {
      setSelectedTrigger(highestPriorityTrigger);
      setIsVisible(true);
      setShowCount(prev => prev + 1);
      return;
    }

    // Delayed showing for lower priority triggers
    const showDelay = {
      high: 2000,     // 2 seconds
      medium: 5000,   // 5 seconds
      low: 10000      // 10 seconds
    };

    const timeout = setTimeout(() => {
      setSelectedTrigger(highestPriorityTrigger);
      setIsVisible(true);
      setShowCount(prev => prev + 1);
    }, showDelay[highestPriorityTrigger.priority] || 5000);

    return () => clearTimeout(timeout);
  }, [activeTriggers, showCount, maxShowsPerDay]);

  const handleDismiss = () => {
    if (selectedTrigger) {
      const triggerKey = `${selectedTrigger.type}_${selectedTrigger.feature || 'general'}`;
      setDismissedTriggers(prev => new Set([...prev, triggerKey]));
    }
    
    setIsVisible(false);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    setIsVisible(false);
    onUpgrade?.();
  };

  const getPlanBenefits = () => {
    const benefits = {
      mero: [
        "50 Basic Estimates (10x more)",
        "25 AI Estimates (12x more)", 
        "Unlimited Projects",
        "Priority Support",
        "Advanced Analytics"
      ],
      supreme: [
        "Unlimited Everything",
        "50 AI Estimates",
        "White-label Options",
        "API Access",
        "Custom Integrations",
        "Dedicated Support"
      ]
    };
    
    return currentPlan === 'primo' ? benefits.mero : benefits.supreme;
  };

  const getPricing = () => {
    return currentPlan === 'primo' 
      ? { plan: "Mero", price: "$29", period: "month" }
      : { plan: "Supreme", price: "$79", period: "month" };
  };

  const getUrgencyStyles = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-red-600',
          text: 'text-white',
          badge: 'bg-red-100 text-red-800',
          button: 'bg-white text-red-600 hover:bg-red-50'
        };
      case 'high':
        return {
          bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
          text: 'text-white',
          badge: 'bg-orange-100 text-orange-800',
          button: 'bg-white text-orange-600 hover:bg-orange-50'
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-purple-600',
          text: 'text-white',
          badge: 'bg-blue-100 text-blue-800',
          button: 'bg-white text-blue-600 hover:bg-blue-50'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-green-500 to-green-600',
          text: 'text-white',
          badge: 'bg-green-100 text-green-800',
          button: 'bg-white text-green-600 hover:bg-green-50'
        };
    }
  };

  if (!isVisible || !selectedTrigger) return null;

  const pricing = getPricing();
  const benefits = getPlanBenefits();
  const styles = getUrgencyStyles(selectedTrigger.priority);

  // Modal variant
  if (variant === 'modal') {
    return (
      <Dialog open={isVisible} onOpenChange={(open) => !open && handleDismiss()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-purple-600" />
              {selectedTrigger.title}
            </DialogTitle>
            <DialogDescription>
              {selectedTrigger.message}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Pricing */}
            <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {pricing.price}
                <span className="text-sm font-normal text-gray-600">/{pricing.period}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Upgrade to {pricing.plan} plan
              </p>
            </div>
            
            {/* Benefits */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">What you'll get:</h4>
              <div className="space-y-1">
                {benefits.slice(0, 3).map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button onClick={handleUpgrade} className="flex-1">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
              <Button variant="outline" onClick={handleDismiss}>
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Floating variant
  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed bottom-4 right-4 z-50 max-w-xs",
        selectedTrigger.priority === 'critical' && "animate-pulse",
        className
      )}>
        <Card className="shadow-lg border-2 border-purple-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-600" />
                {selectedTrigger.title}
              </CardTitle>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              {selectedTrigger.message}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleUpgrade} className="flex-1">
                <ArrowUp className="h-3 w-3 mr-1" />
                Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Banner variant
  if (variant === 'banner') {
    return (
      <div className={cn("w-full border-b", className)}>
        <div className={cn("px-4 py-3", styles.bg, styles.text)}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-4">
              <Crown className="h-5 w-5" />
              <div>
                <span className="font-semibold">{selectedTrigger.title}</span>
                <span className="ml-2 opacity-90">{selectedTrigger.message}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className={styles.badge}>
                {pricing.price}/{pricing.period}
              </Badge>
              <Button size="sm" onClick={handleUpgrade} className={styles.button}>
                <Crown className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <Alert className={cn("border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50", className)}>
      <Crown className="h-4 w-4 text-purple-600" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-semibold text-purple-900">{selectedTrigger.title}</p>
            <p className="text-sm text-purple-700 mt-1">{selectedTrigger.message}</p>
            
            {/* Quick benefits preview */}
            <div className="flex items-center gap-4 mt-2 text-xs text-purple-600">
              {benefits.slice(0, 2).map((benefit, index) => (
                <div key={index} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <div className="text-right">
              <div className="text-lg font-bold text-purple-600">
                {pricing.price}
                <span className="text-xs font-normal">/{pricing.period}</span>
              </div>
              <div className="text-xs text-purple-600">{pricing.plan} plan</div>
            </div>
            <Button onClick={handleUpgrade} size="sm">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleDismiss}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Hook for generating upgrade triggers automatically
export function useUpgradeTriggers(usageData?: any, trialData?: any): UpgradeTrigger[] {
  const [triggers, setTriggers] = useState<UpgradeTrigger[]>([]);

  useEffect(() => {
    const newTriggers: UpgradeTrigger[] = [];

    // Trial expiring triggers
    if (trialData?.isTrialing && trialData.daysRemaining <= 3) {
      newTriggers.push({
        type: 'trial_expiring',
        daysRemaining: trialData.daysRemaining,
        priority: trialData.daysRemaining <= 1 ? 'critical' : 'high',
        title: trialData.daysRemaining <= 1 ? "Trial Expires Today!" : `Trial Expires in ${trialData.daysRemaining} Days`,
        message: "Upgrade now to keep your progress and unlock unlimited access to all features."
      });
    }

    // Limit reached triggers
    if (usageData?.used && usageData?.limits) {
      Object.entries(usageData.used).forEach(([feature, used]) => {
        const limit = usageData.limits[feature];
        if (limit && (used as number) >= limit) {
          newTriggers.push({
            type: 'limit_reached',
            feature,
            priority: 'high',
            title: `${feature} Limit Reached`,
            message: `You've used all ${limit} ${feature}. Upgrade for higher limits.`
          });
        }
      });
    }

    // Usage pattern triggers (80% usage)
    if (usageData?.used && usageData?.limits) {
      Object.entries(usageData.used).forEach(([feature, used]) => {
        const limit = usageData.limits[feature];
        if (limit && (used as number) / limit >= 0.8 && (used as number) < limit) {
          newTriggers.push({
            type: 'usage_pattern',
            feature,
            usagePercent: Math.round(((used as number) / limit) * 100),
            priority: 'medium',
            title: `${feature} Almost Full`,
            message: `You're at ${Math.round(((used as number) / limit) * 100)}% of your ${feature} limit. Consider upgrading.`
          });
        }
      });
    }

    setTriggers(newTriggers);
  }, [usageData, trialData]);

  return triggers;
}
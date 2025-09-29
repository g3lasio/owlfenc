/**
 * TRIAL COUNTDOWN BANNER
 * Persistent trial countdown with automatic upgrade CTAs
 * Shows prominently across the application when trial is active
 */

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Clock, 
  Crown, 
  ArrowUp, 
  X, 
  Zap,
  AlertTriangle,
  Gift,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrialCountdownBannerProps {
  daysRemaining: number;
  totalTrialDays?: number;
  planName?: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  className?: string;
  variant?: 'banner' | 'card' | 'inline';
  position?: 'top' | 'bottom' | 'floating';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export function TrialCountdownBanner({
  daysRemaining,
  totalTrialDays = 14,
  planName = "Free Trial",
  onUpgrade,
  onDismiss,
  className,
  variant = 'banner',
  position = 'top',
  urgencyLevel
}: TrialCountdownBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showPulse, setShowPulse] = useState(false);

  // Auto-calculate urgency if not provided
  const calculatedUrgency = urgencyLevel || (() => {
    if (daysRemaining <= 1) return 'critical';
    if (daysRemaining <= 3) return 'high';
    if (daysRemaining <= 7) return 'medium';
    return 'low';
  })();

  // Calculate progress percentage
  const progressPercent = ((totalTrialDays - daysRemaining) / totalTrialDays) * 100;

  // Add pulse effect for urgent states
  useEffect(() => {
    if (calculatedUrgency === 'critical') {
      const interval = setInterval(() => {
        setShowPulse(prev => !prev);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [calculatedUrgency]);

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  // Get styling based on urgency
  const getUrgencyStyles = () => {
    switch (calculatedUrgency) {
      case 'critical':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-red-600',
          text: 'text-white',
          badge: 'bg-red-100 text-red-800',
          button: 'bg-white text-red-600 hover:bg-red-50',
          border: 'border-red-200',
          icon: 'text-red-600'
        };
      case 'high':
        return {
          bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
          text: 'text-white',
          badge: 'bg-orange-100 text-orange-800',
          button: 'bg-white text-orange-600 hover:bg-orange-50',
          border: 'border-orange-200',
          icon: 'text-orange-600'
        };
      case 'medium':
        return {
          bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
          text: 'text-white',
          badge: 'bg-yellow-100 text-yellow-800',
          button: 'bg-white text-yellow-600 hover:bg-yellow-50',
          border: 'border-yellow-200',
          icon: 'text-yellow-600'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-purple-600',
          text: 'text-white',
          badge: 'bg-blue-100 text-blue-800',
          button: 'bg-white text-blue-600 hover:bg-blue-50',
          border: 'border-blue-200',
          icon: 'text-blue-600'
        };
    }
  };

  const styles = getUrgencyStyles();

  const getMessage = () => {
    if (daysRemaining <= 0) {
      return {
        title: "Trial Expired",
        subtitle: "Your trial has ended. Upgrade now to continue using premium features."
      };
    }
    
    if (daysRemaining === 1) {
      return {
        title: "Trial Expires Today!",
        subtitle: "Don't lose your progress. Upgrade now to keep all your data and unlock premium features."
      };
    }
    
    if (daysRemaining <= 3) {
      return {
        title: `Trial Expires in ${daysRemaining} Days`,
        subtitle: "Time is running out! Upgrade now to avoid losing access to premium features."
      };
    }
    
    if (daysRemaining <= 7) {
      return {
        title: `${daysRemaining} Days Left in Trial`,
        subtitle: "Make the most of your remaining trial days. Upgrade anytime to unlock unlimited access."
      };
    }
    
    return {
      title: `${daysRemaining} Days Left in Trial`,
      subtitle: "Enjoying your trial? Upgrade for unlimited access to all premium features."
    };
  };

  const message = getMessage();

  if (isDismissed) return null;

  // Floating variant
  if (variant === 'floating') {
    return (
      <div className={cn(
        "fixed z-50 max-w-sm mx-4",
        position === 'bottom' ? "bottom-4 right-4" : "top-4 right-4",
        showPulse && "animate-pulse",
        className
      )}>
        <Card className={cn("shadow-lg", styles.border)}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn("p-2 rounded-lg", styles.badge)}>
                <Clock className={cn("h-4 w-4", styles.icon)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{message.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{message.subtitle}</p>
                <div className="flex items-center gap-2 mt-3">
                  {onUpgrade && (
                    <Button size="sm" onClick={onUpgrade} className={styles.button}>
                      <Crown className="h-3 w-3 mr-1" />
                      Upgrade
                    </Button>
                  )}
                  {onDismiss && (
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleDismiss}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <Alert className={cn(styles.border, "bg-gradient-to-r", styles.bg, className)}>
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Clock className={cn("h-5 w-5", showPulse && "animate-pulse")} />
            <div>
              <p className="font-semibold">{message.title}</p>
              <p className="text-sm opacity-90">{message.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onUpgrade && (
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className={styles.button}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            )}
            {onDismiss && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Alert>
    );
  }

  // Card variant
  if (variant === 'card') {
    return (
      <Card className={cn("overflow-hidden", styles.border, className)}>
        <div className={cn("p-4", styles.bg, styles.text)}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className={cn(
                "p-2 rounded-lg bg-white/20 backdrop-blur-sm",
                showPulse && "animate-pulse"
              )}>
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{message.title}</h3>
                <p className="text-sm opacity-90 mt-1">{message.subtitle}</p>
                
                {/* Progress bar */}
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Trial Progress</span>
                    <span>{Math.round(progressPercent)}% used</span>
                  </div>
                  <Progress 
                    value={progressPercent} 
                    className="h-2 bg-white/20"
                    indicatorClassName="bg-white"
                  />
                </div>
              </div>
            </div>
            
            {onDismiss && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          {/* Action buttons */}
          <div className="flex items-center gap-3 mt-4">
            {onUpgrade && (
              <Button 
                onClick={onUpgrade}
                size="sm"
                className={styles.button}
              >
                <Crown className="h-4 w-4 mr-2" />
                {daysRemaining <= 1 ? "Upgrade Now" : "Upgrade Trial"}
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Gift className="h-4 w-4 mr-2" />
              View Benefits
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Banner variant (default)
  return (
    <div className={cn(
      "w-full",
      position === 'top' ? "border-b" : "border-t",
      styles.border,
      className
    )}>
      <div className={cn("px-4 py-3", styles.bg, styles.text)}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-2",
              showPulse && "animate-pulse"
            )}>
              <Clock className="h-5 w-5" />
              <Badge variant="secondary" className={styles.badge}>
                {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
              </Badge>
            </div>
            
            <div className="hidden sm:block">
              <span className="font-semibold mr-2">{message.title}</span>
              <span className="opacity-90">{message.subtitle}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {onUpgrade && (
              <Button 
                size="sm" 
                onClick={onUpgrade}
                className={styles.button}
              >
                <Crown className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Upgrade Now</span>
                <span className="sm:hidden">Upgrade</span>
              </Button>
            )}
            
            {onDismiss && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDismiss}
                className="text-white hover:bg-white/20 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
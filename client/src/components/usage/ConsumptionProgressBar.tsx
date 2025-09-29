/**
 * CONSUMPTION PROGRESS BAR
 * Visual progress bars showing feature usage vs limits
 * Integrated with upgrade CTAs and trial countdown
 */

import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Zap, 
  Crown, 
  ArrowUp, 
  CheckCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeatureLimit {
  feature: string;
  displayName: string;
  used: number;
  limit: number | null; // null means unlimited
  icon?: React.ReactNode;
  description?: string;
  upgradeFeature?: boolean; // Shows upgrade CTA
}

export interface ConsumptionProgressBarProps {
  limits: FeatureLimit[];
  planName: string;
  isTrialing?: boolean;
  trialDaysRemaining?: number;
  onUpgrade?: () => void;
  className?: string;
  showUpgradeCTA?: boolean;
  compact?: boolean;
}

export function ConsumptionProgressBar({
  limits,
  planName,
  isTrialing = false,
  trialDaysRemaining,
  onUpgrade,
  className,
  showUpgradeCTA = true,
  compact = false
}: ConsumptionProgressBarProps) {
  
  // Calculate overall consumption status
  const limitedFeatures = limits.filter(l => l.limit !== null);
  const nearLimitFeatures = limitedFeatures.filter(l => l.limit && (l.used / l.limit) >= 0.8);
  const atLimitFeatures = limitedFeatures.filter(l => l.limit && l.used >= l.limit);
  
  const overallUsagePercent = limitedFeatures.length > 0 
    ? Math.round((limitedFeatures.reduce((acc, l) => acc + (l.limit ? (l.used / l.limit) * 100 : 0), 0) / limitedFeatures.length))
    : 0;

  const getProgressColor = (used: number, limit: number | null) => {
    if (limit === null) return "bg-green-500";
    const percentage = (used / limit) * 100;
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 80) return "bg-orange-500";
    if (percentage >= 60) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getProgressVariant = (used: number, limit: number | null): "default" | "destructive" => {
    if (limit === null) return "default";
    const percentage = (used / limit) * 100;
    return percentage >= 90 ? "destructive" : "default";
  };

  const formatLimit = (limit: number | null) => {
    return limit === null ? "∞" : limit.toLocaleString();
  };

  const shouldShowUpgrade = showUpgradeCTA && (
    atLimitFeatures.length > 0 || 
    nearLimitFeatures.length >= 2 ||
    (isTrialing && trialDaysRemaining !== undefined && trialDaysRemaining <= 3)
  );

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {/* Compact overview */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-sm font-medium">Usage</span>
            <Badge variant="outline" className="text-xs">
              {planName}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {overallUsagePercent}% avg
          </span>
        </div>
        
        {atLimitFeatures.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-sm text-red-700">
              {atLimitFeatures.length} feature{atLimitFeatures.length > 1 ? 's' : ''} at limit
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Feature Usage
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-medium">
              {planName.charAt(0).toUpperCase() + planName.slice(1)}
            </Badge>
            {isTrialing && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Trial: {trialDaysRemaining}d left
              </Badge>
            )}
          </div>
        </div>
        
        {/* Overall status alert */}
        {atLimitFeatures.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>{atLimitFeatures.length} feature{atLimitFeatures.length > 1 ? 's' : ''} at limit.</strong>
              {shouldShowUpgrade && " Consider upgrading for higher limits."}
            </AlertDescription>
          </Alert>
        )}
        
        {nearLimitFeatures.length > 0 && atLimitFeatures.length === 0 && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-700">
              <strong>{nearLimitFeatures.length} feature{nearLimitFeatures.length > 1 ? 's' : ''} near limit.</strong>
              Plan ahead to avoid interruptions.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Feature progress bars */}
        <div className="space-y-3">
          {limits.map((limit) => {
            const percentage = limit.limit ? Math.min((limit.used / limit.limit) * 100, 100) : 0;
            const isAtLimit = limit.limit && limit.used >= limit.limit;
            const isNearLimit = limit.limit && (limit.used / limit.limit) >= 0.8;
            
            return (
              <div key={limit.feature} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {limit.icon && <span className="text-sm">{limit.icon}</span>}
                    <span className="text-sm font-medium">{limit.displayName}</span>
                    {isAtLimit && (
                      <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                        Limit reached
                      </Badge>
                    )}
                    {isNearLimit && !isAtLimit && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        Near limit
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {limit.used.toLocaleString()} / {formatLimit(limit.limit)}
                    </span>
                    {limit.limit === null && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                </div>
                
                {limit.limit !== null && (
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "h-2",
                      isAtLimit && "bg-red-100",
                      isNearLimit && !isAtLimit && "bg-orange-100"
                    )}
                    indicatorClassName={getProgressColor(limit.used, limit.limit)}
                  />
                )}
                
                {limit.limit === null && (
                  <div className="h-2 bg-green-100 rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-green-400 rounded-full animate-pulse" />
                  </div>
                )}
                
                {limit.description && (
                  <p className="text-xs text-muted-foreground">{limit.description}</p>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Upgrade CTA */}
        {shouldShowUpgrade && onUpgrade && (
          <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Crown className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-semibold text-gray-900">
                  {isTrialing ? "Upgrade Before Trial Ends" : "Unlock Higher Limits"}
                </h4>
                <p className="text-sm text-gray-600">
                  {isTrialing && trialDaysRemaining !== undefined && trialDaysRemaining <= 3
                    ? `Your trial expires in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}. Upgrade now to keep your progress.`
                    : atLimitFeatures.length > 0
                    ? `You've reached your limit on ${atLimitFeatures.length} feature${atLimitFeatures.length > 1 ? 's' : ''}. Upgrade for unlimited access.`
                    : "Get higher limits and premium features with an upgraded plan."
                  }
                </p>
                <Button 
                  onClick={onUpgrade}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  size="sm"
                >
                  <ArrowUp className="h-4 w-4 mr-2" />
                  {isTrialing ? "Upgrade Trial" : "Upgrade Plan"}
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Plan comparison hint */}
        {planName === 'primo' && !isTrialing && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-gray-700">
                Need more? Upgrade to Mero or Supreme
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Get 10x more limits and premium features
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
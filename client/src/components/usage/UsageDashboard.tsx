/**
 * USAGE DASHBOARD
 * Comprehensive usage overview with progress bars, trial status, and upgrade CTAs
 * Integrates with consumption progress bars and trial countdown
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsumptionProgressBar, type FeatureLimit } from "./ConsumptionProgressBar";
import { 
  BarChart3, 
  Clock, 
  Crown, 
  TrendingUp, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

export interface UsageDashboardProps {
  className?: string;
  showDetailedView?: boolean;
  onUpgrade?: () => void;
  onViewPlans?: () => void;
}

interface UsageData {
  planName: string;
  planId: number;
  trial?: {
    isTrialing: boolean;
    daysRemaining: number;
    status: string;
  };
  limits: Record<string, number>;
  used: Record<string, number>;
  lastUpdated: string;
}

export function UsageDashboard({
  className,
  showDetailedView = false,
  onUpgrade,
  onViewPlans
}: UsageDashboardProps) {
  const [currentPeriod, setCurrentPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  
  // Fetch usage data
  const { data: usageData, isLoading, error } = useQuery<UsageData>({
    queryKey: ['usage-dashboard', currentPeriod],
    queryFn: async () => {
      // This would be replaced with actual API call
      // For now, returning mock data
      return {
        planName: 'primo',
        planId: 1,
        trial: {
          isTrialing: true,
          daysRemaining: 3,
          status: 'active'
        },
        limits: {
          basicEstimates: 5,
          aiEstimates: 2,
          contracts: 2,
          propertyVerifications: 3,
          permitAdvisor: 3,
          projects: 5,
          invoices: 10,
          paymentTracking: 20,
          deepsearch: 5
        },
        used: {
          basicEstimates: 4,
          aiEstimates: 2,
          contracts: 1,
          propertyVerifications: 2,
          permitAdvisor: 1,
          projects: 3,
          invoices: 7,
          paymentTracking: 15,
          deepsearch: 4
        },
        lastUpdated: new Date().toISOString()
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000 // 30 seconds
  });

  // Convert usage data to feature limits format
  const featureLimits: FeatureLimit[] = usageData ? [
    {
      feature: 'basicEstimates',
      displayName: 'Basic Estimates',
      used: usageData.used.basicEstimates || 0,
      limit: usageData.limits.basicEstimates,
      icon: <BarChart3 className="h-4 w-4" />,
      description: 'Standard property estimates'
    },
    {
      feature: 'aiEstimates',
      displayName: 'AI Estimates',
      used: usageData.used.aiEstimates || 0,
      limit: usageData.limits.aiEstimates,
      icon: <Zap className="h-4 w-4" />,
      description: 'AI-powered smart estimates',
      upgradeFeature: true
    },
    {
      feature: 'contracts',
      displayName: 'Contracts',
      used: usageData.used.contracts || 0,
      limit: usageData.limits.contracts,
      icon: <Target className="h-4 w-4" />,
      description: 'Legal contract generation'
    },
    {
      feature: 'propertyVerifications',
      displayName: 'Property Verifications',
      used: usageData.used.propertyVerifications || 0,
      limit: usageData.limits.propertyVerifications,
      icon: <CheckCircle className="h-4 w-4" />,
      description: 'Property verification reports'
    },
    {
      feature: 'projects',
      displayName: 'Projects',
      used: usageData.used.projects || 0,
      limit: usageData.limits.projects,
      icon: <Calendar className="h-4 w-4" />,
      description: 'Active project management'
    }
  ] : [];

  const isTrialing = usageData?.trial?.isTrialing || false;
  const trialDaysRemaining = usageData?.trial?.daysRemaining || 0;
  const planName = usageData?.planName || 'primo';

  // Calculate usage statistics
  const limitedFeatures = featureLimits.filter(f => f.limit !== null);
  const atLimitCount = limitedFeatures.filter(f => f.limit && f.used >= f.limit).length;
  const nearLimitCount = limitedFeatures.filter(f => f.limit && f.used / f.limit >= 0.8 && f.used < f.limit).length;
  const totalUsagePercent = limitedFeatures.length > 0 
    ? Math.round(limitedFeatures.reduce((acc, f) => acc + (f.limit ? (f.used / f.limit) * 100 : 0), 0) / limitedFeatures.length)
    : 0;

  if (isLoading) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-700">
          Failed to load usage data. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Usage Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Usage */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Overall Usage</p>
                  <p className="text-2xl font-bold">{totalUsagePercent}%</p>
                </div>
              </div>
              <Badge variant="outline">{planName}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Features at Limit */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-lg",
                  atLimitCount > 0 ? "bg-red-100" : "bg-green-100"
                )}>
                  <AlertTriangle className={cn(
                    "h-4 w-4",
                    atLimitCount > 0 ? "text-red-600" : "text-green-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium">At Limit</p>
                  <p className="text-2xl font-bold">{atLimitCount}</p>
                </div>
              </div>
              {atLimitCount > 0 && (
                <Badge variant="destructive">Action needed</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trial Status */}
        {isTrialing && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-2 rounded-lg",
                    trialDaysRemaining <= 3 ? "bg-orange-100" : "bg-blue-100"
                  )}>
                    <Clock className={cn(
                      "h-4 w-4",
                      trialDaysRemaining <= 3 ? "text-orange-600" : "text-blue-600"
                    )} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Trial Days Left</p>
                    <p className="text-2xl font-bold">{trialDaysRemaining}</p>
                  </div>
                </div>
                {trialDaysRemaining <= 3 && (
                  <Badge variant="secondary">Expiring soon</Badge>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Critical Alerts */}
      {(atLimitCount > 0 || (isTrialing && trialDaysRemaining <= 3)) && (
        <Alert className={cn(
          "border-orange-200 bg-orange-50",
          atLimitCount > 0 && "border-red-200 bg-red-50"
        )}>
          <AlertTriangle className={cn(
            "h-4 w-4",
            atLimitCount > 0 ? "text-red-600" : "text-orange-600"
          )} />
          <AlertDescription className={cn(
            atLimitCount > 0 ? "text-red-700" : "text-orange-700"
          )}>
            <div className="flex items-center justify-between">
              <div>
                {atLimitCount > 0 && (
                  <p><strong>You've reached your limit on {atLimitCount} feature{atLimitCount > 1 ? 's' : ''}.</strong></p>
                )}
                {isTrialing && trialDaysRemaining <= 3 && (
                  <p><strong>Your trial expires in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}.</strong></p>
                )}
                <p className="text-sm mt-1">
                  {atLimitCount > 0 
                    ? "Upgrade now to continue using all features without interruption."
                    : "Upgrade now to keep your progress and unlock premium features."
                  }
                </p>
              </div>
              {onUpgrade && (
                <Button 
                  onClick={onUpgrade}
                  size="sm"
                  className="ml-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade Now
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Usage Progress */}
      <ConsumptionProgressBar
        limits={featureLimits}
        planName={planName}
        isTrialing={isTrialing}
        trialDaysRemaining={trialDaysRemaining}
        onUpgrade={onUpgrade}
        showUpgradeCTA={true}
        compact={false}
      />

      {/* Additional Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onViewPlans && (
          <Button 
            variant="outline" 
            onClick={onViewPlans}
            className="flex-1"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Compare Plans
          </Button>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="flex-1"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh Usage
        </Button>
      </div>

      {/* Usage Tips */}
      {showDetailedView && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Usage Tips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>• <strong>Near your limits?</strong> Consider upgrading to avoid interruptions in your workflow.</p>
              <p>• <strong>Free plan user?</strong> AI Estimates and premium features are available with paid plans.</p>
              <p>• <strong>Need more projects?</strong> Mero and Supreme plans offer unlimited project management.</p>
              {isTrialing && (
                <p>• <strong>Trial ending soon?</strong> Upgrade before {trialDaysRemaining} days to keep your data and progress.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
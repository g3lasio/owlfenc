import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Building2,
  ExternalLink,
  BarChart3,
  Zap,
  Link as LinkIcon,
  RefreshCw,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type StripeAccountStatus = {
  hasStripeAccount: boolean;
  accountDetails?: {
    id: string;
    email?: string;
    businessType?: string;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    defaultCurrency?: string;
    country?: string;
  } | null;
  isActive?: boolean;
  needsOnboarding?: boolean;
  needsDashboardLink?: boolean;
  requirements?: {
    currently_due?: string[];
    past_due?: string[];
    eventually_due?: string[];
    errors?: Array<{
      code: string;
      reason: string;
      requirement: string;
    }>;
    disabled_reason?: string | null;
  };
  error?: string;
  lastUpdated?: string;
};

interface PaymentSettingsProps {
  stripeAccountStatus?: StripeAccountStatus;
  onConnectStripe: () => void;
  onRefreshStatus?: () => Promise<StripeAccountStatus | undefined>;
}

export default function PaymentSettings({
  stripeAccountStatus,
  onConnectStripe,
  onRefreshStatus,
}: PaymentSettingsProps) {
  const { toast } = useToast();
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshStatus = async () => {
    if (!onRefreshStatus) return;
    
    try {
      setIsRefreshing(true);
      
      const loadingToast = toast({
        title: "Verificando cuenta",
        description: "Actualizando estado de Stripe...",
        duration: Infinity,
      });
      
      // Call the parent refresh function and await the result
      const result = await onRefreshStatus();
      
      // Dismiss loading toast
      loadingToast.dismiss?.();
      
      // Show result based on standardized contract
      if (result?.hasStripeAccount) {
        const isFullyActive = result?.isActive;
        
        toast({
          title: isFullyActive ? "✅ Cuenta Activa" : "🔄 Configuración Pendiente",
          description: isFullyActive
            ? "Tu cuenta está lista para recibir pagos"
            : "Completa los pasos restantes en el dashboard de Stripe",
          variant: "default",
        });
      } else {
        toast({
          title: "⚠️ No Conectada",
          description: "Aún no has conectado una cuenta de Stripe",
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo verificar el estado de la cuenta",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRunDiagnostic = async () => {
    try {
      setIsRunningDiagnostic(true);
      const response = await apiRequest("GET", "/api/contractor-payments/stripe/diagnostic");
      
      if (!response.ok) {
        throw new Error("Failed to run diagnostic");
      }
      
      const data = await response.json();
      
      if (data.success) {
        const { diagnostic } = data;
        const connectStatus = diagnostic.connect.enabled ? "✅ ENABLED" : "❌ NOT ENABLED";
        const accountType = diagnostic.account?.email || "Unknown";
        
        toast({
          title: `Stripe Connect: ${connectStatus}`,
          description: (
            <div className="space-y-2 mt-2">
              <p><strong>Account:</strong> {accountType}</p>
              <p><strong>Environment:</strong> {diagnostic.stripe.keyType}</p>
              <p><strong>Key Prefix:</strong> {diagnostic.stripe.keyPrefix}</p>
              {diagnostic.connect.enabled ? (
                <p className="text-green-400">✓ Ready to accept payments</p>
              ) : (
                <p className="text-red-400">⚠ Activate Connect in Stripe Dashboard</p>
              )}
            </div>
          ),
          variant: diagnostic.connect.enabled ? "default" : "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Diagnostic Failed",
        description: error.message || "Could not verify Stripe configuration",
        variant: "destructive",
      });
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const handleViewDashboard = async () => {
    try {
      setIsLoadingDashboard(true);
      const response = await apiRequest("POST", "/api/contractor-payments/stripe/dashboard", {});
      
      if (!response.ok) {
        throw new Error("Failed to get dashboard link");
      }
      
      const data = await response.json();
      
      if (data.success && data.url) {
        // Open Stripe dashboard in new tab
        window.open(data.url, '_blank');
      } else {
        throw new Error(data.message || "Failed to get dashboard link");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to open Stripe dashboard",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDashboard(false);
    }
  };

  const getStripeStatusBadge = () => {
    if (!stripeAccountStatus?.hasStripeAccount) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Not Connected
        </Badge>
      );
    }
    if (stripeAccountStatus?.isActive) {
      return (
        <Badge variant="default" className="flex items-center gap-1 bg-green-600">
          <CheckCircle className="h-3 w-3" />
          Connected & Active
        </Badge>
      );
    }
    // Check for verification errors
    const hasErrors = (stripeAccountStatus?.requirements?.errors?.length || 0) > 0;
    if (hasErrors) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Verification Failed
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Setup Incomplete
      </Badge>
    );
  };

  const isAccountActive = stripeAccountStatus?.isActive || false;
  const needsSetup = stripeAccountStatus?.hasStripeAccount && 
                     stripeAccountStatus?.needsOnboarding;
  const hasRequirements = (stripeAccountStatus?.requirements?.currently_due?.length || 0) > 0 ||
                         (stripeAccountStatus?.requirements?.past_due?.length || 0) > 0;
  const hasVerificationErrors = (stripeAccountStatus?.requirements?.errors?.length || 0) > 0;
  const isVerificationRejected = hasVerificationErrors && !isAccountActive;

  return (
    <div className="space-y-6">
      {/* Header with Status Overview */}
      <div className="bg-gradient-to-r from-cyan-900/20 to-blue-900/20 border border-cyan-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Building2 className="h-6 w-6 text-cyan-400" />
              Payment Account Settings
            </h3>
            <p className="text-gray-300 text-sm">
              Set up your Stripe Connect account to receive payments from clients
            </p>
          </div>
          {getStripeStatusBadge()}
        </div>
      </div>

      {/* Verification Errors Alert - Show if Stripe rejected verification */}
      {stripeAccountStatus?.requirements?.errors && stripeAccountStatus.requirements.errors.length > 0 && (
        <Alert variant="destructive" className="bg-red-950/50 border-red-900">
          <XCircle className="h-5 w-5" />
          <AlertTitle className="text-red-200 font-bold">Stripe Account Verification Failed</AlertTitle>
          <AlertDescription className="text-red-300 space-y-3 mt-2">
            <p className="font-medium">
              Your Stripe account needs attention. The following issues must be resolved:
            </p>
            <ul className="list-disc list-inside space-y-2">
              {stripeAccountStatus.requirements.errors.map((error, index) => (
                <li key={index} className="text-sm">
                  <span className="font-semibold">{error.code.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                  <p className="ml-6 mt-1 text-red-200">{error.reason}</p>
                  <p className="ml-6 mt-1 text-xs text-red-400">Required field: {error.requirement}</p>
                </li>
              ))}
            </ul>
            {stripeAccountStatus.requirements.disabled_reason && (
              <div className="mt-4 p-3 bg-red-900/30 rounded border border-red-800">
                <p className="text-sm text-red-200">
                  <strong>Account Status:</strong> {stripeAccountStatus.requirements.disabled_reason.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              </div>
            )}
            <div className="mt-4 p-3 bg-red-900/30 rounded border border-red-800">
              <p className="text-sm text-red-200">
                <strong>Action Required:</strong> Please click "Complete Setup in Stripe Dashboard" below to fix these issues and activate your account.
              </p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stripe Connect Account Setup */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-cyan-400" />
            Stripe Connect Account
          </CardTitle>
          <CardDescription className="text-gray-400">
            {!stripeAccountStatus?.hasStripeAccount 
              ? "Create or connect your Stripe account to start accepting payments"
              : isVerificationRejected
              ? "Stripe rejected your verification - Fix the issues listed above to activate your account"
              : needsSetup
              ? "Complete your account setup to start receiving payments"
              : isAccountActive
              ? "Your account is active and ready to receive payments"
              : "Reconnect your account to continue receiving payments"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Status Card */}
          <div className="border border-gray-700 rounded-lg bg-gray-800/50 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  isAccountActive 
                    ? "bg-green-600/20" 
                    : isVerificationRejected
                    ? "bg-red-600/20"
                    : needsSetup 
                    ? "bg-yellow-600/20" 
                    : "bg-blue-600/20"
                }`}>
                  <CreditCard className={`h-8 w-8 ${
                    isAccountActive 
                      ? "text-green-400" 
                      : isVerificationRejected
                      ? "text-red-400"
                      : needsSetup 
                      ? "text-yellow-400" 
                      : "text-blue-400"
                  }`} />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">
                    {!stripeAccountStatus?.hasStripeAccount 
                      ? "No Account Connected"
                      : isAccountActive
                      ? "Account Active"
                      : isVerificationRejected
                      ? "Verification Rejected by Stripe"
                      : needsSetup
                      ? "Setup Incomplete"
                      : "Reconnection Required"
                    }
                  </h4>
                  <p className="text-sm text-gray-400 mb-2">
                    {!stripeAccountStatus?.hasStripeAccount 
                      ? "Click below to create a new Stripe account or connect an existing one"
                      : isAccountActive
                      ? "Your Stripe account is fully configured and accepting payments"
                      : isVerificationRejected
                      ? "Stripe rejected your verification. Fix the issues above in your Stripe dashboard to activate payments"
                      : needsSetup
                      ? "Complete the onboarding process to activate your account"
                      : "Verify your account information to resume receiving payments"
                    }
                  </p>
                  {stripeAccountStatus?.accountDetails && (
                    <div className="flex flex-wrap gap-3 mt-3">
                      <div className="text-xs">
                        <span className="text-gray-500">Account ID:</span>{" "}
                        <span className="text-gray-300 font-mono">{stripeAccountStatus.accountDetails.id}</span>
                      </div>
                      {stripeAccountStatus.accountDetails.country && (
                        <div className="text-xs">
                          <span className="text-gray-500">Country:</span>{" "}
                          <span className="text-gray-300">{stripeAccountStatus.accountDetails.country}</span>
                        </div>
                      )}
                      {stripeAccountStatus.accountDetails.defaultCurrency && (
                        <div className="text-xs">
                          <span className="text-gray-500">Currency:</span>{" "}
                          <span className="text-gray-300">{stripeAccountStatus.accountDetails.defaultCurrency.toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => {
                  console.log("💳 [STRIPE-CONNECT] Button clicked", {
                    hasAccount: stripeAccountStatus?.hasStripeAccount,
                    isActive: isAccountActive,
                    accountDetails: stripeAccountStatus?.accountDetails
                  });
                  onConnectStripe();
                }}
                className={`${
                  !stripeAccountStatus?.hasStripeAccount || needsSetup
                    ? "bg-cyan-500 hover:bg-cyan-600 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
                size="lg"
                data-testid="button-connect-stripe"
              >
                {!stripeAccountStatus?.hasStripeAccount ? (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Connect Stripe Account
                  </>
                ) : needsSetup ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Complete Setup
                  </>
                ) : isAccountActive ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Manage Account
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Reconnect
                  </>
                )}
              </Button>

              <Button
                onClick={handleRefreshStatus}
                variant="outline"
                size="lg"
                disabled={isRefreshing || !onRefreshStatus}
                className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/20"
                data-testid="button-refresh-status"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? "Verificando..." : "Verificar Conexión"}
              </Button>

              {isAccountActive && (
                <Button
                  onClick={handleViewDashboard}
                  variant="outline"
                  size="lg"
                  disabled={isLoadingDashboard}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {isLoadingDashboard ? "Loading..." : "View Stripe Dashboard"}
                </Button>
              )}
            </div>
          </div>

          {/* Features Grid - Compact */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-cyan-900/20 border border-cyan-800/30 rounded-lg px-4 py-2.5">
              <Shield className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">Secure Payments</span>
            </div>

            <div className="flex items-center gap-2 bg-green-900/20 border border-green-800/30 rounded-lg px-4 py-2.5">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-sm font-medium text-green-300">Direct Deposits</span>
            </div>

            <div className="flex items-center gap-2 bg-blue-900/20 border border-blue-800/30 rounded-lg px-4 py-2.5">
              <LinkIcon className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium text-blue-300">Payment Links</span>
            </div>

            <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-800/30 rounded-lg px-4 py-2.5">
              <CreditCard className="h-4 w-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">All Payment Methods</span>
            </div>
          </div>

          {/* Setup Steps (only show if not connected) */}
          {!isAccountActive && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
              <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Setup Process
              </h5>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    stripeAccountStatus?.hasStripeAccount ? "bg-green-600 text-white" : "bg-gray-600 text-gray-300"
                  }`}>
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Connect Account</p>
                    <p className="text-xs text-gray-400">Create or link your Stripe account</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    needsSetup ? "bg-yellow-600 text-white" : stripeAccountStatus?.hasStripeAccount ? "bg-gray-600 text-gray-300" : "bg-gray-700 text-gray-400"
                  }`}>
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Complete Information</p>
                    <p className="text-xs text-gray-400">Provide business details and verify identity</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isAccountActive ? "bg-green-600 text-white" : "bg-gray-700 text-gray-400"
                  }`}>
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Link Bank Account</p>
                    <p className="text-xs text-gray-400">Add your bank account to receive payments</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
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
import {
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Building2,
  ExternalLink,
  DollarSign,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface PaymentSettingsProps {
  stripeAccountStatus?: {
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
  };
  onConnectStripe: () => void;
}

export default function PaymentSettings({
  stripeAccountStatus,
  onConnectStripe,
}: PaymentSettingsProps) {
  const { toast } = useToast();
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);

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
    if (!stripeAccountStatus.accountDetails?.chargesEnabled) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Setup Required
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Connected & Active
      </Badge>
    );
  };

  const isAccountActive = stripeAccountStatus?.hasStripeAccount && 
                          stripeAccountStatus?.accountDetails?.chargesEnabled &&
                          stripeAccountStatus?.accountDetails?.payoutsEnabled;
  
  const needsSetup = stripeAccountStatus?.hasStripeAccount && 
                     !stripeAccountStatus?.accountDetails?.chargesEnabled;

  return (
    <div className="space-y-6">
      {/* Primary Bank Account Connection - ONLY Essential Functionality */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Account Connection
          </CardTitle>
          <CardDescription className="text-gray-400">
            Connect your bank account to receive payments directly from clients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-6 border border-gray-700 rounded-lg bg-gray-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-600/20 rounded-lg">
                <CreditCard className="h-8 w-8 text-blue-400" />
              </div>
              <div>
                <h4 className="font-medium text-white mb-1">Stripe Connect Account</h4>
                <p className="text-sm text-gray-400">
                  Process payments and receive funds instantly to your bank account
                </p>
                {stripeAccountStatus?.accountDetails && (
                  <p className="text-xs text-gray-500 mt-1">
                    Account ID: {stripeAccountStatus.accountDetails.id}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              {getStripeStatusBadge()}
              <div className="flex gap-2">
                {isAccountActive && (
                  <Button
                    onClick={handleViewDashboard}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={isLoadingDashboard}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {isLoadingDashboard ? "Loading..." : "View Dashboard"}
                  </Button>
                )}
                <Button
                  onClick={() => {
                    console.log("💳 [STRIPE-CONNECT] Button clicked", {
                      hasAccount: stripeAccountStatus?.hasStripeAccount,
                      isActive: isAccountActive,
                      accountDetails: stripeAccountStatus?.accountDetails
                    });
                    onConnectStripe();
                  }}
                  className="bg-cyan-400 text-black hover:bg-cyan-300"
                  disabled={false}
                  data-testid="button-connect-stripe"
                >
                  {!stripeAccountStatus?.hasStripeAccount 
                    ? "Connect Bank Account"
                    : needsSetup
                    ? "Complete Setup"
                    : isAccountActive
                    ? "Manage Account"
                    : "Reconnect"
                  }
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>

          {/* Essential Features Only */}
          <div className="bg-cyan-900/20 border border-cyan-700 p-4 rounded-lg">
            <h5 className="font-medium text-cyan-400 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              What You Get
            </h5>
            <ul className="text-sm text-cyan-300 space-y-1">
              <li>• Payments go directly to your bank account</li>
              <li>• Support for all major credit cards and Apple Pay</li>
              <li>• Automatic tax reporting</li>
              <li>• Fraud protection</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Payment Revenue Summary - Essential Metrics Only */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue Overview
          </CardTitle>
          <CardDescription className="text-gray-400">
            Track your payment performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <DollarSign className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">$0</p>
              <p className="text-sm text-gray-400">Total Revenue</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm text-gray-400">Paid Invoices</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 rounded-lg">
              <Clock className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm text-gray-400">Pending Payments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  CreditCard, 
  Check, 
  X, 
  Star, 
  Crown, 
  Zap,
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface SubscriptionPlan {
  id: number;
  name: string;
  price: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  isPopular?: boolean;
  code: string;
}

interface UserSubscription {
  id: string;
  planId: number;
  status: string;
  currentPeriodEnd: string;
  billingCycle: string;
}

export default function SubscriptionTest() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch subscription plans
  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['/api/subscription/plans'],
    queryFn: () => apiRequest('GET', '/api/subscription/plans'),
  });

  // Fetch user subscription
  const { data: userSubscription, isLoading: subscriptionLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['/api/user/subscription'],
    queryFn: () => apiRequest('GET', '/api/user/subscription'),
  });

  // Create checkout session mutation
  const createCheckoutMutation = useMutation({
    mutationFn: (planData: { planId: number; billingCycle: 'monthly' | 'yearly' }) =>
      apiRequest('POST', '/api/subscription/create-checkout', planData),
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast({
          title: "Redirecting to checkout",
          description: "Opening Stripe checkout in a new tab...",
        });
        window.open(data.checkoutUrl, '_blank');
      }
      setIsProcessing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Checkout failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handleSubscribe = async (planId: number) => {
    setIsProcessing(true);
    setSelectedPlan(planId);
    
    try {
      await createCheckoutMutation.mutateAsync({
        planId,
        billingCycle,
      });
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };

  const formatPrice = (price: number) => {
    return price === 0 ? 'GRATIS' : `$${(price / 100).toFixed(2)}`;
  };

  const getPlanIcon = (planCode: string) => {
    switch (planCode) {
      case 'primo-chambeador':
        return <Star className="w-6 h-6 text-green-500" />;
      case 'mero-patron':
        return <Crown className="w-6 h-6 text-blue-500" />;
      case 'master-contractor':
        return <Zap className="w-6 h-6 text-purple-500" />;
      default:
        return <CreditCard className="w-6 h-6 text-gray-500" />;
    }
  };

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Subscription Testing</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Test Stripe subscription integration with test mode
          </p>
          
          {/* Test Mode Badge */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
              <AlertCircle className="w-4 h-4 mr-1" />
              TEST MODE - Using Test API Key
            </Badge>
          </div>

          {/* Current Subscription Status */}
          {userSubscription && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-500" />
                  Current Subscription
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Plan ID: {userSubscription.subscription?.planId || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {userSubscription.subscription?.status || 'Free'}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchSubscription()}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
            </Button>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans?.map((plan: SubscriptionPlan) => (
            <Card 
              key={plan.id} 
              className={`relative transition-all duration-200 hover:shadow-lg ${
                plan.isPopular ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-500 text-white">Popular</Badge>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  {getPlanIcon(plan.code)}
                </div>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="text-3xl font-bold">
                  {formatPrice(billingCycle === 'monthly' ? plan.price : plan.yearlyPrice)}
                  {plan.price > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{billingCycle === 'monthly' ? 'mes' : 'año'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Features */}
                <div className="space-y-2">
                  {plan.features?.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Subscribe Button */}
                <Button
                  className="w-full"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isProcessing && selectedPlan === plan.id}
                  variant={plan.price === 0 ? 'outline' : 'default'}
                >
                  {isProcessing && selectedPlan === plan.id ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {plan.price === 0 ? (
                        <>
                          <Check className="w-4 h-4" />
                          Select Free Plan
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          Subscribe Now
                        </>
                      )}
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Test Instructions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Test Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Test Card Numbers:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Success: 4242 4242 4242 4242</li>
                  <li>• Declined: 4000 0000 0000 0002</li>
                  <li>• Insufficient Funds: 4000 0000 0000 9995</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Test Details:</h4>
                <ul className="text-sm space-y-1">
                  <li>• Expiry: Any future date</li>
                  <li>• CVC: Any 3 digits</li>
                  <li>• ZIP: Any 5 digits</li>
                </ul>
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> This is running in test mode. No real charges will be made.
                The system is using your test API key for safe testing.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
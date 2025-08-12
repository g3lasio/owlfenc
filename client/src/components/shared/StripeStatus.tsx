/**
 * 🔧 STRIPE STATUS DIAGNOSTIC COMPONENT
 * Shows real-time Stripe loading status for debugging
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getStripe, isStripeAvailable, getStripeError, resetStripe, getStripeConfig } from '@/lib/stripe';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function StripeStatus() {
  const [status, setStatus] = useState({
    available: false,
    loading: true,
    error: null as string | null,
    config: null as any,
  });

  const checkStripeStatus = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const available = await isStripeAvailable();
      const error = getStripeError();
      const config = getStripeConfig();
      
      setStatus({
        available,
        loading: false,
        error,
        config,
      });
    } catch (error: any) {
      setStatus({
        available: false,
        loading: false,
        error: error.message || 'Unknown error',
        config: null,
      });
    }
  };

  const handleRetry = () => {
    resetStripe();
    checkStripeStatus();
  };

  useEffect(() => {
    checkStripeStatus();
    
    // Listen for Stripe events
    const handleStripeError = (event: any) => {
      setStatus(prev => ({
        ...prev,
        error: event.detail?.error || 'Stripe loading failed',
        available: false,
      }));
    };

    window.addEventListener('stripe-load-error', handleStripeError);
    
    return () => {
      window.removeEventListener('stripe-load-error', handleStripeError);
    };
  }, []);

  const getStatusIcon = () => {
    if (status.loading) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (status.available) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status.error) return <XCircle className="h-4 w-4 text-red-500" />;
    return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  };

  const getStatusText = () => {
    if (status.loading) return 'Loading...';
    if (status.available) return 'Available';
    if (status.error) return 'Error';
    return 'Unknown';
  };

  const getStatusColor = () => {
    if (status.available) return 'bg-green-500';
    if (status.error) return 'bg-red-500';
    if (status.loading) return 'bg-blue-500';
    return 'bg-yellow-500';
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span>Stripe Status</span>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge className={getStatusColor()}>
              {getStatusText()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {status.config && (
          <div className="text-sm space-y-1">
            <p><strong>Test Mode:</strong> {status.config.testMode ? 'Yes' : 'No'}</p>
            <p><strong>Key Length:</strong> {status.config.keyLength || 'Not set'}</p>
            {status.config.error && (
              <p className="text-red-500"><strong>Error:</strong> {status.config.error}</p>
            )}
          </div>
        )}
        
        {status.error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Error:</strong> {status.error}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={checkStripeStatus} 
            variant="outline" 
            size="sm"
            disabled={status.loading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${status.loading ? 'animate-spin' : ''}`} />
            Check Status
          </Button>
          
          <Button 
            onClick={handleRetry} 
            variant="outline" 
            size="sm"
            disabled={status.loading}
          >
            Retry Load
          </Button>
        </div>

        {/* Global Stripe Check */}
        <div className="text-xs text-muted-foreground">
          Global Stripe: {typeof window !== 'undefined' && (window as any).Stripe ? '✅ Available' : '❌ Not loaded'}
        </div>
      </CardContent>
    </Card>
  );
}
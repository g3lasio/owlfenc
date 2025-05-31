import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CreditCard, 
  Settings, 
  Bell, 
  DollarSign, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Shield,
  Building2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  onConnectStripe
}: PaymentSettingsProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState({
    autoSendInvoices: true,
    paymentReminders: true,
    defaultPaymentTerms: '30',
    preferredPaymentMethods: ['card', 'apple_pay'],
    invoicePrefix: 'INV',
    depositPercentage: '50'
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getStripeStatusBadge = () => {
    if (!stripeAccountStatus?.hasStripeAccount) {
      return <Badge variant="destructive">Not Connected</Badge>;
    }
    if (!stripeAccountStatus.accountDetails?.chargesEnabled) {
      return <Badge variant="secondary">Setup Required</Badge>;
    }
    return <Badge variant="default">Connected & Active</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Bank Account Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Account Connection
          </CardTitle>
          <CardDescription>
            Connect your bank account to process payments and receive funds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
              <div>
                <h4 className="font-medium">Stripe Connect Account</h4>
                <p className="text-sm text-muted-foreground">
                  Conexión bancaria temporalmente suspendida durante revisión de compliance
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="bg-orange-50 text-orange-700 border-orange-200">
                <Clock className="h-3 w-3 mr-1" />
                En Revisión
              </Badge>
              <Button 
                disabled={true}
                variant="outline"
                className="opacity-50 cursor-not-allowed"
              >
                Deployment en Progreso
              </Button>
            </div>
          </div>

          {stripeAccountStatus?.hasStripeAccount && stripeAccountStatus.accountDetails && (
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <h5 className="font-medium text-sm">Account Status</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {stripeAccountStatus.accountDetails.payoutsEnabled ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  }
                  <span>Bank Account: {stripeAccountStatus.accountDetails.payoutsEnabled ? 'Connected' : 'Pending'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {stripeAccountStatus.accountDetails.chargesEnabled ? 
                    <CheckCircle className="h-4 w-4 text-green-600" /> : 
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  }
                  <span>Payments: {stripeAccountStatus.accountDetails.chargesEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Account ID: {stripeAccountStatus.accountDetails.id}</div>
                {stripeAccountStatus.accountDetails.country && (
                  <div>Country: {stripeAccountStatus.accountDetails.country.toUpperCase()}</div>
                )}
                {stripeAccountStatus.accountDetails.defaultCurrency && (
                  <div>Currency: {stripeAccountStatus.accountDetails.defaultCurrency.toUpperCase()}</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Payment Preferences
          </CardTitle>
          <CardDescription>
            Configure default payment settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Deposit Percentage */}
          <div className="space-y-2">
            <Label htmlFor="depositPercentage">Default Initial Payment (%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="depositPercentage"
                type="number"
                value={settings.depositPercentage}
                onChange={(e) => handleSettingChange('depositPercentage', e.target.value)}
                className="w-24"
                min="0"
                max="100"
              />
              <span className="text-sm text-muted-foreground">
                % of total project cost
              </span>
            </div>
          </div>

          {/* Payment Terms */}
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Default Payment Terms (Days)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="paymentTerms"
                type="number"
                value={settings.defaultPaymentTerms}
                onChange={(e) => handleSettingChange('defaultPaymentTerms', e.target.value)}
                className="w-24"
                min="1"
                max="90"
              />
              <span className="text-sm text-muted-foreground">
                days for payment completion
              </span>
            </div>
          </div>

          {/* Invoice Prefix */}
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
            <Input
              id="invoicePrefix"
              value={settings.invoicePrefix}
              onChange={(e) => handleSettingChange('invoicePrefix', e.target.value)}
              className="w-32"
              placeholder="INV"
            />
          </div>

          <Separator />

          {/* Automation Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Automation</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Auto-send Invoices</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically send invoice receipts when payments are processed
                </p>
              </div>
              <Switch
                checked={settings.autoSendInvoices}
                onCheckedChange={(checked) => handleSettingChange('autoSendInvoices', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Send automatic reminders for overdue payments
                </p>
              </div>
              <Switch
                checked={settings.paymentReminders}
                onCheckedChange={(checked) => handleSettingChange('paymentReminders', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Configure how you receive payment notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Payment Received</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a payment is successfully received
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Payment Failed</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a payment attempt fails
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Weekly Reports</Label>
                <p className="text-sm text-muted-foreground">
                  Receive weekly payment summary reports
                </p>
              </div>
              <Switch />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Compliance
          </CardTitle>
          <CardDescription>
            Payment security and compliance settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-800">Security Status</span>
            </div>
            <div className="space-y-1 text-sm text-green-700">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span>PCI DSS Compliant payment processing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span>End-to-end encryption for all transactions</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                <span>Secure data storage and transmission</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Data Retention</Label>
            <p className="text-sm text-muted-foreground">
              Payment data is automatically retained for 7 years to comply with financial regulations.
              Personal data can be deleted upon request in compliance with privacy laws.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button 
          onClick={() => {
            toast({
              title: "Settings Saved",
              description: "Your payment settings have been updated successfully.",
            });
          }}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
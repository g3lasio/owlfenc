import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CreditCard,
  Settings,
  Bell,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Building2,
  Link,
  Mail,
  Percent,
  Calendar,
  Info,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { t } = useTranslation();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    autoSendInvoices: true,
    paymentReminders: true,
    defaultPaymentTerms: "30",
    preferredPaymentMethods: ["card", "apple_pay"],
    invoicePrefix: "INV",
    depositPercentage: "50",
    autoEmailReceipts: true,
    defaultDueDate: "7",
    companyName: "Your Company LLC",
    companyEmail: "payments@yourcompany.com",
    reminderSchedule: "3",
    invoiceNotes: "Thank you for your business!",
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    
    toast({
      title: "Setting Updated",
      description: `${key.replace(/([A-Z])/g, ' $1').toLowerCase()} has been updated.`,
    });
  };

  const saveSettings = () => {
    // TODO: Implement settings save
    toast({
      title: "Settings Saved",
      description: "All payment settings have been saved successfully.",
    });
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

  return (
    <div className="space-y-6">
      {/* Bank Account Connection */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Bank Account Connection
          </CardTitle>
          <CardDescription className="text-gray-400">
            Connect your bank account to process payments and receive funds instantly
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
                  Secure payment processing with instant bank transfers
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
              <Button
                onClick={onConnectStripe}
                className="bg-cyan-400 text-black hover:bg-cyan-300"
                disabled={stripeAccountStatus?.hasStripeAccount && stripeAccountStatus?.accountDetails?.chargesEnabled}
              >
                {stripeAccountStatus?.hasStripeAccount 
                  ? (stripeAccountStatus?.accountDetails?.chargesEnabled ? "View Dashboard" : "Complete Setup")
                  : "Connect Bank Account"
                }
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Connection Benefits */}
          <div className="bg-cyan-900/20 border border-cyan-700 p-4 rounded-lg">
            <h5 className="font-medium text-cyan-400 mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Connection Benefits
            </h5>
            <ul className="text-sm text-cyan-300 space-y-1">
              <li>• Instant payment processing and fund transfers</li>
              <li>• Support for all major credit cards and digital wallets</li>
              <li>• Automatic tax reporting and compliance</li>
              <li>• Fraud protection and dispute management</li>
              <li>• Real-time payment notifications</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Payment Configuration */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Payment Configuration
          </CardTitle>
          <CardDescription className="text-gray-400">
            Configure default payment settings and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-cyan-400 mb-3">Company Information</h4>
              <div>
                <Label htmlFor="companyName" className="text-white">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => handleSettingChange("companyName", e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  placeholder="Your Company LLC"
                />
              </div>
              <div>
                <Label htmlFor="companyEmail" className="text-white">Payment Email</Label>
                <Input
                  id="companyEmail"
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) => handleSettingChange("companyEmail", e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  placeholder="payments@yourcompany.com"
                />
              </div>
            </div>

            {/* Payment Defaults */}
            <div className="space-y-4">
              <h4 className="font-medium text-cyan-400 mb-3">Payment Defaults</h4>
              <div>
                <Label htmlFor="invoicePrefix" className="text-white">Invoice Prefix</Label>
                <Input
                  id="invoicePrefix"
                  value={settings.invoicePrefix}
                  onChange={(e) => handleSettingChange("invoicePrefix", e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                  placeholder="INV"
                />
              </div>
              <div>
                <Label htmlFor="depositPercentage" className="text-white">Default Deposit (%)</Label>
                <Select
                  value={settings.depositPercentage}
                  onValueChange={(value) => handleSettingChange("depositPercentage", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="100">100%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Payment Terms */}
          <div className="space-y-4">
            <h4 className="font-medium text-cyan-400 mb-3">Payment Terms</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="defaultPaymentTerms" className="text-white">Default Payment Terms (days)</Label>
                <Select
                  value={settings.defaultPaymentTerms}
                  onValueChange={(value) => handleSettingChange("defaultPaymentTerms", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="0">Immediate</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="15">15 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="defaultDueDate" className="text-white">Default Due Date (days)</Label>
                <Select
                  value={settings.defaultDueDate}
                  onValueChange={(value) => handleSettingChange("defaultDueDate", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reminderSchedule" className="text-white">Reminder Schedule (days before due)</Label>
                <Select
                  value={settings.reminderSchedule}
                  onValueChange={(value) => handleSettingChange("reminderSchedule", value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-gray-700" />

          {/* Invoice Notes */}
          <div className="space-y-4">
            <h4 className="font-medium text-cyan-400 mb-3">Invoice Customization</h4>
            <div>
              <Label htmlFor="invoiceNotes" className="text-white">Default Invoice Notes</Label>
              <Textarea
                id="invoiceNotes"
                value={settings.invoiceNotes}
                onChange={(e) => handleSettingChange("invoiceNotes", e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                placeholder="Add a personal message to your invoices..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Automation Settings */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Automation & Notifications
          </CardTitle>
          <CardDescription className="text-gray-400">
            Automate payment workflows and configure notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Automation Switches */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-cyan-400" />
                <div>
                  <h5 className="font-medium text-white">Auto-send Invoices</h5>
                  <p className="text-sm text-gray-400">Automatically email invoices to clients</p>
                </div>
              </div>
              <Switch
                checked={settings.autoSendInvoices}
                onCheckedChange={(checked) => handleSettingChange("autoSendInvoices", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-cyan-400" />
                <div>
                  <h5 className="font-medium text-white">Payment Reminders</h5>
                  <p className="text-sm text-gray-400">Send automatic payment reminders</p>
                </div>
              </div>
              <Switch
                checked={settings.paymentReminders}
                onCheckedChange={(checked) => handleSettingChange("paymentReminders", checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-cyan-400" />
                <div>
                  <h5 className="font-medium text-white">Auto Email Receipts</h5>
                  <p className="text-sm text-gray-400">Send receipts automatically after payment</p>
                </div>
              </div>
              <Switch
                checked={settings.autoEmailReceipts}
                onCheckedChange={(checked) => handleSettingChange("autoEmailReceipts", checked)}
              />
            </div>
          </div>

          {/* Information Box */}
          <div className="bg-blue-900/20 border border-blue-700 p-4 rounded-lg">
            <h5 className="font-medium text-blue-400 mb-2 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Automation Benefits
            </h5>
            <ul className="text-sm text-blue-300 space-y-1">
              <li>• Reduce manual work and save time</li>
              <li>• Improve client communication and satisfaction</li>
              <li>• Get paid faster with automatic reminders</li>
              <li>• Never miss a payment follow-up</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex justify-end">
        <Button
          onClick={saveSettings}
          className="bg-cyan-400 text-black hover:bg-cyan-300 px-8"
        >
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CreditCard, 
  Bell, 
  Shield, 
  Globe, 
  Smartphone, 
  FileText, 
  Database,
  Clock,
  MapPin,
  Calculator,
  Building2,
  Key,
  Download,
  Upload,
  Mail,
  Phone,
  Users,
  Settings2
} from "lucide-react";

export default function Settings() {
  const [saveLoading, setSaveLoading] = useState(false);
  const { toast } = useToast();
  
  const handleSaveSettings = async () => {
    setSaveLoading(true);
    try {
      // Simular guardado
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Settings saved",
        description: "Your settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaveLoading(false);
    }
  };
  
  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground mb-6">
          Manage your account preferences, billing, and business settings.
        </p>
        
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Business
            </TabsTrigger>
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Integrations
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>
          
          {/* ACCOUNT TAB */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Account Preferences
                </CardTitle>
                <CardDescription>
                  Manage your personal account settings and preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="pst">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
                        <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
                        <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
                        <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">Use dark theme throughout the app</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Auto-save Estimates</Label>
                      <p className="text-sm text-muted-foreground">Automatically save estimates as you work</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Show Tooltips</Label>
                      <p className="text-sm text-muted-foreground">Display helpful tooltips and hints</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* BILLING TAB */}
          <TabsContent value="billing" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscription & Billing
                </CardTitle>
                <CardDescription>
                  Manage your subscription, payment methods, and billing history.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Plan */}
                <div className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-primary mb-1">Premium Plan</h3>
                      <p className="text-muted-foreground">Full access to all features</p>
                    </div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Monthly Price</p>
                      <p className="text-2xl font-bold">$49.99</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Next Billing</p>
                      <p className="font-semibold">Dec 15, 2024</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-semibold">•••• 4242</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button variant="outline">
                      Change Plan
                    </Button>
                    <Button variant="outline">
                      Update Payment Method
                    </Button>
                    <Button variant="outline">
                      Cancel Subscription
                    </Button>
                  </div>
                </div>
                
                {/* Payment Methods */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payment Methods</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Visa ending in 4242</p>
                          <p className="text-sm text-muted-foreground">Expires 12/2027</p>
                        </div>
                        <Badge variant="secondary">Default</Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                    
                    <Button variant="outline" className="w-full">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Add Payment Method
                    </Button>
                  </div>
                </div>
                
                {/* Billing History */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">Billing History</h3>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download All
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {[
                      { date: "Nov 15, 2024", amount: "$49.99", status: "Paid", invoice: "INV-001" },
                      { date: "Oct 15, 2024", amount: "$49.99", status: "Paid", invoice: "INV-002" },
                      { date: "Sep 15, 2024", amount: "$49.99", status: "Paid", invoice: "INV-003" },
                    ].map((bill, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{bill.date}</p>
                            <p className="text-sm text-muted-foreground">{bill.invoice}</p>
                          </div>
                          <div>
                            <p className="font-semibold">{bill.amount}</p>
                            <Badge variant="secondary" className="text-xs">
                              {bill.status}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* NOTIFICATIONS TAB */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Control how and when you receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Notifications
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">New Project Updates</Label>
                          <p className="text-sm text-muted-foreground">When projects are created or updated</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Payment Notifications</Label>
                          <p className="text-sm text-muted-foreground">Payment confirmations and receipts</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Permit Status Updates</Label>
                          <p className="text-sm text-muted-foreground">When permit applications change status</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      SMS Notifications
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Emergency Updates</Label>
                          <p className="text-sm text-muted-foreground">Critical system alerts and urgent updates</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Client Communications</Label>
                          <p className="text-sm text-muted-foreground">When clients send messages or updates</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h3 className="font-semibold mb-3">Notification Schedule</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quiet Hours Start</Label>
                        <Select defaultValue="22:00">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="20:00">8:00 PM</SelectItem>
                            <SelectItem value="21:00">9:00 PM</SelectItem>
                            <SelectItem value="22:00">10:00 PM</SelectItem>
                            <SelectItem value="23:00">11:00 PM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Quiet Hours End</Label>
                        <Select defaultValue="07:00">
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="06:00">6:00 AM</SelectItem>
                            <SelectItem value="07:00">7:00 AM</SelectItem>
                            <SelectItem value="08:00">8:00 AM</SelectItem>
                            <SelectItem value="09:00">9:00 AM</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* BUSINESS TAB */}
          <TabsContent value="business" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Manage your business profile and operational settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name</Label>
                    <Input 
                      id="business-name" 
                      placeholder="Your Business Name"
                      defaultValue="Premium Fence Co."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="license-number">License Number</Label>
                    <Input 
                      id="license-number" 
                      placeholder="License #"
                      defaultValue="LIC-12345"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Business Phone</Label>
                    <Input 
                      id="phone" 
                      type="tel"
                      placeholder="(555) 123-4567"
                      defaultValue="(555) 123-4567"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Business Email</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="contact@business.com"
                      defaultValue="contact@premiumfence.com"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input 
                    id="address" 
                    placeholder="Street Address"
                    defaultValue="123 Main Street, City, State 12345"
                  />
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-3">Operational Settings</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>Default Tax Rate (%)</Label>
                        <Input 
                          type="number" 
                          placeholder="8.75"
                          defaultValue="8.75"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Default Markup (%)</Label>
                        <Input 
                          type="number" 
                          placeholder="25"
                          defaultValue="25"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Service Area (Miles from base)</Label>
                      <Input 
                        type="number" 
                        placeholder="50"
                        defaultValue="50"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* INTEGRATIONS TAB */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  External Integrations
                </CardTitle>
                <CardDescription>
                  Connect with external services to enhance your workflow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  {[
                    { 
                      name: "QuickBooks", 
                      description: "Sync invoices and payments", 
                      connected: true,
                      icon: Calculator
                    },
                    { 
                      name: "Google Maps", 
                      description: "Enhanced location services", 
                      connected: true,
                      icon: MapPin
                    },
                    { 
                      name: "Mailchimp", 
                      description: "Email marketing automation", 
                      connected: false,
                      icon: Mail
                    },
                    { 
                      name: "Zapier", 
                      description: "Workflow automation", 
                      connected: false,
                      icon: Database
                    },
                  ].map((integration, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <integration.icon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{integration.name}</p>
                          <p className="text-sm text-muted-foreground">{integration.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {integration.connected ? (
                          <>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Connected
                            </Badge>
                            <Button variant="outline" size="sm">
                              Configure
                            </Button>
                          </>
                        ) : (
                          <Button size="sm">
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* SECURITY TAB */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security & Privacy
                </CardTitle>
                <CardDescription>
                  Manage your account security and privacy settings.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Account Security</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Two-Factor Authentication</p>
                        <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                      </div>
                      <Button>
                        Enable 2FA
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">Last changed 2 months ago</p>
                      </div>
                      <Button variant="outline">
                        Change Password
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Active Sessions</p>
                        <p className="text-sm text-muted-foreground">Manage your active login sessions</p>
                      </div>
                      <Button variant="outline">
                        View Sessions
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-3">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Data Analytics</Label>
                        <p className="text-sm text-muted-foreground">Help improve our service with usage analytics</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Marketing Communications</Label>
                        <p className="text-sm text-muted-foreground">Receive product updates and tips</p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold mb-3 text-red-600">Danger Zone</h3>
                  <div className="space-y-3">
                    <div className="p-4 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-600">Export Account Data</p>
                          <p className="text-sm text-muted-foreground">Download all your account data</p>
                        </div>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-red-600">Delete Account</p>
                          <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
                        </div>
                        <Button variant="destructive" size="sm">
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t">
          <Button 
            onClick={handleSaveSettings}
            disabled={saveLoading}
            className="px-8"
          >
            {saveLoading ? "Saving..." : "Save All Settings"}
          </Button>
        </div>
      </div>
    </div>
  );
}
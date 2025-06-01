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
    <div className="flex-1 p-3 md:p-6 overflow-auto bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
      {/* Cyberpunk Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-cyan-400/30"></div>
        <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-cyan-400/30"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-cyan-400/30"></div>
        <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-cyan-400/30"></div>
        
        {/* Scanning Lines */}
        <div className="absolute inset-0">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse"></div>
          <div className="h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-pulse delay-300 mt-20"></div>
          <div className="h-px bg-gradient-to-r from-transparent via-purple-400/20 to-transparent animate-pulse delay-700 mt-40"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Futuristic Header */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-xl"></div>
          <div className="relative p-6 border border-cyan-400/30 bg-slate-900/50 backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
            
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
              SYSTEM CONFIGURATION
            </h1>
            <p className="text-slate-300 text-sm md:text-base">
              Advanced system preferences and operational parameters
            </p>
          </div>
        </div>
        
        <Tabs defaultValue="account" className="space-y-6">
          {/* Tab Navigation - SOLUCIÓN DEFINITIVA: 6 botones SIEMPRE visibles */}
          <div className="relative mb-8 w-full">
            <div className="w-full bg-slate-900/90 backdrop-blur border border-cyan-400/30 rounded-lg p-3">
              {/* Grid que garantiza visibilidad completa */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 w-full auto-rows-fr">
                {/* ROW 1 */}
                <TabsTrigger 
                  value="account" 
                  className="flex flex-col items-center justify-center gap-2 p-4 h-20 text-xs font-medium text-slate-300 bg-slate-800/70 border border-slate-600/50 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:border-cyan-400/70 data-[state=active]:text-cyan-200 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 hover:bg-slate-700/70 hover:border-slate-500/60 hover:text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <Settings2 className="h-6 w-6 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-none text-center">Account</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="billing" 
                  className="flex flex-col items-center justify-center gap-2 p-4 h-20 text-xs font-medium text-slate-300 bg-slate-800/70 border border-slate-600/50 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:border-cyan-400/70 data-[state=active]:text-cyan-200 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 hover:bg-slate-700/70 hover:border-slate-500/60 hover:text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <CreditCard className="h-6 w-6 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-none text-center">Billing</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="notifications" 
                  className="flex flex-col items-center justify-center gap-2 p-4 h-20 text-xs font-medium text-slate-300 bg-slate-800/70 border border-slate-600/50 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:border-cyan-400/70 data-[state=active]:text-cyan-200 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 hover:bg-slate-700/70 hover:border-slate-500/60 hover:text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <Bell className="h-6 w-6 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-none text-center">Alerts</span>
                </TabsTrigger>

                {/* ROW 2 - Visible en móvil */}
                <TabsTrigger 
                  value="business" 
                  className="flex flex-col items-center justify-center gap-2 p-4 h-20 text-xs font-medium text-slate-300 bg-slate-800/70 border border-slate-600/50 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:border-cyan-400/70 data-[state=active]:text-cyan-200 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 hover:bg-slate-700/70 hover:border-slate-500/60 hover:text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <Building2 className="h-6 w-6 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-none text-center">Business</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="integrations" 
                  className="flex flex-col items-center justify-center gap-2 p-4 h-20 text-xs font-medium text-slate-300 bg-slate-800/70 border border-slate-600/50 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:border-cyan-400/70 data-[state=active]:text-cyan-200 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 hover:bg-slate-700/70 hover:border-slate-500/60 hover:text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <Database className="h-6 w-6 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-none text-center">Connect</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="security" 
                  className="flex flex-col items-center justify-center gap-2 p-4 h-20 text-xs font-medium text-slate-300 bg-slate-800/70 border border-slate-600/50 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/20 data-[state=active]:to-blue-600/20 data-[state=active]:border-cyan-400/70 data-[state=active]:text-cyan-200 data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/20 hover:bg-slate-700/70 hover:border-slate-500/60 hover:text-slate-200 transition-all duration-300 cursor-pointer"
                >
                  <Shield className="h-6 w-6 flex-shrink-0" />
                  <span className="text-[11px] font-medium leading-none text-center">Security</span>
                </TabsTrigger>
              </div>
            </div>
          </div>
          
          {/* ACCOUNT TAB */}
          <TabsContent value="account" className="space-y-4 md:space-y-6">
            {/* Cyberpunk Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <Card className="relative bg-slate-900/80 backdrop-blur border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300">
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-cyan-300">
                    <Settings2 className="h-5 w-5" />
                    ACCOUNT PREFERENCES
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage your personal account settings and preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="language" className="text-cyan-300 text-sm font-medium">Language</Label>
                      <Select defaultValue="en">
                        <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-200 hover:border-cyan-400/50 focus:border-cyan-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="es">Español</SelectItem>
                          <SelectItem value="fr">Français</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="timezone" className="text-cyan-300 text-sm font-medium">Timezone</Label>
                      <Select defaultValue="pst">
                        <SelectTrigger className="bg-slate-800/50 border-slate-600/50 text-slate-200 hover:border-cyan-400/50 focus:border-cyan-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600">
                          <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
                          <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
                          <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
                          <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator className="bg-slate-700/50" />
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded bg-slate-800/30 border border-slate-700/50">
                      <div className="flex-1">
                        <Label className="text-base text-cyan-300">Dark Mode</Label>
                        <p className="text-sm text-slate-400">Use dark theme throughout the app</p>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-cyan-600" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded bg-slate-800/30 border border-slate-700/50">
                      <div className="flex-1">
                        <Label className="text-base text-cyan-300">Auto-save Estimates</Label>
                        <p className="text-sm text-slate-400">Automatically save estimates as you work</p>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-cyan-600" />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded bg-slate-800/30 border border-slate-700/50">
                      <div className="flex-1">
                        <Label className="text-base text-cyan-300">Show Tooltips</Label>
                        <p className="text-sm text-slate-400">Display helpful tooltips and hints</p>
                      </div>
                      <Switch defaultChecked className="data-[state=checked]:bg-cyan-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* BILLING TAB */}
          <TabsContent value="billing" className="space-y-4 md:space-y-6">
            {/* Current Plan - Cyberpunk Style */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
              <Card className="relative bg-slate-900/80 backdrop-blur border border-cyan-400/30 hover:border-cyan-400/50 transition-all duration-300">
                {/* Corner Brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>
                
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-cyan-300">
                    <CreditCard className="h-5 w-5" />
                    SUBSCRIPTION & BILLING
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Manage your subscription, payment methods, and billing history.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Current Plan */}
                  <div className="relative p-4 md:p-6 bg-gradient-to-r from-cyan-500/20 via-blue-500/10 to-purple-500/20 rounded-lg border border-cyan-400/50 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-4">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-cyan-300 mb-1">SUBSCRIPTION PLAN</h3>
                        <p className="text-slate-300 text-sm md:text-base">Manage your subscription details</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                      <div className="text-center sm:text-left">
                        <p className="text-xs md:text-sm text-slate-400 uppercase tracking-wide">Monthly Price</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-400">Not Set</p>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs md:text-sm text-slate-400 uppercase tracking-wide">Next Billing</p>
                        <p className="font-semibold text-slate-400">Not Scheduled</p>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="text-xs md:text-sm text-slate-400 uppercase tracking-wide">Payment Method</p>
                        <p className="font-semibold text-slate-400">Not Added</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                      <Button variant="outline" className="bg-slate-800/50 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400 text-xs md:text-sm">
                        View Plans
                      </Button>
                      <Button variant="outline" className="bg-slate-800/50 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400 text-xs md:text-sm">
                        Add Payment Method
                      </Button>
                    </div>
                  </div>
                
                  {/* Payment Methods */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-cyan-300 uppercase tracking-wide">Payment Methods</h3>
                    <div className="space-y-3">
                      <div className="flex flex-col items-center justify-center gap-3 p-8 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                        <CreditCard className="h-12 w-12 text-slate-500" />
                        <div className="text-center">
                          <p className="font-medium text-slate-400 mb-1">No payment methods added</p>
                          <p className="text-sm text-slate-500">Add a payment method to manage your subscription</p>
                        </div>
                      </div>
                      
                      <Button variant="outline" className="w-full bg-slate-800/50 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Add Payment Method
                      </Button>
                    </div>
                  </div>
                  
                  {/* Billing History */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <h3 className="text-lg font-semibold text-cyan-300 uppercase tracking-wide">Billing History</h3>
                      <Button variant="outline" size="sm" className="bg-slate-800/50 border-cyan-400/50 text-cyan-300 hover:bg-cyan-400/10 hover:border-cyan-400 text-xs md:text-sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download All
                      </Button>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center gap-3 p-8 bg-slate-800/30 border border-slate-700/50 rounded-lg">
                      <FileText className="h-12 w-12 text-slate-500" />
                      <div className="text-center">
                        <p className="font-medium text-slate-400 mb-1">No billing history</p>
                        <p className="text-sm text-slate-500">Your billing transactions will appear here</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
        
        {/* Cyberpunk Save Button */}
        <div className="flex justify-center md:justify-end pt-6 border-t border-slate-700/50">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
            <Button 
              onClick={handleSaveSettings}
              disabled={saveLoading}
              className="relative px-6 md:px-8 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold border border-cyan-400/50 hover:border-cyan-400 transition-all duration-300 disabled:opacity-50"
            >
              <div className="flex items-center gap-2">
                {saveLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>SAVING...</span>
                  </>
                ) : (
                  <>
                    <span>SAVE ALL SETTINGS</span>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  </>
                )}
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
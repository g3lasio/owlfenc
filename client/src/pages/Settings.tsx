import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [saveLoading, setSaveLoading] = useState(false);
  const { toast } = useToast();
  
  return (
    <div className="flex-1 p-6 overflow-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="pricing" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Default Pricing</CardTitle>
              <CardDescription>
                Set default pricing for fence types and components.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-medium">Fence Materials (per linear foot)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="wood-price">Wood Fence</Label>
                    <Input 
                      id="wood-price" 
                      type="number" 
                      placeholder="30.00"
                      defaultValue="30.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vinyl-price">Vinyl Fence</Label>
                    <Input 
                      id="vinyl-price" 
                      type="number" 
                      placeholder="40.00"
                      defaultValue="40.00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chain-price">Chain Link</Label>
                    <Input 
                      id="chain-price" 
                      type="number" 
                      placeholder="25.00"
                      defaultValue="25.00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aluminum-price">Aluminum</Label>
                    <Input 
                      id="aluminum-price" 
                      type="number" 
                      placeholder="60.00"
                      defaultValue="60.00" 
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="font-medium">Gates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="walk-gate">Walk Gate (3-4ft)</Label>
                    <Input 
                      id="walk-gate" 
                      type="number" 
                      placeholder="250.00"
                      defaultValue="250.00" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="drive-gate">Drive Gate (10-12ft)</Label>
                    <Input 
                      id="drive-gate" 
                      type="number" 
                      placeholder="650.00"
                      defaultValue="650.00" 
                    />
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                <h3 className="font-medium">Tax & Fees</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                    <Input 
                      id="tax-rate" 
                      type="number" 
                      placeholder="8.75"
                      defaultValue="8.75" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="permit-fee">Permit Fee</Label>
                    <Input 
                      id="permit-fee" 
                      type="number" 
                      placeholder="150.00"
                      defaultValue="150.00" 
                    />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button>Save Pricing</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Customize the emails sent to clients.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="estimate-email">Estimate Email</Label>
                    <Button variant="ghost" size="sm">
                      <i className="ri-edit-line mr-1"></i> Edit
                    </Button>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                    <p>Subject: Your Fence Estimate from [Company Name]</p>
                    <p className="mt-2">Dear [Client Name],</p>
                    <p className="mt-2">Thank you for choosing [Company Name]. Please find your estimate attached...</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contract-email">Contract Email</Label>
                    <Button variant="ghost" size="sm">
                      <i className="ri-edit-line mr-1"></i> Edit
                    </Button>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md text-sm">
                    <p>Subject: Your Fence Contract from [Company Name]</p>
                    <p className="mt-2">Dear [Client Name],</p>
                    <p className="mt-2">Thank you for choosing [Company Name]. Please find your contract attached...</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Preferences</CardTitle>
              <CardDescription>
                Manage your account settings and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive emails when new estimates are created</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive text messages for important updates</p>
                  </div>
                  <Switch />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Use dark theme throughout the app</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>
                Manage your subscription plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-primary">Premium Plan</h3>
                    <p className="text-sm">Your subscription renews on Nov 15, 2023</p>
                  </div>
                  <div className="bg-primary text-white px-3 py-1 rounded-full text-sm">
                    Active
                  </div>
                </div>
              </div>
              
              <Button variant="outline" className="w-full">
                <i className="ri-bank-card-line mr-2"></i> Manage Billing
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

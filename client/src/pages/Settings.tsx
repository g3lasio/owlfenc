import { useState } from "react";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Bell,
  Shield,
  Settings2,
  LogOut,
  User,
  Moon,
  Sun,
  CreditCard,
} from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  const { logout, currentUser } = useAuth();
  
  // Simplified state management
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("pst");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handlers
  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    toast({
      title: "Language Updated",
      description: `Language changed to ${value === "en" ? "English" : value === "es" ? "Español" : "Français"}`,
    });
  };

  const handleTimezoneChange = (value: string) => {
    setTimezone(value);
    toast({
      title: "Timezone Updated",
      description: "Your timezone preference has been saved",
    });
  };

  const handleDarkModeToggle = (checked: boolean) => {
    setIsDarkMode(checked);
    toast({
      title: checked ? "Dark Mode Enabled" : "Light Mode Enabled",
      description: "Theme preference updated",
    });
  };

  const handleEmailNotificationsToggle = (checked: boolean) => {
    setEmailNotifications(checked);
    toast({
      title: checked ? "Email Notifications Enabled" : "Email Notifications Disabled",
      description: "Email notification preference updated",
    });
  };

  const handleSmsNotificationsToggle = (checked: boolean) => {
    setSmsNotifications(checked);
    toast({
      title: checked ? "SMS Notifications Enabled" : "SMS Notifications Disabled",
      description: "SMS notification preference updated",
    });
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleChangePassword = () => {
    window.location.href = "/reset-password";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Manage your account preferences and security settings
          </p>
        </div>

        <Tabs defaultValue="account" className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
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
                    <Select value={language} onValueChange={handleLanguageChange}>
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
                    <Select value={timezone} onValueChange={handleTimezoneChange}>
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
                    <div className="space-y-0.5">
                      <Label className="text-base flex items-center gap-2">
                        {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                        Dark Mode
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Use dark theme throughout the app
                      </p>
                    </div>
                    <Switch
                      checked={isDarkMode}
                      onCheckedChange={handleDarkModeToggle}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Billing</h3>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Subscription Plan</p>
                        <p className="text-sm text-muted-foreground">
                          Manage your subscription and billing
                        </p>
                      </div>
                      <Link href="/subscription">
                        <Button variant="outline" className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Manage Subscription
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive important updates via email
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={handleEmailNotificationsToggle}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive critical alerts via SMS
                      </p>
                    </div>
                    <Switch
                      checked={smsNotifications}
                      onCheckedChange={handleSmsNotificationsToggle}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
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
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Password</p>
                        <p className="text-sm text-muted-foreground">
                          Change your account password
                        </p>
                      </div>
                      <Button variant="outline" onClick={handleChangePassword}>
                        Change Password
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Active Sessions</p>
                        <p className="text-sm text-muted-foreground">
                          You are signed in to this device
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-2"
                      >
                        {isLoggingOut ? (
                          <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        {isLoggingOut ? "Logging out..." : "Log Out"}
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
                        <p className="text-sm text-muted-foreground">
                          Help improve our service with usage analytics
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base">Marketing Communications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive product updates and tips
                        </p>
                      </div>
                      <Switch />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
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
import { Input } from "@/components/ui/input";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Mail,
  Edit3,
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
  
  // Email change functionality
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  // Name change functionality
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [isChangingName, setIsChangingName] = useState(false);

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

  const handleEmailChange = async () => {
    if (!newEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (newEmail === currentUser?.email) {
      toast({
        title: "Error",
        description: "The new email is the same as your current email",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to change your email",
        variant: "destructive",
      });
      return;
    }

    setIsChangingEmail(true);
    try {
      // Usar Firebase auth directamente (evitando imports dinámicos innecesarios)
      const { verifyBeforeUpdateEmail } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');
      
      if (auth.currentUser) {
        await verifyBeforeUpdateEmail(auth.currentUser, newEmail);
        
        toast({
          title: "Verification Email Sent",
          description: `A verification email has been sent to ${newEmail}. Please verify your new email address to complete the change.`,
        });
        
        setIsEmailDialogOpen(false);
        setNewEmail("");
      } else {
        throw new Error("No authenticated user found");
      }
    } catch (error: any) {
      console.error('❌ [SETTINGS] Error updating email:', error);
      
      let errorMessage = "Failed to change email. Please try again.";
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email is already in use by another account.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log back in before changing your email.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many requests. Please try again later.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingEmail(false);
    }
  };

  const handleNameChange = async () => {
    if (!newDisplayName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid name",
        variant: "destructive",
      });
      return;
    }

    if (newDisplayName.trim() === currentUser?.displayName) {
      toast({
        title: "Error",
        description: "The new name is the same as your current name",
        variant: "destructive",
      });
      return;
    }

    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to change your name",
        variant: "destructive",
      });
      return;
    }

    setIsChangingName(true);
    try {
      // Usar la función updateUserProfile de Firebase
      const { updateUserProfile } = await import('@/lib/firebase');
      
      await updateUserProfile(newDisplayName.trim());
      
      toast({
        title: "Name Updated",
        description: `Your display name has been updated to "${newDisplayName.trim()}"`,
      });
      
      setIsNameDialogOpen(false);
      setNewDisplayName("");
      
      // Recargar la información del usuario para reflejar los cambios
      const { auth } = await import('@/lib/firebase');
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }
    } catch (error: any) {
      console.error('❌ [SETTINGS] Error updating display name:', error);
      
      let errorMessage = "Failed to change name. Please try again.";
      
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = "Please log out and log back in before changing your name.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsChangingName(false);
    }
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
                  {/* Current Name Display */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Display Name</p>
                          <p className="text-sm text-muted-foreground">
                            {currentUser?.displayName || "No name set"}
                          </p>
                        </div>
                      </div>
                      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4" />
                            Change Name
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Change Display Name</DialogTitle>
                            <DialogDescription>
                              Enter your new display name. This will be shown throughout the application.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="current-name">Current Name</Label>
                              <Input
                                id="current-name"
                                value={currentUser?.displayName || ""}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-name">New Display Name</Label>
                              <Input
                                id="new-name"
                                type="text"
                                placeholder="Enter new display name"
                                value={newDisplayName}
                                onChange={(e) => setNewDisplayName(e.target.value)}
                                disabled={isChangingName}
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsNameDialogOpen(false);
                                  setNewDisplayName("");
                                }}
                                disabled={isChangingName}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleNameChange}
                                disabled={isChangingName || !newDisplayName.trim()}
                              >
                                {isChangingName ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Updating...
                                  </>
                                ) : (
                                  "Update Name"
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  {/* Current Email Display */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Email Address</p>
                          <p className="text-sm text-muted-foreground">
                            {currentUser?.email || "No email set"}
                          </p>
                        </div>
                      </div>
                      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="flex items-center gap-2">
                            <Edit3 className="h-4 w-4" />
                            Change Email
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Change Email Address</DialogTitle>
                            <DialogDescription>
                              Enter your new email address. A verification email will be sent to confirm the change.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="current-email">Current Email</Label>
                              <Input
                                id="current-email"
                                value={currentUser?.email || ""}
                                disabled
                                className="bg-muted"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="new-email">New Email Address</Label>
                              <Input
                                id="new-email"
                                type="email"
                                placeholder="Enter new email address"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                disabled={isChangingEmail}
                              />
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setIsEmailDialogOpen(false);
                                  setNewEmail("");
                                }}
                                disabled={isChangingEmail}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleEmailChange}
                                disabled={isChangingEmail || !newEmail.trim()}
                              >
                                {isChangingEmail ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                                    Sending...
                                  </>
                                ) : (
                                  "Send Verification"
                                )}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

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
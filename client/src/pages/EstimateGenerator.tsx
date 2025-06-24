import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ProjectDescriptionEnhancer } from '@/components/ui/project-description-enhancer';
import { getClients } from '@/lib/clientFirebase';
import { useAuth } from '@/contexts/AuthContext';
import { 
  User, 
  FileText, 
  Calculator, 
  Eye, 
  Save, 
  Plus, 
  Trash2, 
  Search, 
  X, 
  Menu,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react';

interface EstimateItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unit: string;
  price: number;
  total: number;
}

interface Estimate {
  title: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectDescription: string;
  items: EstimateItem[];
  subtotal: number;
  tax: number;
  total: number;
  notes: string;
}

type Step = 'client' | 'project' | 'items' | 'review';

interface ClientType {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function EstimateGenerator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currentUser, login, loginWithGoogle, loginWithApple } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Mobile-first state management
  const [currentStep, setCurrentStep] = useState<Step>('client');
  const [isSaving, setIsSaving] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [estimate, setEstimate] = useState<Estimate>({
    title: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    projectDescription: '',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    notes: ''
  });

  // Load clients from Firebase
  const [clients, setClients] = useState<ClientType[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);

  // Handle Firebase login
  const handleEmailLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast({
        title: 'Error',
        description: 'Please enter email and password',
        variant: 'destructive'
      });
      return;
    }

    setLoginLoading(true);
    try {
      await login(loginEmail, loginPassword);
      setShowLoginDialog(false);
      setLoginEmail('');
      setLoginPassword('');
      toast({
        title: 'Success',
        description: 'Logged in successfully!',
      });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Error',
        description: 'Invalid email or password',
        variant: 'destructive'
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoginLoading(true);
    try {
      await loginWithGoogle();
      setShowLoginDialog(false);
      toast({
        title: 'Success',
        description: 'Logged in with Google successfully!',
      });
    } catch (error) {
      console.error('Google login error:', error);
      toast({
        title: 'Login Error',
        description: 'Failed to login with Google',
        variant: 'destructive'
      });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoginLoading(true);
    try {
      console.log('Iniciando autenticación con Apple desde EstimateGenerator');
      await loginWithApple();
      setShowLoginDialog(false);
      toast({
        title: 'Success',
        description: 'Logged in with Apple successfully!',
      });
    } catch (error) {
      console.error('Apple login error:', error);
      toast({
        title: 'Login Error', 
        description: 'Failed to login with Apple',
        variant: 'destructive'
      });
    } finally {
      setLoginLoading(false);
    }
  };

  // Load clients when component mounts
  useEffect(() => {
    const loadClientsData = async () => {
      if (!currentUser) {
        // Show login dialog if no user is authenticated
        setShowLoginDialog(true);
        return;
      }
      
      setLoadingClients(true);
      try {
        const clientsData = await getClients(currentUser.uid);
        const mappedClients: ClientType[] = clientsData.map(client => ({
          id: client.id,
          name: client.name,
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || ''
        }));
        setClients(mappedClients);
        console.log('Clients loaded for EstimateGenerator:', mappedClients.length);
      } catch (error) {
        console.error('Error loading clients:', error);
        toast({
          title: 'Error',
          description: 'Failed to load clients from Firebase',
          variant: 'destructive'
        });
      } finally {
        setLoadingClients(false);
      }
    };

    loadClientsData();
  }, [currentUser, toast]);

  // Calculate totals whenever items change
  useEffect(() => {
    const subtotal = estimate.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;
    
    setEstimate(prev => ({
      ...prev,
      subtotal,
      tax,
      total
    }));
  }, [estimate.items]);

  // Navigation functions
  const steps: Step[] = ['client', 'project', 'items', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  const nextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  // Client selection
  const filteredClients = clients.filter((client: ClientType) =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch)
  );

  const loadExistingClient = (client: ClientType) => {
    setEstimate(prev => ({
      ...prev,
      clientName: client.name,
      clientEmail: client.email,
      clientPhone: client.phone,
      clientAddress: client.address
    }));
    setShowClientDialog(false);
    setClientSearch('');
    toast({
      title: "Client loaded",
      description: "Client information has been loaded successfully."
    });
  };

  // Item management
  const addItem = () => {
    const newItem: EstimateItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      unit: 'unit',
      price: 0,
      total: 0
    };
    setEstimate(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (id: string, field: keyof EstimateItem, value: any) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' || field === 'price') {
            updatedItem.total = updatedItem.quantity * updatedItem.price;
          }
          return updatedItem;
        }
        return item;
      })
    }));
  };

  const removeItem = (id: string) => {
    setEstimate(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  // Save estimate
  const saveEstimate = async () => {
    setIsSaving(true);
    try {
      // Simulate save API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast({
        title: "Estimate saved",
        description: "Your estimate has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save estimate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Generate preview
  const generatePreview = () => {
    toast({
      title: "Preview generated",
      description: "Opening PDF preview..."
    });
  };

  // Mobile navigation
  const stepIcons = {
    client: User,
    project: FileText,
    items: Calculator,
    review: Eye
  };

  const stepLabels = {
    client: 'Client Info',
    project: 'Project Details',
    items: 'Items & Pricing',
    review: 'Review & Send'
  };

  // Mobile header component
  const renderMobileHeader = () => (
    <div className="md:hidden bg-card border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-semibold text-sm">New Estimate</h1>
          <p className="text-xs text-muted-foreground">{stepLabels[currentStep]}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {currentStepIndex + 1}/{steps.length}
        </span>
      </div>
    </div>
  );

  // Mobile progress indicator
  const renderMobileProgress = () => (
    <div className="md:hidden px-4 py-2 bg-muted/50">
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const Icon = stepIcons[step];
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          
          return (
            <div key={step} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                isActive ? 'bg-primary text-primary-foreground' :
                isCompleted ? 'bg-green-500 text-white' :
                'bg-muted text-muted-foreground'
              }`}>
                {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span className="text-xs text-center">{stepLabels[step]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Desktop sidebar component
  const renderDesktopSidebar = () => (
    <div className="hidden md:flex w-64 bg-card border-r border-border flex-col">
      <div className="p-6 border-b border-border">
        <h2 className="text-lg font-semibold">Create Estimate</h2>
        <p className="text-sm text-muted-foreground">Professional estimate builder</p>
      </div>
      
      <div className="flex-1 p-4">
        <nav className="space-y-2">
          {steps.map((step, index) => {
            const Icon = stepIcons[step];
            const isActive = step === currentStep;
            const isCompleted = index < currentStepIndex;
            
            return (
              <button
                key={step}
                onClick={() => setCurrentStep(step)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' :
                  isCompleted ? 'bg-green-50 text-green-700 hover:bg-green-100' :
                  'hover:bg-muted'
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  isActive ? 'bg-primary-foreground/20' :
                  isCompleted ? 'bg-green-500 text-white' :
                  'bg-muted'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div>
                  <div className="font-medium">{stepLabels[step]}</div>
                  <div className="text-xs opacity-70">Step {index + 1}</div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
      
      <div className="p-4 border-t border-border space-y-2">
        <Button onClick={saveEstimate} disabled={isSaving} className="w-full" variant="outline">
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Draft'}
        </Button>
        <Button 
          onClick={generatePreview}
          disabled={estimate.items.length === 0}
          className="w-full"
        >
          <Eye className="h-4 w-4 mr-2" />
          Preview PDF
        </Button>
      </div>
    </div>
  );

  // Main content renderer
  const renderMainContent = () => {
    switch (currentStep) {
      case 'client':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Enter client details or select an existing client</CardDescription>
              <div className="flex justify-end">
                <Button onClick={() => setShowClientDialog(true)} variant="outline" size="sm">
                  <Search className="mr-2 h-4 w-4" />
                  Select Existing Client
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={estimate.clientName}
                    onChange={(e) => setEstimate(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="Enter client name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Email Address *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={estimate.clientEmail}
                    onChange={(e) => setEstimate(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="client@example.com"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientPhone">Phone Number</Label>
                  <Input
                    id="clientPhone"
                    value={estimate.clientPhone}
                    onChange={(e) => setEstimate(prev => ({ ...prev, clientPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="estimateTitle">Estimate Title *</Label>
                  <Input
                    id="estimateTitle"
                    value={estimate.title}
                    onChange={(e) => setEstimate(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Fence Installation - Backyard"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="clientAddress">Project Address</Label>
                <Textarea
                  id="clientAddress"
                  value={estimate.clientAddress}
                  onChange={(e) => setEstimate(prev => ({ ...prev, clientAddress: e.target.value }))}
                  placeholder="123 Main Street, City, State 12345"
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        );

      case 'project':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Describe the project and scope of work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="projectDescription">Project Description *</Label>
                <div className="relative mt-1">
                  <Textarea
                    id="projectDescription"
                    value={estimate.projectDescription}
                    onChange={(e) => setEstimate(prev => ({ ...prev, projectDescription: e.target.value }))}
                    placeholder="Describe the project in detail..."
                    className="min-h-[150px] pr-12"
                  />
                  <div className="absolute top-2 right-2">
                    <ProjectDescriptionEnhancer
                      originalText={estimate.projectDescription}
                      onTextEnhanced={(enhancedDescription) => 
                        setEstimate(prev => ({ ...prev, projectDescription: enhancedDescription }))
                      }
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the AI enhancer to translate and improve your description with professional formatting
                </p>
              </div>
            </CardContent>
          </Card>
        );

      case 'items':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Items & Pricing</CardTitle>
              <CardDescription>Add materials, labor, and other costs</CardDescription>
              <Button onClick={addItem} className="w-fit">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {estimate.items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items added yet. Click "Add Item" to get started.</p>
                  </div>
                ) : (
                  estimate.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium">Item {index + 1}</h4>
                        <Button
                          onClick={() => removeItem(item.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Item Name *</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                            placeholder="Cedar fence panels"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder="6ft cedar privacy panels"
                            className="mt-1"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>Quantity *</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Unit</Label>
                          <Select 
                            value={item.unit} 
                            onValueChange={(value) => updateItem(item.id, 'unit', value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unit">Unit</SelectItem>
                              <SelectItem value="ft">Feet</SelectItem>
                              <SelectItem value="sqft">Sq Ft</SelectItem>
                              <SelectItem value="hours">Hours</SelectItem>
                              <SelectItem value="days">Days</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Unit Price *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <Label>Total</Label>
                          <div className="mt-1 px-3 py-2 bg-muted rounded-md font-medium">
                            ${item.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {estimate.items.length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>${estimate.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (10%):</span>
                      <span>${estimate.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${estimate.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'review':
        return (
          <Card>
            <CardHeader>
              <CardTitle>Review & Send</CardTitle>
              <CardDescription>Review your estimate before sending</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Client Information</h3>
                    <p><strong>Name:</strong> {estimate.clientName}</p>
                    <p><strong>Email:</strong> {estimate.clientEmail}</p>
                    <p><strong>Phone:</strong> {estimate.clientPhone}</p>
                    <p><strong>Address:</strong> {estimate.clientAddress}</p>
                  </div>
                  
                  <div className="border rounded-md p-4">
                    <h3 className="font-medium mb-2">Project Details</h3>
                    <p><strong>Title:</strong> {estimate.title}</p>
                    <p><strong>Description:</strong> {estimate.projectDescription}</p>
                  </div>
                </div>
                
                <div className="border rounded-md p-4">
                  <h3 className="font-medium mb-2">Pricing Summary</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Items ({estimate.items.length}):</span>
                      <span>${estimate.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${estimate.tax.toFixed(2)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Total:</span>
                      <span>${estimate.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={estimate.notes}
                  onChange={(e) => setEstimate(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any terms, conditions, or additional notes"
                  className="min-h-[100px] mt-1"
                />
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className=" flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      {renderMobileHeader()}
      
      {/* Mobile Progress */}
      {renderMobileProgress()}
      
      {/* Desktop Sidebar */}
      {renderDesktopSidebar()}
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="page-container">
          <div className="container mx-auto max-w-4xl">
            <div className="mb-4 md:mb-6 hidden md:block">
              <h1 className="text-xl md:text-2xl font-bold">Create New Estimate</h1>
              <p className="text-sm md:text-base text-muted-foreground">Generate a professional estimate for your client</p>
            </div>

            <div className="w-full">
              {renderMainContent()}
            </div>
          </div>
        </div>
        
        {/* Navigation Buttons - Mobile Optimized */}
        <div className="border-t border-border p-4 md:p-6 bg-card">
          <div className="flex justify-between gap-3">
            <Button 
              onClick={prevStep} 
              disabled={currentStep === 'client'}
              variant="outline"
              className="flex-1 md:flex-none"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button 
              onClick={nextStep} 
              disabled={currentStep === 'review'}
              className="flex-1 md:flex-none"
            >
              {currentStep === 'review' ? 'Complete' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Mobile Action Buttons Floating */}
      <div className="md:hidden fixed bottom-20 right-4 flex flex-col gap-2 z-50">
        <Button 
          onClick={saveEstimate} 
          disabled={isSaving}
          size="sm"
          variant="outline"
          className="bg-background border-2 shadow-lg"
        >
          <Save className="h-4 w-4" />
        </Button>
        
        <Button 
          onClick={generatePreview}
          disabled={estimate.items.length === 0}
          size="sm"
          className="shadow-lg"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </div>

      {/* Client Selection Dialog */}
      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Existing Client</DialogTitle>
          </DialogHeader>
          
          <div className="relative flex-shrink-0 mb-4">
            <Search className="absolute top-3 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email or phone"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-10 pr-10"
            />
            {clientSearch && (
              <Button
                onClick={() => setClientSearch('')}
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <div className="flex-1 ">
            {loadingClients ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">Loading clients...</div>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {clients.length === 0 ? 'No clients found' : 'No clients match your search'}
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-[360px]">
                  {/* Mostrar solo los primeros 3 clientes */}
                  {filteredClients.slice(0, 3).map((client: ClientType) => (
                    <div
                      key={client.id}
                      onClick={() => loadExistingClient(client)}
                      className="p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{client.name}</h4>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          <p className="text-sm text-muted-foreground">{client.phone}</p>
                          {client.address && (
                            <p className="text-sm text-muted-foreground mt-1">{client.address}</p>
                          )}
                        </div>
                        <Button size="sm" variant="ghost">
                          Select
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Mostrar indicador de más clientes si hay más de 3 */}
                {filteredClients.length > 3 && (
                  <div className="mt-3 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {filteredClients.length - 3} more clients available
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const dialog = document.querySelector('.');
                          if (dialog) dialog.scrollTop = 0;
                        }}
                      >
                        Ver desde el inicio
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const dialog = document.querySelector('.');
                          if (dialog) dialog.scrollTop = dialog.scrollHeight;
                        }}
                      >
                        Ver más clientes
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Login Dialog */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Login to Access Your Contacts</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Apple Login Button */}
            <Button 
              onClick={handleAppleLogin}
              disabled={loginLoading}
              className="w-full bg-black hover:bg-gray-800 text-white"
            >
              {loginLoading ? 'Signing in...' : 'Continue with Apple'}
            </Button>

            {/* Google Login Button */}
            <Button 
              onClick={handleGoogleLogin}
              disabled={loginLoading}
              className="w-full"
              variant="outline"
            >
              {loginLoading ? 'Signing in...' : 'Continue with Google'}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Login */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="mt-1"
                />
              </div>
              
              <Button 
                onClick={handleEmailLogin}
                disabled={loginLoading}
                className="w-full"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
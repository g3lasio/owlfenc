import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { 
  Calculator, FileText, CreditCard, CheckCircle, Clock, 
  ArrowRight, DollarSign, Users, Calendar, Send, 
  Apple, Smartphone, Mail, Receipt, Star
} from 'lucide-react';

// 🔧 FIX: Safe Stripe loading with error handling
const getStripePromise = () => {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
  
  if (!stripeKey) {
    console.warn('🔧 [STRIPE-FIX] VITE_STRIPE_PUBLIC_KEY not found - Stripe payments disabled');
    return null;
  }
  
  try {
    return loadStripe(stripeKey);
  } catch (error) {
    console.warn('🔧 [STRIPE-FIX] Failed to load Stripe.js:', error);
    return null;
  }
};

const stripePromise = getStripePromise();

interface QuickFlowData {
  // Client Info
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  projectAddress: string;
  
  // Project Details
  projectType: string;
  description: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  
  // Estimate
  materials: number;
  labor: number;
  permits: number;
  additional: number;
  total: number;
  
  // Payment
  depositPercentage: number;
  depositAmount: number;
  finalAmount: number;
}

interface PaymentFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ clientSecret, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
      redirect: 'if_required'
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Payment Successful!",
        description: "Deposit received. Project scheduled successfully.",
      });
      onSuccess();
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || processing} 
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {processing ? 'Processing...' : 'Pay Deposit Now'}
      </Button>
    </form>
  );
};

const QuickProjectFlow: React.FC = () => {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [projectId, setProjectId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<QuickFlowData>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    projectAddress: '',
    projectType: 'roofing',
    description: '',
    urgency: 'normal',
    materials: 0,
    labor: 0,
    permits: 0,
    additional: 0,
    total: 0,
    depositPercentage: 50,
    depositAmount: 0,
    finalAmount: 0,
  });

  // Calculate totals whenever costs change
  useEffect(() => {
    const total = formData.materials + formData.labor + formData.permits + formData.additional;
    const depositAmount = (total * formData.depositPercentage) / 100;
    const finalAmount = total - depositAmount;
    
    setFormData(prev => ({
      ...prev,
      total,
      depositAmount,
      finalAmount,
    }));
  }, [formData.materials, formData.labor, formData.permits, formData.additional, formData.depositPercentage]);

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/projects', data);
      return response.json();
    },
    onSuccess: (data) => {
      setProjectId(data.id);
      toast({
        title: "Project Created",
        description: "Moving to contract generation...",
      });
      setCurrentStep(3);
    },
  });

  // Create contract mutation
  const createContractMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/contracts/generate', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Contract Generated",
        description: "Ready for payment collection...",
      });
      setCurrentStep(4);
    },
  });

  // Create payment intent mutation
  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/contractor-payments/payments', data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.data.clientSecret) {
        setClientSecret(data.data.clientSecret);
        setShowPaymentModal(true);
      }
    },
  });

  const handleEstimateSubmit = () => {
    if (formData.total === 0) {
      toast({
        title: "Complete Estimate",
        description: "Please add project costs to continue",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep(2);
  };

  const handleProjectCreation = () => {
    const projectData = {
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      address: formData.projectAddress,
      description: formData.description,
      projectType: formData.projectType,
      totalPrice: Math.round(formData.total * 100), // Convert to cents
      status: 'active',
      urgency: formData.urgency,
    };

    createProjectMutation.mutate(projectData);
  };

  const handleContractGeneration = () => {
    if (!projectId) return;

    const contractData = {
      projectId,
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      projectAddress: formData.projectAddress,
      projectType: formData.projectType,
      totalAmount: formData.total,
      depositAmount: formData.depositAmount,
      description: formData.description,
    };

    createContractMutation.mutate(contractData);
  };

  const handlePaymentSetup = () => {
    if (!projectId) return;

    const paymentData = {
      projectId,
      amount: Math.round(formData.depositAmount * 100), // Convert to cents
      type: 'deposit',
      description: `Deposit for ${formData.projectType} project`,
      clientEmail: formData.clientEmail,
      clientName: formData.clientName,
      createIntent: true, // Flag to create payment intent for immediate payment
    };

    createPaymentMutation.mutate(paymentData);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setCurrentStep(5);
    queryClient.invalidateQueries({ queryKey: ['/api/contractor-payments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
  };

  const handleSendPaymentLink = async () => {
    try {
      const response = await apiRequest('POST', '/api/contractor-payments/payments', {
        projectId,
        amount: Math.round(formData.depositAmount * 100),
        type: 'deposit',
        description: `Deposit for ${formData.projectType} project`,
        clientEmail: formData.clientEmail,
        clientName: formData.clientName,
        sendLink: true,
      });

      toast({
        title: "Payment Link Sent",
        description: `Payment link sent to ${formData.clientEmail}`,
      });
      setCurrentStep(5);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send payment link",
        variant: "destructive",
      });
    }
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setProjectId(null);
    setClientSecret('');
    setFormData({
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      projectAddress: '',
      projectType: 'roofing',
      description: '',
      urgency: 'normal',
      materials: 0,
      labor: 0,
      permits: 0,
      additional: 0,
      total: 0,
      depositPercentage: 50,
      depositAmount: 0,
      finalAmount: 0,
    });
  };

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Quick Project Flow</h1>
          <p className="text-muted-foreground">From estimate to payment in under 10 minutes</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { step: 1, icon: Calculator, label: 'Estimate' },
              { step: 2, icon: FileText, label: 'Project' },
              { step: 3, icon: FileText, label: 'Contract' },
              { step: 4, icon: CreditCard, label: 'Payment' },
              { step: 5, icon: CheckCircle, label: 'Complete' },
            ].map(({ step, icon: Icon, label }, index) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step 
                    ? 'bg-primary border-primary text-primary-foreground' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="ml-2 text-sm font-medium">{label}</span>
                {index < 4 && <ArrowRight className="w-4 h-4 mx-4 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Quick Estimate */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Quick Estimate Generator
              </CardTitle>
              <CardDescription>Create an instant estimate while talking to your client</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="clientEmail">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                    placeholder="john@email.com"
                  />
                </div>
                <div>
                  <Label htmlFor="clientPhone">Phone Number</Label>
                  <Input
                    id="clientPhone"
                    value={formData.clientPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, clientPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <Label htmlFor="projectAddress">Project Address</Label>
                  <Input
                    id="projectAddress"
                    value={formData.projectAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectAddress: e.target.value }))}
                    placeholder="123 Main St, City, State"
                  />
                </div>
              </div>

              {/* Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Select value={formData.projectType} onValueChange={(value) => setFormData(prev => ({ ...prev, projectType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roofing">Roofing</SelectItem>
                      <SelectItem value="siding">Siding</SelectItem>
                      <SelectItem value="windows">Windows</SelectItem>
                      <SelectItem value="flooring">Flooring</SelectItem>
                      <SelectItem value="electrical">Electrical</SelectItem>
                      <SelectItem value="plumbing">Plumbing</SelectItem>
                      <SelectItem value="renovation">Renovation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="urgency">Project Urgency</Label>
                  <Select value={formData.urgency} onValueChange={(value: any) => setFormData(prev => ({ ...prev, urgency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the project details..."
                  rows={3}
                />
              </div>

              {/* Cost Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="materials">Materials ($)</Label>
                  <Input
                    id="materials"
                    type="number"
                    value={formData.materials}
                    onChange={(e) => setFormData(prev => ({ ...prev, materials: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="labor">Labor ($)</Label>
                  <Input
                    id="labor"
                    type="number"
                    value={formData.labor}
                    onChange={(e) => setFormData(prev => ({ ...prev, labor: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="permits">Permits ($)</Label>
                  <Input
                    id="permits"
                    type="number"
                    value={formData.permits}
                    onChange={(e) => setFormData(prev => ({ ...prev, permits: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="additional">Additional ($)</Label>
                  <Input
                    id="additional"
                    type="number"
                    value={formData.additional}
                    onChange={(e) => setFormData(prev => ({ ...prev, additional: parseFloat(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Estimate Summary */}
              <div className="bg-muted p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Total Project Cost:</span>
                  <span className="text-2xl font-bold text-primary">
                    ${formData.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Deposit (50%):</span>
                  <span>${formData.depositAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Final Payment:</span>
                  <span>${formData.finalAmount.toLocaleString()}</span>
                </div>
              </div>

              <Button onClick={handleEstimateSubmit} className="w-full" size="lg">
                Continue to Project Creation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Project Creation */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Project Summary
              </CardTitle>
              <CardDescription>Review and create project</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Client Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Name:</strong> {formData.clientName}</p>
                    <p><strong>Email:</strong> {formData.clientEmail}</p>
                    <p><strong>Phone:</strong> {formData.clientPhone}</p>
                    <p><strong>Address:</strong> {formData.projectAddress}</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Project Details</h3>
                  <div className="space-y-1 text-sm">
                    <p><strong>Type:</strong> {formData.projectType}</p>
                    <p><strong>Urgency:</strong> {formData.urgency}</p>
                    <p><strong>Total Cost:</strong> ${formData.total.toLocaleString()}</p>
                    <p><strong>Deposit:</strong> ${formData.depositAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex space-x-4">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back to Edit
                </Button>
                <Button 
                  onClick={handleProjectCreation} 
                  disabled={createProjectMutation.isPending}
                  className="flex-1"
                >
                  {createProjectMutation.isPending ? 'Creating Project...' : 'Create Project & Generate Contract'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Contract Generation */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Contract Generation
              </CardTitle>
              <CardDescription>Generating professional contract</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="text-muted-foreground">Generating contract with project details...</p>
              </div>

              <Button 
                onClick={handleContractGeneration} 
                disabled={createContractMutation.isPending}
                className="w-full"
              >
                {createContractMutation.isPending ? 'Generating Contract...' : 'Generate Contract'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Payment Collection */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="mr-2 h-5 w-5" />
                Collect Deposit Payment
              </CardTitle>
              <CardDescription>Choose payment method for ${formData.depositAmount.toLocaleString()} deposit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  onClick={handlePaymentSetup}
                  className="h-20 bg-blue-600 hover:bg-blue-700"
                  disabled={createPaymentMutation.isPending}
                >
                  <div className="text-center">
                    <CreditCard className="mx-auto mb-2 h-6 w-6" />
                    <div className="text-sm">Pay with Card</div>
                    <div className="text-xs opacity-75">Instant payment</div>
                  </div>
                </Button>

                <Button 
                  onClick={handleSendPaymentLink}
                  variant="outline"
                  className="h-20"
                >
                  <div className="text-center">
                    <Send className="mx-auto mb-2 h-6 w-6" />
                    <div className="text-sm">Send Payment Link</div>
                    <div className="text-xs opacity-75">Email to client</div>
                  </div>
                </Button>

                <Button 
                  onClick={() => setCurrentStep(5)}
                  variant="outline"
                  className="h-20"
                >
                  <div className="text-center">
                    <Receipt className="mx-auto mb-2 h-6 w-6" />
                    <div className="text-sm">Record Cash Payment</div>
                    <div className="text-xs opacity-75">Mark as paid</div>
                  </div>
                </Button>
              </div>

              {/* Payment Modal */}
              <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Complete Payment</DialogTitle>
                    <DialogDescription>
                      Deposit payment of ${formData.depositAmount.toLocaleString()}
                    </DialogDescription>
                  </DialogHeader>
                  {clientSecret && (
                    stripePromise ? (
                      <Elements stripe={stripePromise} options={{ clientSecret }}>
                        <PaymentForm clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
                      </Elements>
                    ) : (
                      <div className="text-center py-8 px-4 border rounded-lg bg-yellow-50">
                        <div className="text-yellow-600 mb-2">⚠️ Payment System Unavailable</div>
                        <p className="text-sm text-gray-600">
                          Stripe payment processing is currently unavailable. Please contact support or try again later.
                        </p>
                        <Button 
                          onClick={() => setShowPaymentModal(false)} 
                          variant="outline" 
                          className="mt-4"
                        >
                          Close
                        </Button>
                      </div>
                    )
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Success */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-green-600">
                <CheckCircle className="mr-2 h-5 w-5" />
                Project Successfully Created!
              </CardTitle>
              <CardDescription>Ready to start work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">All Set!</h3>
                <p className="text-muted-foreground mb-4">
                  Project created, contract generated, and deposit collected.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
                  <div className="text-center">
                    <Badge className="mb-2">Project #{projectId}</Badge>
                    <p className="text-sm">Created</p>
                  </div>
                  <div className="text-center">
                    <Badge variant="outline" className="mb-2">Contract</Badge>
                    <p className="text-sm">Generated</p>
                  </div>
                  <div className="text-center">
                    <Badge className="bg-green-500 mb-2">Payment</Badge>
                    <p className="text-sm">Collected</p>
                  </div>
                </div>
              </div>

              <div className="flex space-x-4">
                <Button onClick={resetFlow} variant="outline" className="flex-1">
                  Start New Project
                </Button>
                <Button onClick={() => window.location.href = '/projects'} className="flex-1">
                  View All Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default QuickProjectFlow;
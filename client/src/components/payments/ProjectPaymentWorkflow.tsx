import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  LinkIcon,
  Mail,
  Zap,
  BookOpen,
  Smartphone,
  Banknote,
  Calculator,
  Send,
  Copy,
  ExternalLink,
  Eye,
  QrCode,
  MessageSquare,
  Download,
  Save,
  Home,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
type Project = {
  id: string | number;
  userId: string;
  projectId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  address: string;
  projectType?: string;
  projectSubtype?: string;
  projectCategory?: string;
  projectDescription?: string;
  projectScope?: string;
  estimateHtml?: string;
  contractHtml?: string;
  totalPrice?: number;
  status?: string;
  projectProgress?: string;
  paymentStatus?: string;
  paymentDetails?: any;
  createdAt: string;
  updatedAt: string;
};

type ProjectPayment = {
  id: number;
  projectId: number;
  userId: number;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  stripePaymentLinkId?: string;
  amount: number;
  type: "deposit" | "final" | "milestone" | "additional";
  status: "pending" | "succeeded" | "failed" | "canceled" | "expired";
  paymentMethod?: string;
  receiptUrl?: string;
  invoiceUrl?: string;
  checkoutUrl?: string;
  paymentLinkUrl?: string;
  clientEmail?: string;
  clientName?: string;
  invoiceNumber?: string;
  description?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  paymentDate?: string;
  sentDate?: string;
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
};

type PaymentMethodType = "terminal" | "link" | "manual" | null;
type WorkflowMode = "express" | "guided";

// Express mode steps
type ExpressStep = "quick-payment" | "confirm-share";

// Guided mode steps
type GuidedStep = "method" | "project-amount" | "details" | "execute";

interface ProjectPaymentWorkflowProps {
  projects: Project[] | undefined;
  payments: ProjectPayment[] | undefined;
  onCreatePayment: (paymentData: any) => Promise<any>;
  onSendInvoice: (paymentData: any) => void;
  isCreatingPayment: boolean;
}

export default function ProjectPaymentWorkflow({
  projects,
  payments,
  onCreatePayment,
  onSendInvoice,
  isCreatingPayment,
}: ProjectPaymentWorkflowProps) {
  const { toast } = useToast();
  
  // Mode state
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>("express");
  
  // Step states
  const [expressStep, setExpressStep] = useState<ExpressStep>("quick-payment");
  const [guidedStep, setGuidedStep] = useState<GuidedStep>("method");
  
  // Payment data state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [visibleProjects, setVisibleProjects] = useState<number>(3);
  const [useExistingProject, setUseExistingProject] = useState<boolean>(true);
  
  const [paymentConfig, setPaymentConfig] = useState({
    amount: "",
    type: "deposit" as "deposit" | "final" | "milestone" | "custom",
    description: "",
    clientEmail: "",
    clientName: "",
    clientPhone: "",
    dueDate: "",
    // Manual payment specific
    manualMethod: "cash" as "cash" | "check" | "zelle" | "venmo" | "other",
    referenceNumber: "",
    paymentDate: new Date().toISOString().split('T')[0],
    notes: "",
    // Email settings
    autoSendEmail: true,
  });
  
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [isDraft, setIsDraft] = useState<boolean>(false);
  
  // Smart defaults - remember last used method
  useEffect(() => {
    const lastMethod = localStorage.getItem("lastPaymentMethod");
    if (lastMethod && (lastMethod === "terminal" || lastMethod === "link" || lastMethod === "manual")) {
      setPaymentMethod(lastMethod as PaymentMethodType);
    }
  }, []);

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const calculateSuggestedAmount = (project: Project, type: string) => {
    const total = project.totalPrice || 0;
    if (type === "deposit") return total * 0.5;
    if (type === "final") return total * 0.5;
    return total;
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setPaymentConfig({
      ...paymentConfig,
      clientEmail: project.clientEmail || "",
      clientName: project.clientName || "",
      clientPhone: project.clientPhone || "",
      amount: calculateSuggestedAmount(project, paymentConfig.type).toString(),
      description: `${paymentConfig.type === "custom" ? "Payment" : paymentConfig.type} for ${project.projectType || "project"}`,
    });
  };

  const handleMethodSelect = (method: PaymentMethodType) => {
    setPaymentMethod(method);
    if (method) {
      localStorage.setItem("lastPaymentMethod", method);
    }
    
    // In express mode, auto-advance
    if (workflowMode === "express") {
      // Quick validation for express mode
      if (!paymentConfig.amount) {
        toast({
          title: "Amount required",
          description: "Please enter a payment amount",
          variant: "destructive",
        });
        return;
      }
    } else {
      // In guided mode, move to next step
      setGuidedStep("project-amount");
    }
  };

  const handleCreatePayment = async () => {
    // Validation
    if (!paymentConfig.amount || parseFloat(paymentConfig.amount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === "link" && !paymentConfig.clientEmail) {
      toast({
        title: "Email required",
        description: "Client email is required for payment links",
        variant: "destructive",
      });
      return;
    }

    const paymentData = {
      projectId: selectedProject?.id || null,
      amount: parseFloat(paymentConfig.amount) * 100, // Convert to cents
      type: paymentConfig.type,
      description: paymentConfig.description,
      clientEmail: paymentConfig.clientEmail,
      clientName: paymentConfig.clientName,
      clientPhone: paymentConfig.clientPhone,
      dueDate: paymentConfig.dueDate || undefined,
      paymentMethod: paymentMethod,
      // Manual payment specific
      ...(paymentMethod === "manual" && {
        manualMethod: paymentConfig.manualMethod,
        referenceNumber: paymentConfig.referenceNumber,
        paymentDate: paymentConfig.paymentDate,
        notes: paymentConfig.notes,
      }),
    };

    try {
      // Await the backend response to capture the generated link
      const result = await onCreatePayment(paymentData);
      
      console.log("💳 [PAYMENT-WORKFLOW] Payment created:", result);
      
      // Extract the payment link URL from the correct response structure
      let extractedLink = "";
      
      if (result?.data?.paymentLinkUrl) {
        extractedLink = result.data.paymentLinkUrl;
        console.log("✅ [PAYMENT-WORKFLOW] Link from data.paymentLinkUrl:", extractedLink);
      } else if (result?.paymentLinkUrl) {
        extractedLink = result.paymentLinkUrl;
        console.log("✅ [PAYMENT-WORKFLOW] Link from paymentLinkUrl:", extractedLink);
      } else if (result?.data?.checkoutUrl) {
        extractedLink = result.data.checkoutUrl;
        console.log("✅ [PAYMENT-WORKFLOW] Link from data.checkoutUrl:", extractedLink);
      } else if (result?.checkoutUrl) {
        extractedLink = result.checkoutUrl;
        console.log("✅ [PAYMENT-WORKFLOW] Link from checkoutUrl:", extractedLink);
      }
      
      // For payment link method, MUST have a link - block progression if missing
      if (paymentMethod === "link" && !extractedLink) {
        console.error("❌ [PAYMENT-WORKFLOW] Payment link method but no URL received");
        toast({
          title: "Link generation failed",
          description: "Payment link could not be generated. Please try again.",
          variant: "destructive",
        });
        return; // Block advancement - stay on current step
      }
      
      // Update the generated link state
      if (extractedLink) {
        setGeneratedLink(extractedLink);
      }
      
      // Move to confirmation/execute step only after successful creation
      if (workflowMode === "express") {
        setExpressStep("confirm-share");
      } else {
        setGuidedStep("execute");
      }
      
      // Success toast
      toast({
        title: "Success!",
        description: paymentMethod === "terminal" 
          ? "Terminal payment ready" 
          : paymentMethod === "link"
          ? "Payment link created successfully"
          : "Payment registered successfully",
      });
      
    } catch (error: any) {
      console.error("❌ [PAYMENT-WORKFLOW] Error creating payment:", error);
      toast({
        title: "Payment creation failed",
        description: error?.message || "Please try again or contact support",
        variant: "destructive",
      });
      // Don't advance to next step on error
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    });
  };

  const sendPaymentEmail = () => {
    const emailData = {
      projectName: selectedProject?.projectType || "Project",
      clientName: paymentConfig.clientName,
      clientEmail: paymentConfig.clientEmail,
      totalAmount: parseFloat(paymentConfig.amount),
      paymentLink: generatedLink,
    };

    onSendInvoice(emailData);
    toast({
      title: "Email sent!",
      description: `Payment link sent to ${paymentConfig.clientEmail}`,
    });
  };

  const shareViaWhatsApp = () => {
    const message = `Hi ${paymentConfig.clientName}, here's your payment link: ${generatedLink}`;
    const url = `https://wa.me/${paymentConfig.clientPhone?.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const shareViaSMS = () => {
    const message = `Hi ${paymentConfig.clientName}, here's your payment link: ${generatedLink}`;
    const url = `sms:${paymentConfig.clientPhone}?body=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const saveDraft = () => {
    setIsDraft(true);
    toast({
      title: "Draft saved",
      description: "Your payment draft has been saved",
    });
  };

  const resetWorkflow = () => {
    setExpressStep("quick-payment");
    setGuidedStep("method");
    setSelectedProject(null);
    setPaymentMethod(null);
    setPaymentConfig({
      amount: "",
      type: "deposit",
      description: "",
      clientEmail: "",
      clientName: "",
      clientPhone: "",
      dueDate: "",
      manualMethod: "cash",
      referenceNumber: "",
      paymentDate: new Date().toISOString().split('T')[0],
      notes: "",
      autoSendEmail: true,
    });
    setGeneratedLink("");
    setIsDraft(false);
    setUseExistingProject(true);
  };

  // Breadcrumb navigation
  const getBreadcrumbs = () => {
    if (workflowMode === "express") {
      return [
        { label: "Quick Payment", step: "quick-payment", active: expressStep === "quick-payment" },
        { label: "Confirm & Share", step: "confirm-share", active: expressStep === "confirm-share" },
      ];
    } else {
      return [
        { label: "Method", step: "method", active: guidedStep === "method" },
        { label: "Project & Amount", step: "project-amount", active: guidedStep === "project-amount" },
        { label: "Details", step: "details", active: guidedStep === "details" },
        { label: "Execute", step: "execute", active: guidedStep === "execute" },
      ];
    }
  };

  const handleBreadcrumbClick = (step: string) => {
    if (workflowMode === "express") {
      setExpressStep(step as ExpressStep);
    } else {
      setGuidedStep(step as GuidedStep);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-8">
            <Button
              onClick={() => {
                setWorkflowMode("express");
                resetWorkflow();
              }}
              variant={workflowMode === "express" ? "default" : "outline"}
              className={workflowMode === "express" 
                ? "bg-cyan-400 text-black hover:bg-cyan-300" 
                : "bg-gray-800 border-gray-600 text-white hover:bg-gray-700"}
              data-testid="button-express-mode"
            >
              <Zap className="h-4 w-4 mr-2" />
              ⚡ Express Mode
            </Button>
            <Button
              onClick={() => {
                setWorkflowMode("guided");
                resetWorkflow();
              }}
              variant={workflowMode === "guided" ? "default" : "outline"}
              className={workflowMode === "guided" 
                ? "bg-cyan-400 text-black hover:bg-cyan-300" 
                : "bg-gray-800 border-gray-600 text-white hover:bg-gray-700"}
              data-testid="button-guided-mode"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              📋 Guided Mode
            </Button>
          </div>
          <p className="text-center text-gray-400 text-sm mt-3">
            {workflowMode === "express" 
              ? "Fast track for quick payments (2 steps)" 
              : "Complete workflow with full documentation (4 steps)"}
          </p>
        </CardContent>
      </Card>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="ghost"
          size="sm"
          onClick={resetWorkflow}
          className="text-gray-400 hover:text-white"
          data-testid="button-home"
        >
          <Home className="h-4 w-4" />
        </Button>
        {getBreadcrumbs().map((crumb, index) => (
          <div key={crumb.step} className="flex items-center gap-2">
            {index > 0 && <span className="text-gray-600">/</span>}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBreadcrumbClick(crumb.step)}
              className={crumb.active ? "text-cyan-400" : "text-gray-400 hover:text-white"}
              data-testid={`breadcrumb-${crumb.step}`}
            >
              {crumb.label}
            </Button>
          </div>
        ))}
        {isDraft && (
          <Badge variant="secondary" className="ml-auto">
            Draft
          </Badge>
        )}
        {!isDraft && (
          <Button
            variant="ghost"
            size="sm"
            onClick={saveDraft}
            className="ml-auto text-gray-400 hover:text-white"
            data-testid="button-save-draft"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
        )}
      </div>

      {/* EXPRESS MODE */}
      {workflowMode === "express" && (
        <>
          {/* Step 1: Quick Payment */}
          {expressStep === "quick-payment" && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Payment
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Enter amount and choose payment method
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Amount Input - Large and prominent */}
                <div className="text-center space-y-2">
                  <Label className="text-white text-lg">Payment Amount</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-8 w-8 text-cyan-400" />
                    <Input
                      type="number"
                      value={paymentConfig.amount}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, amount: e.target.value })}
                      className="bg-gray-800 border-gray-600 text-white text-4xl font-bold pl-16 py-8 text-center"
                      placeholder="0.00"
                      autoFocus
                      data-testid="input-quick-amount"
                    />
                  </div>
                </div>

                {/* Optional: Link to existing project */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <Label className="text-white text-sm mb-2 block">Link to project (optional)</Label>
                  <Select
                    value={selectedProject?.id?.toString() || ""}
                    onValueChange={(value) => {
                      const project = projects?.find(p => p.id.toString() === value);
                      if (project) handleProjectSelect(project);
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select a project..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {projects?.slice(0, 10).map((project) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.clientName} - {project.projectType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-gray-700" />

                {/* Payment Method Selection - Large Visual Buttons */}
                <div className="space-y-3">
                  <Label className="text-white text-lg">How do you want to collect payment?</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Terminal / Tap-to-Pay */}
                    <Button
                      onClick={() => handleMethodSelect("terminal")}
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3 bg-gray-800 border-2 border-gray-600 hover:border-cyan-400 hover:bg-gray-700 text-white transition-all"
                      data-testid="button-method-terminal"
                    >
                      <Smartphone className="h-12 w-12 text-cyan-400" />
                      <div className="text-center">
                        <div className="font-semibold text-lg">💳 Terminal</div>
                        <div className="text-xs text-gray-400">Tap-to-Pay</div>
                      </div>
                    </Button>

                    {/* Payment Link */}
                    <Button
                      onClick={() => handleMethodSelect("link")}
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3 bg-gray-800 border-2 border-gray-600 hover:border-cyan-400 hover:bg-gray-700 text-white transition-all"
                      data-testid="button-method-link"
                    >
                      <LinkIcon className="h-12 w-12 text-cyan-400" />
                      <div className="text-center">
                        <div className="font-semibold text-lg">🔗 Payment Link</div>
                        <div className="text-xs text-gray-400">Share via email/SMS</div>
                      </div>
                    </Button>

                    {/* Manual Payment */}
                    <Button
                      onClick={() => handleMethodSelect("manual")}
                      variant="outline"
                      className="h-32 flex flex-col items-center justify-center gap-3 bg-gray-800 border-2 border-gray-600 hover:border-cyan-400 hover:bg-gray-700 text-white transition-all"
                      data-testid="button-method-manual"
                    >
                      <Banknote className="h-12 w-12 text-cyan-400" />
                      <div className="text-center">
                        <div className="font-semibold text-lg">📝 Cash/Check</div>
                        <div className="text-xs text-gray-400">Register manual payment</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Conditional fields based on selected method */}
                {paymentMethod === "link" && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                    <Label className="text-white">Client Email (Required)</Label>
                    <Input
                      type="email"
                      value={paymentConfig.clientEmail}
                      onChange={(e) => setPaymentConfig({ ...paymentConfig, clientEmail: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="client@example.com"
                      data-testid="input-client-email"
                    />
                  </div>
                )}

                {paymentMethod === "manual" && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                    <Label className="text-white">Payment Method</Label>
                    <Select
                      value={paymentConfig.manualMethod}
                      onValueChange={(value: any) => setPaymentConfig({ ...paymentConfig, manualMethod: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="zelle">Zelle</SelectItem>
                        <SelectItem value="venmo">Venmo</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {paymentMethod && (
                  <Button
                    onClick={handleCreatePayment}
                    className="w-full bg-cyan-400 text-black hover:bg-cyan-300 py-6 text-lg font-semibold"
                    disabled={isCreatingPayment}
                    data-testid="button-create-payment-express"
                  >
                    {isCreatingPayment ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {paymentMethod === "terminal" && "Open Terminal"}
                        {paymentMethod === "link" && "Generate Payment Link"}
                        {paymentMethod === "manual" && "Register Payment"}
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Confirm & Share */}
          {expressStep === "confirm-share" && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {paymentMethod === "terminal" && "Terminal Ready"}
                  {paymentMethod === "link" && "Payment Link Created"}
                  {paymentMethod === "manual" && "Payment Registered"}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {paymentMethod === "terminal" && "Process payment with Tap-to-Pay"}
                  {paymentMethod === "link" && "Share this link with your client"}
                  {paymentMethod === "manual" && "Payment has been recorded"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Success message */}
                <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <h4 className="font-medium text-green-400">Success!</h4>
                  </div>
                  <p className="text-green-300 text-sm">
                    {paymentMethod === "terminal" && "Your terminal is ready to accept payment"}
                    {paymentMethod === "link" && `Payment link for ${formatCurrency(parseFloat(paymentConfig.amount))} is ready`}
                    {paymentMethod === "manual" && `Payment of ${formatCurrency(parseFloat(paymentConfig.amount))} has been registered`}
                  </p>
                </div>

                {/* Payment Link Actions */}
                {paymentMethod === "link" && generatedLink && (
                  <>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <Label className="text-white mb-2 block">Payment Link</Label>
                      <div className="flex gap-2">
                        <Input
                          value={generatedLink}
                          readOnly
                          className="bg-gray-700 border-gray-600 text-white"
                          data-testid="input-generated-link"
                        />
                        <Button
                          onClick={() => copyToClipboard(generatedLink)}
                          variant="outline"
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                          data-testid="button-copy-link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Share Options */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button
                        onClick={sendPaymentEmail}
                        className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                        data-testid="button-send-email"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Email
                      </Button>
                      
                      {paymentConfig.clientPhone && (
                        <>
                          <Button
                            onClick={shareViaSMS}
                            className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                            data-testid="button-send-sms"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            SMS
                          </Button>
                          
                          <Button
                            onClick={shareViaWhatsApp}
                            className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                            data-testid="button-send-whatsapp"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            WhatsApp
                          </Button>
                        </>
                      )}
                      
                      <Button
                        onClick={() => {/* QR code logic */}}
                        className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                        data-testid="button-show-qr"
                      >
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Code
                      </Button>
                      
                      <Button
                        onClick={() => window.open(generatedLink, "_blank")}
                        className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                        data-testid="button-open-link"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      
                      <Button
                        onClick={() => {/* Download PDF logic */}}
                        className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                        data-testid="button-download-pdf"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    </div>
                  </>
                )}

                {/* Terminal Action */}
                {paymentMethod === "terminal" && (
                  <Button
                    onClick={() => {
                      toast({
                        title: "Terminal Opening",
                        description: "Stripe Terminal integration would open here",
                      });
                    }}
                    className="w-full bg-cyan-400 text-black hover:bg-cyan-300 py-6 text-lg"
                    data-testid="button-open-terminal"
                  >
                    <Smartphone className="h-5 w-5 mr-2" />
                    Open Terminal Now
                  </Button>
                )}

                {/* Manual Payment Details */}
                {paymentMethod === "manual" && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium text-white mb-2">Payment Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Amount:</span>
                        <span className="text-white ml-2">{formatCurrency(parseFloat(paymentConfig.amount))}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Method:</span>
                        <span className="text-white ml-2 capitalize">{paymentConfig.manualMethod}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Date:</span>
                        <span className="text-white ml-2">{paymentConfig.paymentDate}</span>
                      </div>
                      {paymentConfig.referenceNumber && (
                        <div>
                          <span className="text-gray-400">Reference:</span>
                          <span className="text-white ml-2">{paymentConfig.referenceNumber}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={resetWorkflow}
                    className="flex-1 bg-cyan-400 text-black hover:bg-cyan-300"
                    data-testid="button-create-another"
                  >
                    Create Another Payment
                  </Button>
                  <Button
                    onClick={() => {/* View history */}}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                    data-testid="button-view-history"
                  >
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* GUIDED MODE */}
      {workflowMode === "guided" && (
        <>
          {/* Step 1: Payment Method First */}
          {guidedStep === "method" && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Choose Payment Method
                </CardTitle>
                <CardDescription className="text-gray-400">
                  How do you want to collect this payment?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Terminal */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      paymentMethod === "terminal" 
                        ? "bg-cyan-900/30 border-cyan-400 border-2" 
                        : "bg-gray-800 border-gray-600 hover:border-cyan-400"
                    }`}
                    onClick={() => setPaymentMethod("terminal")}
                    data-testid="card-method-terminal"
                  >
                    <CardContent className="pt-6 text-center space-y-3">
                      <Smartphone className="h-16 w-16 text-cyan-400 mx-auto" />
                      <h3 className="font-semibold text-white text-lg">💳 Terminal</h3>
                      <p className="text-gray-400 text-sm">
                        Accept payment with Tap-to-Pay directly from your device
                      </p>
                      {paymentMethod === "terminal" && (
                        <CheckCircle className="h-6 w-6 text-cyan-400 mx-auto" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Payment Link */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      paymentMethod === "link" 
                        ? "bg-cyan-900/30 border-cyan-400 border-2" 
                        : "bg-gray-800 border-gray-600 hover:border-cyan-400"
                    }`}
                    onClick={() => setPaymentMethod("link")}
                    data-testid="card-method-link"
                  >
                    <CardContent className="pt-6 text-center space-y-3">
                      <LinkIcon className="h-16 w-16 text-cyan-400 mx-auto" />
                      <h3 className="font-semibold text-white text-lg">🔗 Payment Link</h3>
                      <p className="text-gray-400 text-sm">
                        Generate a secure link to share via email, SMS or messaging
                      </p>
                      {paymentMethod === "link" && (
                        <CheckCircle className="h-6 w-6 text-cyan-400 mx-auto" />
                      )}
                    </CardContent>
                  </Card>

                  {/* Manual */}
                  <Card 
                    className={`cursor-pointer transition-all ${
                      paymentMethod === "manual" 
                        ? "bg-cyan-900/30 border-cyan-400 border-2" 
                        : "bg-gray-800 border-gray-600 hover:border-cyan-400"
                    }`}
                    onClick={() => setPaymentMethod("manual")}
                    data-testid="card-method-manual"
                  >
                    <CardContent className="pt-6 text-center space-y-3">
                      <Banknote className="h-16 w-16 text-cyan-400 mx-auto" />
                      <h3 className="font-semibold text-white text-lg">📝 Cash/Check</h3>
                      <p className="text-gray-400 text-sm">
                        Register a payment received via cash, check, or other methods
                      </p>
                      {paymentMethod === "manual" && (
                        <CheckCircle className="h-6 w-6 text-cyan-400 mx-auto" />
                      )}
                    </CardContent>
                  </Card>
                </div>

                {paymentMethod && (
                  <Button
                    onClick={() => setGuidedStep("project-amount")}
                    className="w-full bg-cyan-400 text-black hover:bg-cyan-300"
                    data-testid="button-next-to-project"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 2: Project & Amount */}
          {guidedStep === "project-amount" && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Project & Amount
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Link to a project or create a quick invoice
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Toggle: Existing Project vs Quick Invoice */}
                <div className="flex items-center justify-center gap-4 p-4 bg-gray-800 rounded-lg">
                  <span className={`text-sm ${useExistingProject ? "text-cyan-400 font-medium" : "text-gray-400"}`}>
                    Select Project
                  </span>
                  <Switch
                    checked={!useExistingProject}
                    onCheckedChange={(checked) => {
                      setUseExistingProject(!checked);
                      if (checked) setSelectedProject(null);
                    }}
                    data-testid="switch-project-type"
                  />
                  <span className={`text-sm ${!useExistingProject ? "text-cyan-400 font-medium" : "text-gray-400"}`}>
                    Quick Invoice
                  </span>
                </div>

                {/* Option A: Select Existing Project */}
                {useExistingProject && (
                  <div className="space-y-4">
                    <Label className="text-white">Select a Project</Label>
                    {projects && projects.length > 0 ? (
                      <div className="space-y-4">
                        <div className="grid gap-4">
                          {projects.slice(0, visibleProjects).map((project) => (
                            <div
                              key={project.id}
                              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                                selectedProject?.id === project.id
                                  ? "border-cyan-400 bg-cyan-900/20"
                                  : "border-gray-700 hover:border-cyan-400"
                              }`}
                              onClick={() => handleProjectSelect(project)}
                              data-testid={`project-item-${project.id}`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                  <h4 className="font-medium text-white">{project.clientName}</h4>
                                  <p className="text-sm text-gray-400">{project.projectType}</p>
                                  <p className="text-xs text-gray-500">{project.address}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-cyan-400">
                                    {formatCurrency(project.totalPrice || 0)}
                                  </p>
                                  <Badge
                                    variant={project.paymentStatus === "paid" ? "default" : "secondary"}
                                    className="text-xs mt-1"
                                  >
                                    {project.paymentStatus || "pending"}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {visibleProjects < projects.length && (
                          <div className="flex justify-center pt-2">
                            <Button
                              onClick={() => setVisibleProjects(prev => prev + 3)}
                              variant="outline"
                              className="bg-gray-800 border-gray-600 text-cyan-400 hover:bg-gray-700 hover:text-cyan-300"
                              data-testid="button-see-more-projects"
                            >
                              See more ({projects.length - visibleProjects} remaining)
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-gray-800 rounded-lg">
                        <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-400 mb-2">No Projects Found</h3>
                        <p className="text-gray-500 mb-4">
                          Create a quick invoice instead
                        </p>
                        <Button
                          onClick={() => setUseExistingProject(false)}
                          variant="outline"
                          className="bg-gray-700 border-gray-600 text-white"
                        >
                          Create Quick Invoice
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Option B: Quick Invoice (From Scratch) */}
                {!useExistingProject && (
                  <div className="space-y-4">
                    <Label className="text-white">Client Information</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="clientName" className="text-gray-300 text-sm">Client Name</Label>
                        <Input
                          id="clientName"
                          value={paymentConfig.clientName}
                          onChange={(e) => setPaymentConfig({ ...paymentConfig, clientName: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="John Doe"
                          data-testid="input-client-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientEmail" className="text-gray-300 text-sm">Client Email</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          value={paymentConfig.clientEmail}
                          onChange={(e) => setPaymentConfig({ ...paymentConfig, clientEmail: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="client@example.com"
                          data-testid="input-client-email-quick"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientPhone" className="text-gray-300 text-sm">Client Phone (optional)</Label>
                        <Input
                          id="clientPhone"
                          type="tel"
                          value={paymentConfig.clientPhone}
                          onChange={(e) => setPaymentConfig({ ...paymentConfig, clientPhone: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          placeholder="+1 (555) 123-4567"
                          data-testid="input-client-phone"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Separator className="bg-gray-700" />

                {/* Payment Type & Amount */}
                <div className="space-y-4">
                  <Label className="text-white">Payment Details</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="paymentType" className="text-gray-300 text-sm">Payment Type</Label>
                      <Select
                        value={paymentConfig.type}
                        onValueChange={(value: any) => {
                          setPaymentConfig({
                            ...paymentConfig,
                            type: value,
                            amount: selectedProject 
                              ? calculateSuggestedAmount(selectedProject, value).toString()
                              : paymentConfig.amount,
                          });
                        }}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="deposit">Deposit (50%)</SelectItem>
                          <SelectItem value="final">Final Payment (50%)</SelectItem>
                          <SelectItem value="milestone">Milestone Payment</SelectItem>
                          <SelectItem value="custom">Custom Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="amount" className="text-gray-300 text-sm">Amount ($)</Label>
                      <Input
                        id="amount"
                        type="number"
                        value={paymentConfig.amount}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, amount: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="0.00"
                        data-testid="input-amount-guided"
                      />
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    onClick={() => setGuidedStep("method")}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                    data-testid="button-back-to-method"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={() => setGuidedStep("details")}
                    className="bg-cyan-400 text-black hover:bg-cyan-300"
                    disabled={!paymentConfig.amount || (useExistingProject && !selectedProject)}
                    data-testid="button-next-to-details"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Details (Conditional based on method) */}
          {guidedStep === "details" && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Payment Details
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {paymentMethod === "terminal" && "Configure terminal payment settings"}
                  {paymentMethod === "link" && "Set up payment link details"}
                  {paymentMethod === "manual" && "Record manual payment information"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Common Description Field */}
                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={paymentConfig.description}
                    onChange={(e) => setPaymentConfig({ ...paymentConfig, description: e.target.value })}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Payment for fence installation project..."
                    rows={3}
                    data-testid="textarea-description"
                  />
                </div>

                {/* Terminal Specific Fields */}
                {paymentMethod === "terminal" && (
                  <div className="bg-gray-800 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Smartphone className="h-5 w-5 text-cyan-400 mt-1" />
                      <div>
                        <h4 className="font-medium text-white mb-1">Terminal Payment</h4>
                        <p className="text-gray-400 text-sm">
                          After confirming, you'll be directed to the Stripe Terminal interface to collect payment directly from the client's card.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Link Specific Fields */}
                {paymentMethod === "link" && (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dueDate" className="text-white">Due Date (Optional)</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={paymentConfig.dueDate}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, dueDate: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="input-due-date"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div>
                        <Label className="text-white">Auto-send email to client</Label>
                        <p className="text-gray-400 text-sm">Automatically send payment link via email</p>
                      </div>
                      <Switch
                        checked={paymentConfig.autoSendEmail}
                        onCheckedChange={(checked) => setPaymentConfig({ ...paymentConfig, autoSendEmail: checked })}
                        data-testid="switch-auto-send-email"
                      />
                    </div>
                  </div>
                )}

                {/* Manual Payment Specific Fields */}
                {paymentMethod === "manual" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="manualMethod" className="text-white">Payment Method Received</Label>
                        <Select
                          value={paymentConfig.manualMethod}
                          onValueChange={(value: any) => setPaymentConfig({ ...paymentConfig, manualMethod: value })}
                        >
                          <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-600">
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="zelle">Zelle</SelectItem>
                            <SelectItem value="venmo">Venmo</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="paymentDate" className="text-white">Payment Date</Label>
                        <Input
                          id="paymentDate"
                          type="date"
                          value={paymentConfig.paymentDate}
                          onChange={(e) => setPaymentConfig({ ...paymentConfig, paymentDate: e.target.value })}
                          className="bg-gray-800 border-gray-600 text-white"
                          data-testid="input-payment-date"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="referenceNumber" className="text-white">
                        Reference/Check Number (Optional)
                      </Label>
                      <Input
                        id="referenceNumber"
                        value={paymentConfig.referenceNumber}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, referenceNumber: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Check #1234 or Transaction ID"
                        data-testid="input-reference-number"
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes" className="text-white">Notes (Optional)</Label>
                      <Textarea
                        id="notes"
                        value={paymentConfig.notes}
                        onChange={(e) => setPaymentConfig({ ...paymentConfig, notes: e.target.value })}
                        className="bg-gray-800 border-gray-600 text-white"
                        placeholder="Additional notes about this payment..."
                        rows={2}
                        data-testid="textarea-notes"
                      />
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between">
                  <Button
                    onClick={() => setGuidedStep("project-amount")}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                    data-testid="button-back-to-project"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  <Button
                    onClick={handleCreatePayment}
                    className="bg-cyan-400 text-black hover:bg-cyan-300"
                    disabled={isCreatingPayment || !paymentConfig.description}
                    data-testid="button-create-payment-guided"
                  >
                    {isCreatingPayment ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {paymentMethod === "terminal" && "Open Terminal"}
                        {paymentMethod === "link" && "Generate Link"}
                        {paymentMethod === "manual" && "Register Payment"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Execute & Track */}
          {guidedStep === "execute" && (
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  {paymentMethod === "terminal" && "Terminal Active"}
                  {paymentMethod === "link" && "Payment Link Ready"}
                  {paymentMethod === "manual" && "Payment Recorded"}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {paymentMethod === "terminal" && "Process the payment with your terminal"}
                  {paymentMethod === "link" && "Your payment link is ready to share"}
                  {paymentMethod === "manual" && "Manual payment has been successfully recorded"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Success Banner */}
                <div className="bg-green-900/20 border border-green-700 p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <h4 className="font-semibold text-green-400 text-lg">Success!</h4>
                  </div>
                  <p className="text-green-300">
                    {paymentMethod === "terminal" && "Terminal is ready to accept payment"}
                    {paymentMethod === "link" && `Payment link for ${formatCurrency(parseFloat(paymentConfig.amount))} created successfully`}
                    {paymentMethod === "manual" && `Payment of ${formatCurrency(parseFloat(paymentConfig.amount))} recorded`}
                  </p>
                </div>

                {/* Payment Summary */}
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-medium text-white mb-3">Payment Summary</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-400">Amount:</span>
                      <span className="text-white ml-2 font-semibold">{formatCurrency(parseFloat(paymentConfig.amount))}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Type:</span>
                      <span className="text-white ml-2 capitalize">{paymentConfig.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Client:</span>
                      <span className="text-white ml-2">{paymentConfig.clientName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Method:</span>
                      <span className="text-white ml-2 capitalize">{paymentMethod}</span>
                    </div>
                    {selectedProject && (
                      <div className="col-span-2">
                        <span className="text-gray-400">Project:</span>
                        <span className="text-white ml-2">{selectedProject.projectType} - {selectedProject.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terminal Actions */}
                {paymentMethod === "terminal" && (
                  <Button
                    onClick={() => {
                      toast({
                        title: "Opening Terminal",
                        description: "Stripe Terminal integration opens here in production",
                      });
                    }}
                    className="w-full bg-cyan-400 text-black hover:bg-cyan-300 py-6 text-lg font-semibold"
                    data-testid="button-open-terminal-guided"
                  >
                    <Smartphone className="h-5 w-5 mr-2" />
                    Open Terminal Interface
                  </Button>
                )}

                {/* Payment Link Actions */}
                {paymentMethod === "link" && generatedLink && (
                  <>
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <Label className="text-white mb-2 block">Your Payment Link</Label>
                      <div className="flex gap-2">
                        <Input
                          value={generatedLink}
                          readOnly
                          className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                          data-testid="input-generated-link-guided"
                        />
                        <Button
                          onClick={() => copyToClipboard(generatedLink)}
                          variant="outline"
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                          data-testid="button-copy-link-guided"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-white mb-3 block">Share Payment Link</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Button
                          onClick={sendPaymentEmail}
                          className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                          data-testid="button-send-email-guided"
                        >
                          <Mail className="h-4 w-4 mr-2" />
                          Email
                        </Button>
                        
                        {paymentConfig.clientPhone && (
                          <>
                            <Button
                              onClick={shareViaSMS}
                              className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                              data-testid="button-send-sms-guided"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              SMS
                            </Button>
                            
                            <Button
                              onClick={shareViaWhatsApp}
                              className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                              data-testid="button-send-whatsapp-guided"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              WhatsApp
                            </Button>
                          </>
                        )}
                        
                        <Button
                          onClick={() => toast({ title: "QR Code", description: "QR code generator coming soon" })}
                          className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                          data-testid="button-show-qr-guided"
                        >
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Code
                        </Button>
                        
                        <Button
                          onClick={() => window.open(generatedLink, "_blank")}
                          className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                          data-testid="button-preview-link-guided"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        
                        <Button
                          onClick={() => toast({ title: "Download", description: "PDF download coming soon" })}
                          className="bg-gray-800 border border-gray-600 text-white hover:bg-gray-700"
                          data-testid="button-download-pdf-guided"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Manual Payment Confirmation */}
                {paymentMethod === "manual" && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-white">Recorded Payment Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Payment Method:</span>
                        <span className="text-white ml-2 capitalize">{paymentConfig.manualMethod}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Date Received:</span>
                        <span className="text-white ml-2">{paymentConfig.paymentDate}</span>
                      </div>
                      {paymentConfig.referenceNumber && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Reference:</span>
                          <span className="text-white ml-2">{paymentConfig.referenceNumber}</span>
                        </div>
                      )}
                      {paymentConfig.notes && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Notes:</span>
                          <p className="text-white mt-1">{paymentConfig.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                <div className="bg-cyan-900/20 border border-cyan-700 p-4 rounded-lg">
                  <h4 className="font-medium text-cyan-400 mb-2">Next Steps</h4>
                  <ul className="text-cyan-300 text-sm space-y-1">
                    {paymentMethod === "terminal" && (
                      <>
                        <li>• Process the payment with the client's card</li>
                        <li>• Payment confirmation will be sent automatically</li>
                        <li>• Funds will be deposited to your account</li>
                      </>
                    )}
                    {paymentMethod === "link" && (
                      <>
                        <li>• Share the payment link with your client</li>
                        <li>• Track payment status in Payment History</li>
                        <li>• Client receives confirmation after payment</li>
                        <li>• Funds deposited to your connected account</li>
                      </>
                    )}
                    {paymentMethod === "manual" && (
                      <>
                        <li>• Payment has been recorded in your history</li>
                        <li>• You can generate a receipt for the client</li>
                        <li>• Update project status if needed</li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={resetWorkflow}
                    className="flex-1 bg-cyan-400 text-black hover:bg-cyan-300"
                    data-testid="button-create-another-guided"
                  >
                    Create Another Payment
                  </Button>
                  <Button
                    onClick={() => {/* Navigate to history */}}
                    variant="outline"
                    className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                    data-testid="button-view-history-guided"
                  >
                    View History
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

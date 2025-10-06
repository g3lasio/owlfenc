import { useState } from "react";
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
  MapPin,
  Phone,
  User,
  Calculator,
  Send,
  Copy,
  ExternalLink,
  Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types (same as in ProjectPayments.tsx)
type Project = {
  id: string | number; // Firebase uses string IDs
  userId: string; // Firebase UID is string
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

interface ProjectPaymentWorkflowProps {
  projects: Project[] | undefined;
  payments: ProjectPayment[] | undefined;
  onCreatePayment: (paymentData: any) => void;
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
  // Workflow state
  const [currentStep, setCurrentStep] = useState<
    "select" | "configure" | "preview" | "confirmation"
  >("select");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [paymentConfig, setPaymentConfig] = useState({
    amount: "",
    type: "deposit" as "deposit" | "final" | "milestone" | "additional",
    description: "",
    clientEmail: "",
    clientName: "",
    dueDate: "",
    sendEmail: true,
  });
  const [generatedLink, setGeneratedLink] = useState<string>("");

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const calculateSuggestedAmount = (project: Project, type: string) => {
    const total = project.totalPrice ? project.totalPrice / 100 : 0;
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
      amount: calculateSuggestedAmount(project, paymentConfig.type).toString(),
      description: `${paymentConfig.type} payment for ${project.projectType} project`,
    });
    setCurrentStep("configure");
  };

  const handleCreatePayment = () => {
    if (!selectedProject) return;

    const paymentData = {
      projectId: selectedProject.id,
      amount: parseFloat(paymentConfig.amount) * 100, // Convert to cents
      type: paymentConfig.type,
      description: paymentConfig.description,
      clientEmail: paymentConfig.clientEmail,
      clientName: paymentConfig.clientName,
      dueDate: paymentConfig.dueDate || undefined,
    };

    onCreatePayment(paymentData);
    
    // CRITICAL: Use REAL payment link from backend - NO mock links
    // Payment link will be set when backend returns the actual Stripe link
    // For now, show loading state until backend provides real link
    setGeneratedLink(""); // Will be updated by backend response
    setCurrentStep("confirmation");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Payment link has been copied to your clipboard.",
    });
  };

  const sendPaymentEmail = () => {
    if (!selectedProject) return;

    const emailData = {
      projectName: selectedProject.projectType || "Project",
      clientName: paymentConfig.clientName,
      clientEmail: paymentConfig.clientEmail,
      totalAmount: parseFloat(paymentConfig.amount),
      paymentLink: generatedLink,
    };

    onSendInvoice(emailData);
  };

  const resetWorkflow = () => {
    setCurrentStep("select");
    setSelectedProject(null);
    setPaymentConfig({
      amount: "",
      type: "deposit",
      description: "",
      clientEmail: "",
      clientName: "",
      dueDate: "",
      sendEmail: true,
    });
    setGeneratedLink("");
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {["select", "configure", "preview", "confirmation"].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === step
                    ? "bg-cyan-400 text-black"
                    : index < ["select", "configure", "preview", "confirmation"].indexOf(currentStep)
                    ? "bg-cyan-400 text-black"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {index < ["select", "configure", "preview", "confirmation"].indexOf(currentStep) ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div className="w-16 h-0.5 bg-gray-700 ml-2"></div>
              )}
            </div>
          ))}
        </div>
        <Button
          onClick={resetWorkflow}
          variant="outline"
          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
        >
          Start Over
        </Button>
      </div>

      {/* Step 1: Project Selection */}
      {currentStep === "select" && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Select Project
            </CardTitle>
            <CardDescription className="text-gray-400">
              Choose a project to create a payment link for
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              console.log("💳 [WORKFLOW] Rendering projects:", {
                hasProjects: !!projects,
                count: projects?.length || 0,
                projects: projects
              });
              return null;
            })()}
            {projects && projects.length > 0 ? (
              <div className="grid gap-4">
                {projects.slice(0, 10).map((project) => (
                  <div
                    key={project.id}
                    className="p-4 border border-gray-700 rounded-lg hover:border-cyan-400 transition-colors cursor-pointer"
                    onClick={() => handleProjectSelect(project)}
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
                          className="text-xs"
                        >
                          {project.paymentStatus || "pending"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-400 mb-2">No Projects Found</h3>
                <p className="text-gray-500">
                  You don't have any projects yet. Create a project first to generate payment links.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Payment Configuration */}
      {currentStep === "configure" && selectedProject && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Configure Payment
            </CardTitle>
            <CardDescription className="text-gray-400">
              Set up payment details for {selectedProject.clientName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="paymentType" className="text-white">Payment Type</Label>
                  <Select
                    value={paymentConfig.type}
                    onValueChange={(value: any) =>
                      setPaymentConfig({
                        ...paymentConfig,
                        type: value,
                        amount: calculateSuggestedAmount(selectedProject, value).toString(),
                      })
                    }
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem value="deposit">Deposit (50%)</SelectItem>
                      <SelectItem value="final">Final Payment (50%)</SelectItem>
                      <SelectItem value="milestone">Milestone Payment</SelectItem>
                      <SelectItem value="additional">Additional Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-white">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={paymentConfig.amount}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, amount: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={paymentConfig.description}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, description: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    placeholder="Payment description"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="clientName" className="text-white">Client Name</Label>
                  <Input
                    id="clientName"
                    value={paymentConfig.clientName}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, clientName: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    placeholder="Client name"
                  />
                </div>

                <div>
                  <Label htmlFor="clientEmail" className="text-white">Client Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={paymentConfig.clientEmail}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, clientEmail: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    placeholder="client@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="dueDate" className="text-white">Due Date (Optional)</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={paymentConfig.dueDate}
                    onChange={(e) =>
                      setPaymentConfig({ ...paymentConfig, dueDate: e.target.value })
                    }
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep("select")}
                variant="outline"
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setCurrentStep("preview")}
                className="bg-cyan-400 text-black hover:bg-cyan-300"
                disabled={!paymentConfig.amount || !paymentConfig.description}
              >
                Preview
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Preview */}
      {currentStep === "preview" && selectedProject && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview Payment
            </CardTitle>
            <CardDescription className="text-gray-400">
              Review payment details before creating the link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-cyan-400 mb-2">Project Details</h4>
                  <p className="text-white">{selectedProject.clientName}</p>
                  <p className="text-gray-400">{selectedProject.projectType}</p>
                  <p className="text-gray-500 text-sm">{selectedProject.address}</p>
                </div>
                <div>
                  <h4 className="font-medium text-cyan-400 mb-2">Payment Details</h4>
                  <p className="text-white">Amount: {formatCurrency(parseFloat(paymentConfig.amount))}</p>
                  <p className="text-gray-400">Type: {paymentConfig.type}</p>
                  <p className="text-gray-400">Email: {paymentConfig.clientEmail}</p>
                </div>
              </div>
              <Separator className="bg-gray-700" />
              <div>
                <h4 className="font-medium text-cyan-400 mb-2">Description</h4>
                <p className="text-gray-400">{paymentConfig.description}</p>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                onClick={() => setCurrentStep("configure")}
                variant="outline"
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={handleCreatePayment}
                className="bg-cyan-400 text-black hover:bg-cyan-300"
                disabled={isCreatingPayment}
              >
                {isCreatingPayment ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Create Payment Link
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === "confirmation" && generatedLink && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Payment Link Created
            </CardTitle>
            <CardDescription className="text-gray-400">
              Your payment link is ready to be shared with the client
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <Label className="text-white mb-2 block">Payment Link</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="bg-gray-700 border-gray-600 text-white"
                />
                <Button
                  onClick={() => copyToClipboard(generatedLink)}
                  variant="outline"
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => window.open(generatedLink, "_blank")}
                  variant="outline"
                  className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {paymentConfig.clientEmail && (
              <div className="flex gap-4">
                <Button
                  onClick={sendPaymentEmail}
                  className="bg-cyan-400 text-black hover:bg-cyan-300"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Email to Client
                </Button>
                <Button
                  onClick={resetWorkflow}
                  variant="outline"
                  className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                >
                  Create Another Payment
                </Button>
              </div>
            )}

            <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg">
              <h4 className="font-medium text-green-400 mb-2">Next Steps</h4>
              <ul className="text-green-300 text-sm space-y-1">
                <li>• Share the payment link with your client</li>
                <li>• Monitor payment status in the Payment History tab</li>
                <li>• Client will receive confirmation email after payment</li>
                <li>• Funds will be deposited to your connected bank account</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
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
} from "lucide-react";

// Types (same as in ProjectPayments.tsx)
type Project = {
  id: number;
  userId: number;
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
  // Workflow state
  const [currentStep, setCurrentStep] = useState<
    "select" | "preview" | "payment" | "confirmation"
  >("select");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editableAmount, setEditableAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "zelle" | "link" | "card" | "ach"
  >("cash");
  const [clientEmail, setClientEmail] = useState<string>("");

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const calculatePayments = (project: Project) => {
    const totalAmount = project.totalPrice ? project.totalPrice / 100 : 0; // Convert from cents

    // Calculate paid amount from existing payments
    const projectPayments =
      payments?.filter((p) => p.projectId === project.id) || [];
    const totalPaid = projectPayments
      .filter((p) => p.status === "succeeded")
      .reduce((sum, p) => sum + p.amount / 100, 0); // Convert from cents

    const remainingBalance = totalAmount - totalPaid;
    const depositAmount = totalAmount * 0.5; // 50% deposit

    return {
      totalAmount,
      totalPaid,
      remainingBalance,
      depositAmount,
    };
  };

  // Step 1: Compact Project Selection
  const renderProjectSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Step 1: Select Project
        </CardTitle>
        <CardDescription>Choose the project to process payment</CardDescription>
      </CardHeader>
      <CardContent>
        {!projects || projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No projects available. Projects load automatically from Firebase.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Compact Project List - Show max 3 at a time */}
            <div className="max-h-80  space-y-3 border rounded-lg p-4">
              {projects.map((project) => {
                const amounts = calculatePayments(project);

                return (
                  <Card
                    key={project.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedProject?.id === project.id
                        ? "ring-2 ring-blue-500 bg-blue-50"
                        : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedProject(project);
                      setClientEmail(project.clientEmail || "");
                      setEditableAmount(amounts.depositAmount.toString());
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">
                            {project.clientName}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {project.projectType || "General Project"}
                          </p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">
                              Total:
                            </span>
                            <span className="font-medium">
                              {formatCurrency(amounts.totalAmount)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">Paid:</span>
                            <span className="text-green-600 font-medium">
                              {formatCurrency(amounts.totalPaid)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-sm text-gray-600">
                              Pending:
                            </span>
                            <span className="text-orange-600 font-medium">
                              {formatCurrency(amounts.remainingBalance)}
                            </span>
                          </div>
                          <Badge
                            variant={
                              amounts.remainingBalance > 0
                                ? "secondary"
                                : "default"
                            }
                            className="ml-auto"
                          >
                            {amounts.remainingBalance > 0
                              ? "Pending"
                              : "Completed"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Immediate Next Button - No Scrolling Required */}
            {selectedProject && (
              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Selected:{" "}
                  <span className="font-medium">
                    {selectedProject.clientName}
                  </span>
                </div>
                <Button
                  onClick={() => setCurrentStep("preview")}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continue to Review
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Step 2: Enhanced Payment Preview
  const renderPaymentPreview = () => {
    if (!selectedProject) return null;

    const amounts = calculatePayments(selectedProject);
    const previewAmount = parseFloat(editableAmount) || 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Step 2: Detailed Project Summary
          </CardTitle>
          <CardDescription>
            Review complete client information, project details and total costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Client Information Section */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg border border-cyan-400">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
              <User className="h-5 w-5 text-cyan-400" />
              Client Information
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <div>
                    <div className="text-sm text-gray-300">Full Name</div>
                    <div className="font-semibold text-lg text-white">
                      {selectedProject.clientName}
                    </div>
                  </div>
                </div>
                {selectedProject.clientEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-cyan-400" />
                    <div>
                      <div className="text-sm text-gray-300">Email</div>
                      <div className="text-sm font-medium text-white">
                        {selectedProject.clientEmail}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {selectedProject.clientPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-cyan-400" />
                    <div>
                      <div className="text-sm text-gray-300">Phone</div>
                      <div className="text-sm font-medium text-white">
                        {selectedProject.clientPhone}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-cyan-400 mt-1" />
                  <div>
                    <div className="text-sm text-gray-300">Project Address</div>
                    <div className="text-sm font-medium text-white">
                      {selectedProject.address}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Project Details Section */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg border border-cyan-400">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
              <Calculator className="h-5 w-5 text-cyan-400" />
              Project Details
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-300">Project Type</div>
                  <div className="font-semibold text-white">
                    {selectedProject.projectType || "General Project"}
                  </div>
                </div>
                {selectedProject.projectSubtype && (
                  <div>
                    <div className="text-sm text-gray-300">Style/Subtype</div>
                    <div className="font-medium text-white">
                      {selectedProject.projectSubtype}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-300">Status</div>
                  <Badge variant="default" className="bg-cyan-600 text-white">
                    {selectedProject.status === "approved"
                      ? "Approved"
                      : selectedProject.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                {selectedProject.projectDescription && (
                  <div>
                    <div className="text-sm text-gray-300">Description</div>
                    <div className="text-sm bg-gray-700 text-white p-3 rounded border border-gray-600">
                      {selectedProject.projectDescription}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Total Costs Section */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg border border-cyan-400">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2 text-white">
              <DollarSign className="h-5 w-5 text-cyan-400" />
              Total Costs
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-700 rounded-lg shadow-sm border border-cyan-500">
                <div className="text-2xl font-bold text-purple-400">
                  {formatCurrency((selectedProject.totalPrice || 0) / 100)}
                </div>
                <div className="text-sm text-gray-300">Total Cost</div>
              </div>
              <div className="text-center p-4 bg-gray-700 rounded-lg shadow-sm border border-cyan-500">
                <div className="text-2xl font-bold text-green-400">
                  {formatCurrency(amounts.totalPaid)}
                </div>
                <div className="text-sm text-gray-300">Paid</div>
              </div>
              <div className="text-center p-4 bg-gray-700 rounded-lg shadow-sm border border-cyan-500">
                <div className="text-2xl font-bold text-orange-400">
                  {formatCurrency(
                    (selectedProject.totalPrice || 0) / 100 - amounts.totalPaid,
                  )}
                </div>
                <div className="text-sm text-gray-300">Pending</div>
              </div>
              <div className="text-center p-4 bg-gray-700 rounded-lg shadow-sm border border-cyan-500">
                <div className="text-2xl font-bold text-blue-400">
                  {formatCurrency(previewAmount)}
                </div>
                <div className="text-sm text-gray-300">This Payment</div>
              </div>
            </div>
          </div>

          {/* Editable Payment Amount */}
          <div className="space-y-4 bg-gray-800 p-4 rounded-lg border border-cyan-400">
            <Label
              htmlFor="paymentAmount"
              className="text-base font-medium text-white"
            >
              Payment Amount
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-300" />
                <Input
                  id="paymentAmount"
                  type="number"
                  value={editableAmount}
                  onChange={(e) => setEditableAmount(e.target.value)}
                  className="pl-10 text-lg bg-gray-700 text-white border-gray-600"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={
                    (selectedProject.totalPrice || 0) / 100 - amounts.totalPaid
                  }
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditableAmount(amounts.depositAmount.toString())
                }
              >
                50% Deposit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setEditableAmount(amounts.remainingBalance.toString())
                }
              >
                Full Balance
              </Button>
            </div>
          </div>

          {/* Client Email for Invoice */}
          <div className="space-y-2">
            <Label htmlFor="clientEmail" className="text-base font-medium">
              Client Email (for invoice)
            </Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              className="text-base"
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setCurrentStep("select")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
            <Button
              onClick={() => setCurrentStep("payment")}
              disabled={!previewAmount || previewAmount <= 0 || !clientEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continue to Payment
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Step 3: Payment Method Selection
  const renderPaymentMethod = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Step 3: Select Payment Method
        </CardTitle>
        <CardDescription>
          Choose how you want to process the client's payment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Payment Options */}
        <div className="space-y-3">
          {/* Cash Payment */}
          <div
            className={`relative cursor-pointer transition-all duration-300 group ${
              paymentMethod === "cash"
                ? "bg-gray-900 border-cyan-400"
                : "bg-gray-800 border-gray-600 hover:border-cyan-500"
            } border-2 rounded-lg p-4`}
            onClick={() => setPaymentMethod("cash")}
          >
            {/* Cyberpunk Corner Brackets */}
            <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-cyan-400"></div>
            <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-cyan-400"></div>
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-cyan-400"></div>
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-cyan-400"></div>

            {/* Scanning Line Animation */}
            {paymentMethod === "cash" && (
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-white">Cash</h4>
                <p className="text-sm text-gray-300">
                  Record cash payment received in person
                </p>
              </div>
              <Badge className="bg-green-600 text-white border-0">
                Available
              </Badge>
            </div>
          </div>

          {/* Zelle Payment */}
          <div
            className={`relative cursor-pointer transition-all duration-300 group ${
              paymentMethod === "zelle"
                ? "bg-gray-900 border-cyan-400"
                : "bg-gray-800 border-gray-600 hover:border-cyan-500"
            } border-2 rounded-lg p-4`}
            onClick={() => setPaymentMethod("zelle")}
          >
            {/* Cyberpunk Corner Brackets */}
            <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-cyan-400"></div>
            <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-cyan-400"></div>
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-cyan-400"></div>
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-cyan-400"></div>

            {/* Scanning Line Animation */}
            {paymentMethod === "zelle" && (
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Phone className="h-8 w-8 text-blue-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-white">Zelle</h4>
                <p className="text-sm text-gray-300">
                  Instant bank transfer via Zelle
                </p>
              </div>
              <Badge className="bg-blue-600 text-white border-0">
                Available
              </Badge>
            </div>
          </div>

          {/* Payment Link */}
          <div
            className={`relative cursor-pointer transition-all duration-300 group ${
              paymentMethod === "link"
                ? "bg-gray-900 border-cyan-400"
                : "bg-gray-800 border-gray-600 hover:border-cyan-500"
            } border-2 rounded-lg p-4`}
            onClick={() => setPaymentMethod("link")}
          >
            {/* Cyberpunk Corner Brackets */}
            <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-cyan-400"></div>
            <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-cyan-400"></div>
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-cyan-400"></div>
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-cyan-400"></div>

            {/* Scanning Line Animation */}
            {paymentMethod === "link" && (
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse"></div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <LinkIcon className="h-8 w-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-white">
                  Payment Link
                </h4>
                <p className="text-sm text-gray-300">
                  Generate link for client to pay online
                </p>
              </div>
              <Badge className="bg-orange-600 text-white border-0">
                In Development
              </Badge>
            </div>
          </div>

          {/* Credit Card (Paused) */}
          <div
            className={`relative cursor-pointer transition-all duration-300 group opacity-60 ${
              paymentMethod === "card"
                ? "bg-gray-900 border-gray-500"
                : "bg-gray-800 border-gray-600 hover:border-gray-500"
            } border-2 rounded-lg p-4`}
            onClick={() => setPaymentMethod("card")}
          >
            {/* Cyberpunk Corner Brackets */}
            <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-gray-500"></div>
            <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-gray-500"></div>
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-gray-500"></div>
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-gray-500"></div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <CreditCard className="h-8 w-8 text-gray-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-gray-400">
                  Credit Card
                </h4>
                <p className="text-sm text-gray-500">
                  Card terminal (Stripe Connect)
                </p>
              </div>
              <Badge className="bg-gray-600 text-gray-300 border-0">
                Paused
              </Badge>
            </div>
          </div>

          {/* ACH (Paused) */}
          <div
            className={`relative cursor-pointer transition-all duration-300 group opacity-60 ${
              paymentMethod === "ach"
                ? "bg-gray-900 border-gray-500"
                : "bg-gray-800 border-gray-600 hover:border-gray-500"
            } border-2 rounded-lg p-4`}
            onClick={() => setPaymentMethod("ach")}
          >
            {/* Cyberpunk Corner Brackets */}
            <div className="absolute top-1 left-1 w-3 h-3 border-l-2 border-t-2 border-gray-500"></div>
            <div className="absolute top-1 right-1 w-3 h-3 border-r-2 border-t-2 border-gray-500"></div>
            <div className="absolute bottom-1 left-1 w-3 h-3 border-l-2 border-b-2 border-gray-500"></div>
            <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-gray-500"></div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Calculator className="h-8 w-8 text-gray-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-lg text-gray-400">ACH</h4>
                <p className="text-sm text-gray-500">
                  Direct ACH bank transfer
                </p>
              </div>
              <Badge className="bg-gray-600 text-gray-300 border-0">
                Paused
              </Badge>
            </div>
          </div>
        </div>

        {/* Payment Method Details */}
        {paymentMethod && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Selected Method Instructions</h5>
            {paymentMethod === "cash" && (
              <p className="text-sm text-gray-600">
                ✅ Confirm you have received the cash payment before processing.
              </p>
            )}
            {paymentMethod === "zelle" && (
              <p className="text-sm text-gray-600">
                📱 Provide your Zelle number to the client and confirm the
                transfer.
              </p>
            )}
            {paymentMethod === "link" && (
              <p className="text-sm text-gray-600">
                🔗 A secure link will be generated that you can send to the
                client via email.
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setCurrentStep("preview")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Summary
          </Button>
          <Button
            onClick={() => setCurrentStep("confirmation")}
            disabled={!paymentMethod}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Process Payment
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Step 4: Payment Confirmation
  const renderConfirmation = () => {
    if (!selectedProject || !editableAmount) return null;

    const paymentData = {
      projectId: selectedProject.id,
      amount: parseFloat(editableAmount) * 100, // Convert to cents
      clientEmail,
      clientName: selectedProject.clientName,
      paymentMethod,
      description: `${selectedProject.projectType || "Project"} - ${selectedProject.clientName}`,
      type: "deposit" as const,
    };

    const handlePaymentSubmit = () => {
      if (paymentMethod === "cash" || paymentMethod === "zelle") {
        // For cash and zelle, register the payment immediately
        onCreatePayment(paymentData);
      } else if (paymentMethod === "link") {
        // For payment links, create the link
        onCreatePayment(paymentData);
      }

      // Send invoice
      onSendInvoice({
        projectName: selectedProject.projectType || "Project",
        clientName: selectedProject.clientName,
        clientEmail: selectedProject.clientEmail || clientEmail,
        totalAmount: selectedProject.totalPrice
          ? selectedProject.totalPrice / 100
          : 0,
        paidAmount: parseFloat(editableAmount),
        remainingAmount:
          (selectedProject.totalPrice ? selectedProject.totalPrice / 100 : 0) -
          parseFloat(editableAmount),
      });
    };

    const handleStartOver = () => {
      setCurrentStep("select");
      setSelectedProject(null);
      setEditableAmount("");
      setPaymentMethod("cash");
      setClientEmail("");
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Step 4: Payment Confirmation
          </CardTitle>
          <CardDescription>
            Review and confirm all details before processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg border border-cyan-400">
            <h4 className="font-semibold text-lg mb-4 text-white">
              Payment Summary
            </h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-300">Client</div>
                  <div className="font-semibold text-white">
                    {selectedProject.clientName}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Project</div>
                  <div className="font-medium text-white">
                    {selectedProject.projectType || "General Project"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Payment Method</div>
                  <Badge className="font-medium bg-cyan-600 text-white border-0">
                    {paymentMethod === "cash"
                      ? "Cash"
                      : paymentMethod === "zelle"
                        ? "Zelle"
                        : paymentMethod === "link"
                          ? "Payment Link"
                          : paymentMethod}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-300">Payment Amount</div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatCurrency(parseFloat(editableAmount) || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-300">Invoice Email</div>
                  <div className="font-medium text-white">{clientEmail}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-gray-800 p-4 rounded-lg border border-cyan-400">
            <h5 className="font-medium text-cyan-400 mb-2">
              What will happen:
            </h5>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>✅ Payment will be registered in history</li>
              <li>📧 Invoice will be sent to client via email</li>
              <li>📊 Project status will be updated</li>
              {paymentMethod === "link" && (
                <li>🔗 Secure payment link will be generated</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep("payment")}
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Change Method
            </Button>
            <Button
              onClick={handlePaymentSubmit}
              disabled={isCreatingPayment}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isCreatingPayment ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirm Payment
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleStartOver}
              className="flex-1"
            >
              New Payment
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Main render function
  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex-wrap flex items-center justify-center space-x-4 mb-8">
        {[
          { step: "select", label: "Seleccionar", icon: DollarSign },
          { step: "preview", label: "Revisar", icon: FileText },
          { step: "payment", label: "Método", icon: CreditCard },
          { step: "confirmation", label: "Confirmar", icon: CheckCircle },
        ].map(({ step, label, icon: Icon }) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep === step
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "border-gray-300 text-gray-400"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span
              className={`ml-2 text-sm font-medium ${
                currentStep === step ? "text-blue-600" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {step !== "confirmation" && (
              <div className="w-12 h-px bg-gray-300 ml-4" />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      {currentStep === "select" && renderProjectSelection()}
      {currentStep === "preview" && renderPaymentPreview()}
      {currentStep === "payment" && renderPaymentMethod()}
      {currentStep === "confirmation" && renderConfirmation()}
    </div>
  );
}

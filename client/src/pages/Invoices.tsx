/**
 * Página principal para gestión de facturas (invoices)
 * Sistema de facturación simplificado con wizard de pasos
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/use-profile";
import { usePermissions } from "@/contexts/PermissionContext";
import axios from "axios";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Download,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Settings,
  History,
  ChevronRight,
  ChevronLeft,
  Search,
  Mail,
  Check,
  ArrowRight,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

// Types
interface SavedEstimate {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  projectType: string;
  items: any[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  createdAt: string;
  notes?: string;
}

interface InvoiceData {
  id?: string;
  estimateId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  projectType: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: "pending" | "partial" | "paid";
  dueDate: string;
  paymentTerms: number;
  createdAt: string;
  pdfUrl?: string;
}

// Wizard steps
const WIZARD_STEPS = [
  { id: 1, title: "Seleccionar Estimado", icon: FileText },
  { id: 2, title: "Ajustes de Pago", icon: DollarSign },
  { id: 3, title: "Enviar/Descargar", icon: Send },
];

const Invoices: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { profile, isLoading: profileLoading } = useProfile();
  const { hasAccess, userPlan, showUpgradeModal } = usePermissions();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState("wizard");

  // Selection state
  const [selectedEstimate, setSelectedEstimate] =
    useState<SavedEstimate | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Invoice configuration
  const [invoiceConfig, setInvoiceConfig] = useState({
    paymentTerms: 30,
    paidAmount: 0,
    projectCompleted: true,
    notes: "",
    sendEmail: false,
    recipientEmail: "",
  });

  // Load saved estimates from Firebase
  const [savedEstimates, setSavedEstimates] = useState<SavedEstimate[]>([]);
  const [loadingEstimates, setLoadingEstimates] = useState(true);
  const [invoiceHistory, setInvoiceHistory] = useState<InvoiceData[]>([]);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [emailPreviewContent, setEmailPreviewContent] = useState("");

  // Verificar permisos de invoices
  const hasInvoiceAccess = hasAccess('invoices');
  const canUseInvoices = hasInvoiceAccess;

  // Load estimates on mount
  useEffect(() => {
    if (currentUser) {
      loadSavedEstimates();
      loadInvoiceHistory();
    }
  }, [currentUser]);

  const loadSavedEstimates = async () => {
    if (!currentUser) return;

    try {
      setLoadingEstimates(true);
      console.log("🔐 Loading estimates for user:", currentUser.uid);

      // Primero intentar con la colección 'projects' que es donde se están guardando
      const projectsRef = collection(db, "projects");

      // Intentar primero con firebaseUserId
      let q = query(
        projectsRef,
        where("firebaseUserId", "==", currentUser.uid),
      );

      let snapshot = await getDocs(q);
      console.log(`📊 Found ${snapshot.size} projects with firebaseUserId`);

      // Si no hay resultados, intentar con userId
      if (snapshot.empty) {
        console.log(
          "No projects found with firebaseUserId, trying with userId...",
        );
        q = query(projectsRef, where("userId", "==", currentUser.uid));
        snapshot = await getDocs(q);
        console.log(`📊 Found ${snapshot.size} projects with userId`);
      }

      // Si todavía no hay resultados, intentar con la colección 'estimates'
      if (snapshot.empty) {
        console.log("No projects found, trying estimates collection...");
        const estimatesRef = collection(db, "estimates");
        q = query(estimatesRef, where("firebaseUserId", "==", currentUser.uid));
        snapshot = await getDocs(q);
        console.log(`📊 Found ${snapshot.size} in estimates collection`);
      }

      const estimates: SavedEstimate[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Raw estimate data from Firebase:", data);

        // Los datos vienen con campos planos, no anidados
        const clientName = data.clientName || data.client?.name || "Sin nombre";
        const clientPhone = data.clientPhone || "";

        // Verificar que el total esté en el formato correcto
        let total = data.total || 0;
        let subtotal = data.subtotal || 0;
        let discount = data.discount || 0;
        let tax = data.tax || 0;

        // Detectar si los valores están en centavos o dólares
        // Si el total es un número entero grande, probablemente está en centavos
        const isInCents = Number.isInteger(total) && total > 5000;

        if (isInCents) {
          console.warn(
            `Convirtiendo de centavos a dólares: ${total} → ${(total / 100).toFixed(2)}`,
          );
          total = total / 100;
          subtotal = subtotal / 100;
          discount = discount / 100;
          tax = tax / 100;
        }

        estimates.push({
          id: doc.id,
          clientName: clientName,
          clientEmail: data.clientEmail || data.client?.email || "",
          clientPhone: data.clientPhone || data.client?.phone || "",
          clientAddress: data.clientAddress || data.client?.address || "",
          projectType: data.projectType || "fence",
          items: data.items || [],
          subtotal: subtotal,
          discount: discount,
          tax: tax,
          total: total,
          createdAt: data.createdAt || data.date || new Date().toISOString(),
          notes: data.notes || "",
        });
      });

      // Ordenar por fecha de creación descendente
      estimates.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setSavedEstimates(estimates);
    } catch (error) {
      console.error("Error loading estimates:", error);
      toast({
        title: "Error cargando estimados",
        description: "No se pudieron cargar los estimados guardados",
        variant: "destructive",
      });
    } finally {
      setLoadingEstimates(false);
    }
  };

  const loadInvoiceHistory = async () => {
    if (!currentUser) return;

    try {
      // SEGURIDAD CRÍTICA: Solo cargar facturas del usuario autenticado
      console.log("Loading invoices for user:", currentUser.uid);

      const invoicesRef = collection(db, "invoices");
      const q = query(invoicesRef, where("userId", "==", currentUser.uid));

      const snapshot = await getDocs(q);
      const invoices: InvoiceData[] = [];

      snapshot.forEach((doc) => {
        invoices.push({
          id: doc.id,
          ...(doc.data() as InvoiceData),
        });
      });

      // Ordenar por fecha de creación descendente
      invoices.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setInvoiceHistory(invoices);
    } catch (error) {
      console.error("Error loading invoice history:", error);
    }
  };

  // Save invoice to history
  const saveInvoiceToHistory = async (invoiceData: InvoiceData) => {
    if (!currentUser) return;

    try {
      // Add invoice to Firebase collection
      const invoicesRef = collection(db, "invoices");
      await addDoc(invoicesRef, {
        ...invoiceData,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
      });

      // Update local state
      setInvoiceHistory([invoiceData, ...invoiceHistory]);

      console.log("✅ Invoice saved to history");
    } catch (error) {
      console.error("❌ Error saving invoice to history:", error);
    }
  };

  // Filter estimates based on search
  const filteredEstimates = savedEstimates.filter(
    (estimate) =>
      estimate.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estimate.projectType.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Calculate amounts
  const calculateAmounts = () => {
    if (!selectedEstimate) return { total: 0, paid: 0, balance: 0 };

    // El total ya debe estar convertido a dólares en loadEstimates()
    const total = selectedEstimate.total;
    const paid = invoiceConfig.paidAmount;
    const balance = total - paid;

    return { total, paid, balance };
  };

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
    return `INV-${year}${month}${day}-${random}`;
  };

  // Handle step navigation
  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return selectedEstimate !== null;
      case 2:
        return true; // Payment adjustments are optional
      case 3:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceedToNext() && currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle sending invoice by email
  // Generate email preview HTML
  const generateEmailPreview = () => {
    if (!selectedEstimate || !profile) return "";

    const { total, paid, balance } = calculateAmounts();
    const invoiceNumber = generateInvoiceNumber();
    const dueDate = new Date(
      Date.now() + invoiceConfig.paymentTerms * 24 * 60 * 60 * 1000,
    );

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a1a; padding: 30px; text-align: center;">
          ${profile.logo ? `<img src="${profile.logo}" alt="${profile.company}" style="max-height: 60px; margin-bottom: 10px;">` : ""}
          <h1 style="color: #ffffff; margin: 10px 0;">FACTURA</h1>
          <p style="color: #888; margin: 0;">${invoiceNumber}</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <h2 style="color: #333; margin-bottom: 20px;">Resumen de Factura</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0;"><strong>Cliente:</strong></td>
              <td>${selectedEstimate.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Proyecto:</strong></td>
              <td>${selectedEstimate.projectType}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Total:</strong></td>
              <td>$${total.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0;"><strong>Pagado:</strong></td>
              <td>$${paid.toFixed(2)}</td>
            </tr>
            <tr style="background: #e9ecef;">
              <td style="padding: 10px 0;"><strong>Balance:</strong></td>
              <td><strong>$${balance.toFixed(2)}</strong></td>
            </tr>
          </table>
        </div>
        
        <div style="padding: 20px; text-align: center; background: #2563eb;">
          <p style="color: white; margin: 10px 0;">Fecha de vencimiento: ${dueDate.toLocaleDateString("es-ES")}</p>
          <a href="#" style="display: inline-block; background: white; color: #2563eb; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Pagar Ahora
          </a>
        </div>
      </div>
    `;
  };

  const handleSendInvoiceEmail = async () => {
    if (!selectedEstimate || !profile) {
      toast({
        title: "Error",
        description: "No se pudo enviar el email. Falta información necesaria.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSendingEmail(true);

      // Prepare data for email service
      const emailData = {
        profile,
        estimate: selectedEstimate,
        invoiceConfig,
        emailConfig: {
          paymentLink: generatePaymentLink(), // You can implement this
          ccContractor: true,
        },
      };

      console.log("📧 Sending invoice email with data:", emailData);

      const response = await fetch("/api/invoice-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || "Error al enviar email");
      }

      const result = await response.json();
      console.log("✅ Invoice email sent:", result);

      toast({
        title: "¡Factura enviada!",
        description: `La factura ha sido enviada a ${selectedEstimate.clientEmail}`,
      });

      // Save invoice to history
      const invoiceNumber = generateInvoiceNumber();
      const { total, paid, balance } = calculateAmounts();

      const invoiceData: InvoiceData = {
        estimateId: selectedEstimate.id,
        invoiceNumber,
        clientName: selectedEstimate.clientName,
        clientEmail: selectedEstimate.clientEmail,
        projectType: selectedEstimate.projectType,
        totalAmount: total,
        paidAmount: paid,
        balanceAmount: balance,
        paymentStatus:
          balance === 0 ? "paid" : paid > 0 ? "partial" : "pending",
        dueDate: new Date(
          Date.now() + invoiceConfig.paymentTerms * 24 * 60 * 60 * 1000,
        ).toISOString(),
        paymentTerms: invoiceConfig.paymentTerms,
        createdAt: new Date().toISOString(),
      };

      await saveInvoiceToHistory(invoiceData);
    } catch (error) {
      console.error("❌ Error sending invoice email:", error);
      toast({
        title: "Error",
        description: "No se pudo enviar la factura por email",
        variant: "destructive",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Generate payment link (if using Stripe)
  const generatePaymentLink = () => {
    // This can be implemented with Stripe payment links
    // For now, return a placeholder
    return `https://pay.owlfence.com/invoice/${generateInvoiceNumber()}`;
  };

  // Handle invoice generation - EXACTLY like EstimatesWizard does it
  const handleGenerateInvoice = async () => {
    if (!selectedEstimate || !currentUser) return;

    // Use the exact same validation as EstimatesWizard
    if (!profile?.company) {
      toast({
        title: "Perfil Incompleto",
        description:
          "Completa el nombre de tu empresa en tu perfil antes de generar facturas.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);

      const amounts = calculateAmounts();
      const invoiceNumber = generateInvoiceNumber();

      // Calculate due date
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + invoiceConfig.paymentTerms);

      // Build invoice payload EXACTLY like EstimatesWizard does
      const invoicePayload = {
        profile: {
          company: profile.company,
          address: profile.address
            ? `${profile.address}${profile.city ? ", " + profile.city : ""}${profile.state ? ", " + profile.state : ""}${profile.zipCode ? " " + profile.zipCode : ""}`
            : "",
          phone: profile.phone || "",
          email: profile.email || currentUser?.email || "",
          website: profile.website || "",
          logo: profile.logo || "",
        },
        estimate: {
          client: {
            name: selectedEstimate.clientName,
            email: selectedEstimate.clientEmail,
            phone: selectedEstimate.clientPhone,
            address: selectedEstimate.clientAddress,
          },
          items: selectedEstimate.items,
          subtotal: selectedEstimate.subtotal,
          discountAmount: selectedEstimate.discount,
          taxRate:
            selectedEstimate.tax > 0
              ? (selectedEstimate.tax / selectedEstimate.subtotal) * 100
              : 0,
          tax: selectedEstimate.tax,
          total: selectedEstimate.total,
        },
        invoiceConfig: {
          projectCompleted: invoiceConfig.projectCompleted,
          downPaymentAmount:
            invoiceConfig.paidAmount > 0
              ? invoiceConfig.paidAmount.toString()
              : "",
          totalAmountPaid: invoiceConfig.paidAmount >= amounts.total,
        },
      };

      // Use axios EXACTLY like EstimatesWizard does
      const response = await axios.post("/api/invoice-pdf", invoicePayload, {
        responseType: "blob",
      });

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Determine payment status
      let paymentStatus: "pending" | "partial" | "paid" = "pending";
      if (amounts.paid >= amounts.total) {
        paymentStatus = "paid";
      } else if (amounts.paid > 0) {
        paymentStatus = "partial";
      }

      // Create invoice data for Firebase
      const invoiceData: InvoiceData = {
        estimateId: selectedEstimate.id,
        invoiceNumber,
        clientName: selectedEstimate.clientName,
        clientEmail: selectedEstimate.clientEmail,
        projectType: selectedEstimate.projectType,
        totalAmount: amounts.total,
        paidAmount: amounts.paid,
        balanceAmount: amounts.balance,
        paymentStatus,
        dueDate: dueDate.toISOString(),
        paymentTerms: invoiceConfig.paymentTerms,
        createdAt: new Date().toISOString(),
      };

      // Save to Firebase
      const invoicesRef = collection(db, "invoices");
      const docRef = await addDoc(invoicesRef, {
        ...invoiceData,
        userId: currentUser.uid,
        estimateData: selectedEstimate,
        notes: invoiceConfig.notes,
      });

      // Update local state
      setInvoiceHistory([{ ...invoiceData, id: docRef.id }, ...invoiceHistory]);

      toast({
        title: "Factura generada exitosamente",
        description: `Factura ${invoiceNumber} descargada correctamente`,
      });

      // Send email if requested
      if (invoiceConfig.sendEmail && invoiceConfig.recipientEmail) {
        // Email functionality can be implemented later
        toast({
          title: "Email pendiente",
          description: "La funcionalidad de email se implementará próximamente",
        });
      }

      // Reset wizard
      setTimeout(() => {
        setActiveTab("history");
        setCurrentStep(1);
        setSelectedEstimate(null);
        setInvoiceConfig({
          paymentTerms: 30,
          paidAmount: 0,
          projectCompleted: true,
          notes: "",
          sendEmail: false,
          recipientEmail: "",
        });
      }, 2000);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Error generando factura",
        description: "No se pudo generar la factura",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Render wizard steps
  const renderWizardStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-cyan-400">Seleccionar Estimado</CardTitle>
                <CardDescription className="text-sm text-gray-400">
                  Seleccione el estimado desde el cual desea generar la factura
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Search bar */}
                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Buscar por cliente o tipo de proyecto..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Estimates list */}
                {loadingEstimates ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto"></div>
                  </div>
                ) : filteredEstimates.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="mx-auto h-12 w-12 mb-4" />
                    <p>No se encontraron estimados</p>
                  </div>
                ) : (
                  <div className="grid gap-2 ">
                    {filteredEstimates.slice(0, 3).map((estimate) => (
                      <Card
                        key={estimate.id}
                        className={`cursor-pointer transition-all bg-gray-800 border-gray-600 ${
                          selectedEstimate?.id === estimate.id
                            ? "border-cyan-400 ring-2 ring-cyan-400 ring-offset-2 ring-offset-black"
                            : canUseInvoices ? "hover:border-cyan-400/50" : "hover:border-red-400/50"
                        } ${!canUseInvoices ? 'opacity-60' : ''}`}
                        onClick={canUseInvoices ? () => {
                          setSelectedEstimate(estimate);
                          setInvoiceConfig((prev) => ({
                            ...prev,
                            recipientEmail: estimate.clientEmail,
                          }));
                        } : () => showUpgradeModal('invoices', 'Selecciona estimados para facturación con planes superiores')}
                      >
                        <CardContent className="p-3">
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-medium text-sm truncate">
                                  {estimate.clientName}
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                  •
                                </span>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    estimate.createdAt,
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">
                                {estimate.projectType}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {estimate.items.length} items
                              </Badge>
                              <p className="text-base font-bold">
                                ${estimate.total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  // <div className="grid gap-2">
                  //   {filteredEstimates.slice(0, 3).map((estimate) => (
                  //     <Card
                  //       key={estimate.id}
                  //       className={`cursor-pointer transition-all ${
                  //         selectedEstimate?.id === estimate.id
                  //           ? "border-primary ring-2 ring-primary ring-offset-2"
                  //           : "hover:border-primary/50"
                  //       }`}
                  //       onClick={() => {
                  //         setSelectedEstimate(estimate);
                  //         setInvoiceConfig((prev) => ({
                  //           ...prev,
                  //           recipientEmail: estimate.clientEmail,
                  //         }));
                  //       }}
                  //     >
                  //       <CardContent className="p-3">
                  //         <div className="flex  justify-between items-center gap-4">
                  //           <div className="flex-1 min-w-0">
                  //             <div className="flex items-center gap-2">
                  //               <h4 className="font-medium text-sm truncate">
                  //                 {estimate.clientName}
                  //               </h4>
                  //               <span className="text-xs text-muted-foreground">
                  //                 •
                  //               </span>
                  //               <p className="text-xs text-muted-foreground">
                  //                 {new Date(
                  //                   estimate.createdAt,
                  //                 ).toLocaleDateString()}
                  //               </p>
                  //             </div>
                  //             <p className="text-xs text-muted-foreground truncate">
                  //               {estimate.projectType}
                  //             </p>
                  //           </div>
                  //           <div className="flex items-center gap-3 flex-shrink-0">
                  //             <Badge variant="outline" className="text-xs">
                  //               {estimate.items.length} items
                  //             </Badge>
                  //             <p className="text-base font-bold">
                  //               ${estimate.total.toFixed(2)}
                  //             </p>
                  //           </div>
                  //         </div>
                  //       </CardContent>
                  //     </Card>
                  //   ))}
                  // </div>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        const amounts = calculateAmounts();
        return (
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400">Ajustes de Pago</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure los detalles de pago y balance de la factura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Selected estimate summary */}
                {selectedEstimate && (
                  <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                    <h4 className="font-medium text-cyan-400">
                      {selectedEstimate.clientName}
                    </h4>
                    <p className="text-sm text-gray-400">
                      {selectedEstimate.projectType}
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div>
                        <p className="text-sm text-gray-400">Total</p>
                        <p className="font-semibold text-cyan-400">
                          ${amounts.total.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Pagado</p>
                        <p className="font-semibold text-green-400">
                          ${amounts.paid.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Balance</p>
                        <p className="font-semibold text-orange-400">
                          ${amounts.balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment configuration */}
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="paidAmount" className="text-cyan-400">Monto Pagado</Label>
                    <Input
                      id="paidAmount"
                      type="number"
                      value={invoiceConfig.paidAmount}
                      onChange={(e) =>
                        setInvoiceConfig((prev) => ({
                          ...prev,
                          paidAmount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={selectedEstimate?.total || 0}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                    <p className="text-sm text-gray-400 mt-1">
                      Ingrese el monto que ya ha sido pagado por el cliente
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="paymentTerms" className="text-cyan-400">
                      Términos de Pago (días)
                    </Label>
                    <select
                      id="paymentTerms"
                      value={invoiceConfig.paymentTerms}
                      onChange={(e) =>
                        setInvoiceConfig((prev) => ({
                          ...prev,
                          paymentTerms: parseInt(e.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border rounded-md bg-gray-800 border-gray-600 text-white"
                    >
                      <option value={0}>Al recibir</option>
                      <option value={15}>15 días</option>
                      <option value={30}>30 días</option>
                      <option value={45}>45 días</option>
                      <option value={60}>60 días</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-cyan-400">Notas adicionales (opcional)</Label>
                    <Textarea
                      id="notes"
                      value={invoiceConfig.notes}
                      onChange={(e) =>
                        setInvoiceConfig((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Agregue cualquier nota o mensaje para el cliente..."
                      rows={3}
                      className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                {/* Quick payment buttons */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-cyan-400">
                    Opciones rápidas{!canUseInvoices && ' (🔒 Premium)'}:
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={canUseInvoices ? () =>
                        setInvoiceConfig((prev) => ({
                          ...prev,
                          paidAmount: 0,
                        })) : () => showUpgradeModal('invoices', 'Configura pagos automáticamente con planes superiores')
                      }
                      disabled={!canUseInvoices}
                      className={`${canUseInvoices ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'}`}
                    >
                      {!canUseInvoices ? '🔒 Sin pago' : 'Sin pago'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={canUseInvoices ? () =>
                        setInvoiceConfig((prev) => ({
                          ...prev,
                          paidAmount: (selectedEstimate?.total || 0) * 0.5,
                        })) : () => showUpgradeModal('invoices', 'Calcula pagos automáticamente con planes superiores')
                      }
                      disabled={!canUseInvoices}
                      className={`${canUseInvoices ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'}`}
                    >
                      {!canUseInvoices ? '🔒 50% pagado' : '50% pagado'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={canUseInvoices ? () =>
                        setInvoiceConfig((prev) => ({
                          ...prev,
                          paidAmount: selectedEstimate?.total || 0,
                        })) : () => showUpgradeModal('invoices', 'Marca proyectos como pagados con planes superiores')
                      }
                      disabled={!canUseInvoices}
                      className={`${canUseInvoices ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'}`}
                    >
                      {!canUseInvoices ? '🔒 Pagado completo' : 'Pagado completo'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-cyan-400">Enviar y Descargar</CardTitle>
                <CardDescription className="text-gray-400">
                  Elija cómo desea entregar la factura al cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invoice preview */}
                {selectedEstimate && (
                  <div className="bg-gray-800 p-6 rounded-lg space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-cyan-400">
                          Factura #{generateInvoiceNumber()}
                        </h3>
                        <p className="text-sm text-gray-400">
                          Fecha: {new Date().toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          calculateAmounts().balance === 0
                            ? "default"
                            : calculateAmounts().paid > 0
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {calculateAmounts().balance === 0
                          ? "Pagado"
                          : calculateAmounts().paid > 0
                            ? "Pago parcial"
                            : "Pendiente"}
                      </Badge>
                    </div>

                    <div className="border-t border-gray-600 pt-4">
                      <p className="font-medium mb-2 text-cyan-400">
                        {selectedEstimate.clientName}
                      </p>
                      <p className="text-sm text-gray-400">
                        {selectedEstimate.projectType}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-gray-600 pt-4">
                      <div>
                        <p className="text-sm text-gray-400">Total</p>
                        <p className="font-semibold text-cyan-400">
                          ${calculateAmounts().total.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Balance</p>
                        <p className="font-semibold text-orange-400">
                          ${calculateAmounts().balance.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery options */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={invoiceConfig.sendEmail}
                      onChange={(e) =>
                        setInvoiceConfig((prev) => ({
                          ...prev,
                          sendEmail: e.target.checked,
                        }))
                      }
                      className="h-4 w-4"
                    />
                    <Label htmlFor="sendEmail" className="cursor-pointer text-cyan-400">
                      Enviar por email al cliente
                    </Label>
                  </div>

                  {invoiceConfig.sendEmail && (
                    <div>
                      <Label htmlFor="recipientEmail" className="text-cyan-400">
                        Email del destinatario
                      </Label>
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={invoiceConfig.recipientEmail}
                        onChange={(e) =>
                          setInvoiceConfig((prev) => ({
                            ...prev,
                            recipientEmail: e.target.value,
                          }))
                        }
                        placeholder="cliente@ejemplo.com"
                        className="bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <Button 
                    onClick={canUseInvoices ? handleGenerateInvoice : () => showUpgradeModal('invoices', 'Genera facturas profesionales ilimitadas con planes superiores')} 
                    disabled={!canUseInvoices}
                    className={`flex-1 ${canUseInvoices ? 'bg-cyan-400 text-black hover:bg-cyan-300' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {!canUseInvoices ? '🔒 Generar Factura (Premium)' : 'Generar Factura'}
                  </Button>
                  <Button
                    onClick={canUseInvoices ? () => {
                      setEmailPreviewContent(generateEmailPreview());
                      setShowEmailPreview(true);
                    } : () => showUpgradeModal('invoices', 'Accede a vista previa de emails profesionales con planes superiores')}
                    disabled={!canUseInvoices}
                    className={`flex-1 ${canUseInvoices ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-600'}`}
                    variant="outline"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    {!canUseInvoices ? '🔒 Vista Previa Email (Premium)' : 'Vista Previa Email'}
                  </Button>
                </div>

                <p className="text-sm text-gray-400 text-center">
                  Puede descargar la factura como PDF o enviarla directamente
                  por email al cliente
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-black text-white font-quantico">
        <div className="max-w-7xl mx-auto p-4 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-cyan-400">Sistema de Facturación</h1>
              <p className="text-gray-400">
                Genere facturas profesionales desde sus estimados guardados
              </p>
              {!canUseInvoices && (
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-900/20 to-cyan-900/20 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 flex items-center justify-center">
                        <span className="text-sm font-bold text-black">✨</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-purple-300">Vista Demo - Sistema de Facturación</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Estás viendo una demostración visual. Actualiza tu plan para generar facturas reales.
                      </p>
                    </div>
                    <Button
                      onClick={() => showUpgradeModal('invoices', 'Desbloquea el sistema completo de facturación profesional')}
                      size="sm"
                      className="bg-gradient-to-r from-purple-500 to-cyan-400 text-black hover:from-purple-600 hover:to-cyan-500 font-semibold text-xs"
                    >
                      Actualizar Plan
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-gray-900 border-gray-700">
              <TabsTrigger value="wizard" className="flex items-center gap-2 data-[state=active]:bg-cyan-400 data-[state=active]:text-black">
                <FileText className="h-4 w-4" />
                Generar Factura
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:bg-cyan-400 data-[state=active]:text-black">
                <History className="h-4 w-4" />
                Historial de Facturas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wizard" className="space-y-6">
              {/* Progress steps */}
              <div className="flex items-center justify-center mb-8">
                <div className="flex items-center space-x-4 max-w-2xl w-full">
                  {WIZARD_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id;

                    return (
                      <div key={step.id} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div
                            className={`
                            flex items-center justify-center w-10 h-10 rounded-full
                            ${
                              isActive
                                ? "bg-cyan-400 text-black"
                                : isCompleted
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-700 text-gray-400"
                            }
                          `}
                          >
                            {isCompleted ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <span
                            className={`
                          text-sm mt-2 ${isActive ? "font-medium text-cyan-400" : "text-gray-400"}
                        `}
                          >
                            {step.title}
                          </span>
                        </div>
                        {index < WIZARD_STEPS.length - 1 && (
                          <div
                            className={`
                          flex-1 h-1 mx-4 ${isCompleted ? "bg-green-600" : "bg-gray-700"}
                        `}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Current step content */}
              {renderWizardStep()}

              {/* Navigation buttons */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={canUseInvoices ? prevStep : () => showUpgradeModal('invoices', 'Navega por el wizard de facturas con planes superiores')}
                  disabled={currentStep === 1 || !canUseInvoices}
                  className={`${canUseInvoices ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700' : 'bg-gray-600 border-gray-600 text-gray-400 cursor-not-allowed'}`}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {!canUseInvoices ? '🔒 Anterior' : 'Anterior'}
                </Button>

                {currentStep < WIZARD_STEPS.length && (
                  <Button 
                    onClick={canUseInvoices ? nextStep : () => showUpgradeModal('invoices', 'Avanza por el wizard de facturas con planes superiores')} 
                    disabled={!canProceedToNext() || !canUseInvoices}
                    className={`${canUseInvoices ? 'bg-cyan-400 text-black hover:bg-cyan-300' : 'bg-gray-600 text-gray-400 cursor-not-allowed'}`}
                  >
                    {!canUseInvoices ? '🔒 Siguiente' : 'Siguiente'}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-cyan-400">
                    Historial de Facturas
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-400">
                    Todas las facturas generadas están disponibles aquí para
                    descargar
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {invoiceHistory.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <History className="mx-auto h-12 w-12 mb-4" />
                      <p>No hay facturas generadas aún</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {invoiceHistory.map((invoice) => (
                        <Card
                          key={invoice.id}
                          className="hover:border-primary/50 transition-all"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">
                                    {invoice.invoiceNumber}
                                  </h4>
                                  <Badge
                                    variant={
                                      invoice.paymentStatus === "paid"
                                        ? "default"
                                        : invoice.paymentStatus === "partial"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                  >
                                    {invoice.paymentStatus === "paid"
                                      ? "Pagado"
                                      : invoice.paymentStatus === "partial"
                                        ? "Parcial"
                                        : "Pendiente"}
                                  </Badge>
                                </div>
                                <p className="text-sm font-medium">
                                  {invoice.clientName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(
                                    invoice.createdAt,
                                  ).toLocaleDateString()}{" "}
                                  • {invoice.projectType}
                                </p>
                              </div>
                              <div className="text-right space-y-2">
                                <p className="text-lg font-bold">
                                  ${invoice.totalAmount.toFixed(2)}
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      // Find the original estimate
                                      const estimate = savedEstimates.find(
                                        (e) => e.id === invoice.estimateId,
                                      );
                                      if (estimate && currentUser) {
                                        try {
                                          // Get user profile with authorization
                                          const profileResponse = await fetch(
                                            "/api/profile",
                                            {
                                              headers: {
                                                Authorization: `Bearer ${await currentUser.getIdToken()}`,
                                              },
                                            },
                                          );
                                          const profile =
                                            await profileResponse.json();

                                          if (!profile?.company) {
                                            toast({
                                              title: "Perfil Incompleto",
                                              description:
                                                "Completa el nombre de tu empresa en tu perfil antes de descargar facturas.",
                                              variant: "destructive",
                                            });
                                            return;
                                          }

                                          // Build invoice payload exactly like EstimatesWizard does
                                          const invoicePayload = {
                                            profile: {
                                              company: profile.company,
                                              address: profile.address
                                                ? `${profile.address}${profile.city ? ", " + profile.city : ""}${profile.state ? ", " + profile.state : ""}${profile.zipCode ? " " + profile.zipCode : ""}`
                                                : "",
                                              phone: profile.phone || "",
                                              email:
                                                profile.email ||
                                                currentUser?.email ||
                                                "",
                                              website: profile.website || "",
                                              logo: profile.logo || "",
                                            },
                                            estimate: {
                                              client: {
                                                name: estimate.clientName,
                                                email: estimate.clientEmail,
                                                phone: estimate.clientPhone,
                                                address: estimate.clientAddress,
                                              },
                                              items: estimate.items,
                                              subtotal: estimate.subtotal,
                                              discountAmount: estimate.discount,
                                              taxRate:
                                                estimate.tax > 0
                                                  ? (estimate.tax /
                                                      estimate.subtotal) *
                                                    100
                                                  : 0,
                                              tax: estimate.tax,
                                              total: estimate.total,
                                            },
                                            invoiceConfig: {
                                              projectCompleted: true,
                                              downPaymentAmount:
                                                invoice.paidAmount > 0
                                                  ? invoice.paidAmount.toString()
                                                  : "",
                                              totalAmountPaid:
                                                invoice.paidAmount >=
                                                invoice.totalAmount,
                                            },
                                          };

                                          // Generate PDF using the same endpoint as EstimatesWizard
                                          const response = await fetch(
                                            "/api/invoice-pdf",
                                            {
                                              method: "POST",
                                              headers: {
                                                "Content-Type":
                                                  "application/json",
                                              },
                                              body: JSON.stringify(
                                                invoicePayload,
                                              ),
                                            },
                                          );

                                          if (!response.ok) {
                                            throw new Error(
                                              "Error generating PDF",
                                            );
                                          }

                                          // Download the PDF
                                          const blob = await response.blob();
                                          const url =
                                            window.URL.createObjectURL(blob);
                                          const link =
                                            document.createElement("a");
                                          link.href = url;
                                          link.download = `invoice-${invoice.invoiceNumber}.pdf`;
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          window.URL.revokeObjectURL(url);

                                          toast({
                                            title: "Factura descargada",
                                            description: `Factura ${invoice.invoiceNumber} descargada correctamente`,
                                          });
                                        } catch (error) {
                                          console.error(
                                            "Error downloading PDF:",
                                            error,
                                          );
                                          toast({
                                            title: "Error al descargar",
                                            description:
                                              "No se pudo descargar la factura",
                                            variant: "destructive",
                                          });
                                        }
                                      }
                                    }}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Handle email resend
                                      toast({
                                        title: "Función en desarrollo",
                                        description:
                                          "Reenvío de email próximamente",
                                      });
                                    }}
                                  >
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Email Preview Dialog */}
      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vista Previa del Email</DialogTitle>
            <DialogDescription>
              Así es como se verá el email antes de enviarlo
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <div dangerouslySetInnerHTML={{ __html: emailPreviewContent }} />
          </ScrollArea>

          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowEmailPreview(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                setShowEmailPreview(false);
                await handleSendInvoiceEmail();
              }}
              className="flex-1"
              disabled={isSendingEmail}
            >
              {isSendingEmail ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Email
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Invoices;

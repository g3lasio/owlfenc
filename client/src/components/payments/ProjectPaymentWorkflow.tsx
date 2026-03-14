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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  LinkIcon,
  Mail,
  MessageSquare,
  QrCode,
  Smartphone,
  Banknote,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

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
type WorkflowStep = "configure" | "success";

interface ProjectPaymentWorkflowProps {
  projects: Project[] | undefined;
  payments: ProjectPayment[] | undefined;
  onCreatePayment: (paymentData: any) => Promise<any>;
  onSendInvoice: (paymentData: any) => void;
  isCreatingPayment: boolean;
}

// ─── Device detection (SSR/Jest safe) ─────────────────────────────────────────

const detectMobileDevice = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { isMobile: false, isDesktop: true, canUseTapToPay: false };
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isTablet = /iPad|Android/i.test(ua) && !/Mobile/i.test(ua);
  const hasNFC = "NDEFReader" in window;
  const hasApplePay = typeof (window as any).ApplePaySession !== "undefined";
  return {
    isMobile,
    isDesktop: !isMobile && !isTablet,
    canUseTapToPay: isMobile && (hasNFC || hasApplePay),
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProjectPaymentWorkflow({
  projects,
  payments,
  onCreatePayment,
  onSendInvoice,
  isCreatingPayment,
}: ProjectPaymentWorkflowProps) {
  const { toast } = useToast();
  const deviceInfo = detectMobileDevice();

  // ── Step state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState<WorkflowStep>("configure");

  // ── Payment state ───────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [useExistingProject, setUseExistingProject] = useState<boolean>(true);
  const [generatedLink, setGeneratedLink] = useState<string>("");

  // ── Form config ─────────────────────────────────────────────────────────────
  const [config, setConfig] = useState({
    amount: "",
    type: "deposit" as "deposit" | "final" | "milestone" | "custom",
    description: "",
    clientEmail: "",
    clientName: "",
    clientPhone: "",
    // Advanced options
    dueDate: "",
    autoSendEmail: true,
    feePassThrough: false,
    // Manual payment fields
    manualMethod: "cash" as "cash" | "check" | "zelle" | "venmo" | "other",
    referenceNumber: "",
    paymentDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  // ── Advanced options panel ──────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Remember last used method ───────────────────────────────────────────────
  useEffect(() => {
    const last = localStorage.getItem("lastPaymentMethod");
    if (last === "terminal" || last === "link" || last === "manual") {
      setPaymentMethod(last as PaymentMethodType);
    }
  }, []);

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /** Formats a value already in dollars (from Firebase / user input). */
  const formatDollars = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  /** Formats a value in cents (from Stripe API). */
  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

  /** Calculates suggested payment amount in dollars based on project total and type. */
  const suggestedAmount = (project: Project, type: string): number => {
    const total = project.totalPrice || 0;
    const amount = type === "deposit" || type === "final" ? total * 0.5 : total;
    return Math.round(amount * 100) / 100;
  };

  // ─── Event handlers ───────────────────────────────────────────────────────────

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setConfig((prev) => ({
      ...prev,
      clientEmail: project.clientEmail || "",
      clientName: project.clientName || "",
      clientPhone: project.clientPhone || "",
      amount: suggestedAmount(project, prev.type).toString(),
      description: `${prev.type === "custom" ? "Payment" : prev.type} for ${project.projectType || "project"}`,
    }));
  };

  const handleMethodSelect = (method: PaymentMethodType) => {
    setPaymentMethod(method);
    if (method) localStorage.setItem("lastPaymentMethod", method);
  };

  const handleTypeChange = (type: "deposit" | "final" | "milestone" | "custom") => {
    const newAmount = selectedProject ? suggestedAmount(selectedProject, type).toString() : config.amount;
    const newDesc = selectedProject
      ? `${type === "custom" ? "Payment" : type} for ${selectedProject.projectType || "project"}`
      : config.description;
    setConfig((prev) => ({ ...prev, type, amount: newAmount, description: newDesc }));
  };

  const handleCreatePayment = async () => {
    // ── Validation ──────────────────────────────────────────────────────────
    if (!config.amount || parseFloat(config.amount) <= 0) {
      toast({ title: "Monto inválido", description: "Ingresa un monto válido", variant: "destructive" });
      return;
    }
    if (!paymentMethod) {
      toast({ title: "Método requerido", description: "Selecciona un método de pago", variant: "destructive" });
      return;
    }
    if (paymentMethod === "link" && !config.clientEmail) {
      toast({ title: "Email requerido", description: "El email del cliente es requerido para payment links", variant: "destructive" });
      return;
    }

    // ── Build payload ───────────────────────────────────────────────────────
    const paymentType = config.type === "custom" ? "additional" : config.type;
    const payload: any = {
      projectId: selectedProject?.id || null,
      amount: parseFloat(config.amount) * 100, // → cents for Stripe
      type: paymentType,
      description: config.description || `${paymentType} payment`,
      clientEmail: config.clientEmail,
      clientName: config.clientName,
      clientPhone: config.clientPhone,
      paymentMethod,
    };

    if (paymentMethod === "link") {
      payload.dueDate = config.dueDate || undefined;
      payload.autoSendEmail = config.autoSendEmail;
      payload.feePassThrough = config.feePassThrough;
    }

    if (paymentMethod === "manual") {
      payload.manualMethod = config.manualMethod;
      payload.referenceNumber = config.referenceNumber;
      payload.paymentDate = config.paymentDate;
      payload.notes = config.notes;
    }

    try {
      const result = await onCreatePayment(payload);
      console.log("💳 [PAYMENT-WORKFLOW] Result:", result);

      // ── Extract link URL ─────────────────────────────────────────────────
      const link =
        result?.data?.paymentLinkUrl ||
        result?.paymentLinkUrl ||
        result?.data?.checkoutUrl ||
        result?.checkoutUrl ||
        "";

      if (paymentMethod === "link" && !link) {
        console.error("❌ [PAYMENT-WORKFLOW] No payment link URL in response");
        toast({
          title: "Error al generar link",
          description: "No se pudo generar el link de pago. Intenta de nuevo.",
          variant: "destructive",
        });
        return;
      }

      if (link) setGeneratedLink(link);
      setStep("success");

      // ── Success toast ────────────────────────────────────────────────────
      const emailSent = result?.emailSent;
      if (paymentMethod === "link" && config.autoSendEmail) {
        toast({
          title: emailSent ? "¡Link creado y enviado!" : "Link creado",
          description: emailSent
            ? `Email enviado a ${config.clientEmail}`
            : "Link creado. El email no pudo enviarse — compártelo manualmente.",
        });
      } else {
        toast({
          title: "¡Éxito!",
          description:
            paymentMethod === "link"
              ? "Payment link creado correctamente"
              : paymentMethod === "manual"
              ? "Pago registrado correctamente"
              : "Terminal listo para cobrar",
        });
      }
    } catch (error: any) {
      console.error("❌ [PAYMENT-WORKFLOW] Error:", error);
      toast({
        title: "Error al crear pago",
        description: error?.message || "Intenta de nuevo o contacta soporte",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "¡Copiado!", description: "Link copiado al portapapeles" });
  };

  const sendPaymentEmail = () => {
    onSendInvoice({
      projectName: selectedProject?.projectType || "Project",
      clientName: config.clientName,
      clientEmail: config.clientEmail,
      totalAmount: parseFloat(config.amount),
      paymentLink: generatedLink,
    });
    toast({ title: "Email enviado", description: `Link enviado a ${config.clientEmail}` });
  };

  const shareViaWhatsApp = () => {
    const msg = `Hola ${config.clientName}, aquí está tu link de pago: ${generatedLink}`;
    window.open(`https://wa.me/${config.clientPhone?.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const shareViaSMS = () => {
    const msg = `Hola ${config.clientName}, aquí está tu link de pago: ${generatedLink}`;
    window.open(`sms:${config.clientPhone}?body=${encodeURIComponent(msg)}`, "_blank");
  };

  const resetWorkflow = () => {
    setStep("configure");
    setPaymentMethod(null);
    setSelectedProject(null);
    setUseExistingProject(true);
    setGeneratedLink("");
    setShowAdvanced(false);
    setConfig({
      amount: "",
      type: "deposit",
      description: "",
      clientEmail: "",
      clientName: "",
      clientPhone: "",
      dueDate: "",
      autoSendEmail: true,
      feePassThrough: false,
      manualMethod: "cash",
      referenceNumber: "",
      paymentDate: new Date().toISOString().split("T")[0],
      notes: "",
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 1 — CONFIGURE PAYMENT
      ═══════════════════════════════════════════════════════════════════════ */}
      {step === "configure" && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Crear Pago
            </CardTitle>
            <CardDescription className="text-gray-400">
              Ingresa el monto, método y datos del cliente
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* ── Amount ──────────────────────────────────────────────────── */}
            <div className="space-y-2">
              <Label className="text-white text-base font-medium">Monto del Pago</Label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-cyan-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={config.amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    const parts = v.split(".");
                    if (parts[1] && parts[1].length > 2) return;
                    setConfig((prev) => ({ ...prev, amount: v }));
                  }}
                  className="bg-gray-800 border-gray-600 text-white text-3xl font-bold pl-14 py-6 text-center"
                  placeholder="0.00"
                  data-testid="input-amount"
                />
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* ── Link to project ──────────────────────────────────────────── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-white text-base font-medium">Proyecto (opcional)</Label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm ${useExistingProject ? "text-cyan-400" : "text-gray-400"}`}>
                    Vincular proyecto
                  </span>
                  <Switch
                    checked={useExistingProject}
                    onCheckedChange={(v) => {
                      setUseExistingProject(v);
                      if (!v) setSelectedProject(null);
                    }}
                    data-testid="switch-use-project"
                  />
                </div>
              </div>

              {useExistingProject && (
                <div className="space-y-2">
                  <Select
                    onValueChange={(val) => {
                      const project = projects?.find((p) => p.id.toString() === val);
                      if (project) handleProjectSelect(project);
                    }}
                    value={selectedProject?.id?.toString() || ""}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-project">
                      <SelectValue placeholder="Selecciona un proyecto..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {projects && projects.length > 0 ? (
                        projects.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()} className="text-white hover:bg-gray-700">
                            {p.clientName} — {p.projectType} ({formatDollars(p.totalPrice || 0)})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>
                          No hay proyectos disponibles
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>

                  {selectedProject && (
                    <div className="p-3 bg-cyan-900/20 border border-cyan-700 rounded-lg text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-cyan-400">{selectedProject.clientName}</p>
                          <p className="text-gray-400">{selectedProject.projectType}</p>
                          <p className="text-gray-500 text-xs">{selectedProject.address}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-cyan-400">{formatDollars(selectedProject.totalPrice || 0)}</p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {selectedProject.paymentStatus || "pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment type selector — only shown when project is selected */}
                  {selectedProject && (
                    <Select
                      value={config.type}
                      onValueChange={(v: any) => handleTypeChange(v)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white" data-testid="select-payment-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="deposit">
                          Depósito 50% — {formatDollars(suggestedAmount(selectedProject, "deposit"))}
                        </SelectItem>
                        <SelectItem value="final">
                          Pago Final 50% — {formatDollars(suggestedAmount(selectedProject, "final"))}
                        </SelectItem>
                        <SelectItem value="milestone">Pago por Etapa</SelectItem>
                        <SelectItem value="custom">Monto Personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}
            </div>

            <Separator className="bg-gray-700" />

            {/* ── Client info ──────────────────────────────────────────────── */}
            <div className="space-y-3">
              <Label className="text-white text-base font-medium">Datos del Cliente</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-400 text-sm">Email{paymentMethod === "link" ? " *" : ""}</Label>
                  <Input
                    type="email"
                    value={config.clientEmail}
                    onChange={(e) => setConfig((prev) => ({ ...prev, clientEmail: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="cliente@email.com"
                    data-testid="input-client-email"
                  />
                </div>
                <div>
                  <Label className="text-gray-400 text-sm">Nombre</Label>
                  <Input
                    value={config.clientName}
                    onChange={(e) => setConfig((prev) => ({ ...prev, clientName: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="Nombre del cliente"
                    data-testid="input-client-name"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-gray-400 text-sm">Teléfono (para SMS/WhatsApp)</Label>
                  <Input
                    type="tel"
                    value={config.clientPhone}
                    onChange={(e) => setConfig((prev) => ({ ...prev, clientPhone: e.target.value }))}
                    className="bg-gray-800 border-gray-600 text-white mt-1"
                    placeholder="+1 (555) 000-0000"
                    data-testid="input-client-phone"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-gray-700" />

            {/* ── Payment method ───────────────────────────────────────────── */}
            <div className="space-y-3">
              <Label className="text-white text-base font-medium">Método de Cobro</Label>
              <div className="grid grid-cols-3 gap-3">

                {/* Terminal — disabled, same structure as other cards */}
                <Button
                  onClick={() =>
                    toast({
                      title: "Próximamente",
                      description: "Terminal/Tap-to-Pay requiere dispositivo móvil con NFC o Apple Pay",
                      variant: "default",
                    })
                  }
                  disabled
                  variant="outline"
                  className="h-24 w-full flex flex-col items-center justify-center gap-2 bg-gray-900 border-2 border-gray-700 text-gray-500 opacity-50 cursor-not-allowed"
                  data-testid="button-method-terminal"
                >
                  <Smartphone className="h-7 w-7" />
                  <div className="text-center leading-tight">
                    <div className="font-semibold text-sm">Terminal</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">Próximamente</div>
                  </div>
                </Button>

                {/* Payment Link */}
                <Button
                  onClick={() => handleMethodSelect("link")}
                  variant="outline"
                  className={`h-24 flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                    paymentMethod === "link"
                      ? "bg-cyan-900/30 border-cyan-400 text-cyan-400"
                      : "bg-gray-800 border-gray-600 text-white hover:border-cyan-400 hover:bg-gray-700"
                  }`}
                  data-testid="button-method-link"
                >
                  <LinkIcon className="h-7 w-7" />
                  <div className="text-center leading-tight">
                    <div className="font-semibold text-sm">Payment Link</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Email / SMS</div>
                  </div>
                </Button>

                {/* Cash / Check */}
                <Button
                  onClick={() => handleMethodSelect("manual")}
                  variant="outline"
                  className={`h-24 flex flex-col items-center justify-center gap-2 border-2 transition-all ${
                    paymentMethod === "manual"
                      ? "bg-cyan-900/30 border-cyan-400 text-cyan-400"
                      : "bg-gray-800 border-gray-600 text-white hover:border-cyan-400 hover:bg-gray-700"
                  }`}
                  data-testid="button-method-manual"
                >
                  <Banknote className="h-7 w-7" />
                  <div className="text-center leading-tight">
                    <div className="font-semibold text-sm">Cash / Check</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">Registro manual</div>
                  </div>
                </Button>
              </div>
            </div>

            {/* ── Advanced Options (collapsible) ───────────────────────────── */}
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white transition-colors"
                data-testid="button-toggle-advanced"
              >
                <span className="text-sm font-medium">Opciones Avanzadas</span>
                {showAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showAdvanced && (
                <div className="p-4 space-y-4 bg-gray-850 border-t border-gray-700">

                  {/* Description */}
                  <div>
                    <Label className="text-gray-300 text-sm">Descripción del Pago</Label>
                    <Textarea
                      value={config.description}
                      onChange={(e) => setConfig((prev) => ({ ...prev, description: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white mt-1"
                      placeholder="Ej: Depósito para instalación de cerca de madera..."
                      rows={2}
                      data-testid="textarea-description"
                    />
                  </div>

                  {/* Payment Link specific advanced options */}
                  {paymentMethod === "link" && (
                    <>
                      {/* Due Date */}
                      <div>
                        <Label className="text-gray-300 text-sm">Fecha de Vencimiento (opcional)</Label>
                        <Input
                          type="date"
                          value={config.dueDate}
                          onChange={(e) => setConfig((prev) => ({ ...prev, dueDate: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white mt-1"
                          data-testid="input-due-date"
                        />
                      </div>

                      {/* Auto-send email */}
                      <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div>
                          <p className="text-white text-sm font-medium">Enviar email automáticamente</p>
                          <p className="text-gray-400 text-xs">Envía el link al cliente por email al crearlo</p>
                        </div>
                        <Switch
                          checked={config.autoSendEmail}
                          onCheckedChange={(v) => setConfig((prev) => ({ ...prev, autoSendEmail: v }))}
                          data-testid="switch-auto-send-email"
                        />
                      </div>

                      {/* Fee absorption */}
                      <div className="p-3 bg-gray-800 rounded-lg border border-gray-600">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-4">
                            <p className="text-white text-sm font-medium">💰 ¿Quién absorbe la tarifa (0.5%)?</p>
                            <p className="text-gray-400 text-xs mt-1">
                              {config.feePassThrough
                                ? `✅ Cliente paga — Tú recibes exactamente $${parseFloat(config.amount || "0").toFixed(2)}`
                                : `⚠️ Tú absorbes — Recibes $${(parseFloat(config.amount || "0") * 0.995).toFixed(2)} de $${parseFloat(config.amount || "0").toFixed(2)}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={config.feePassThrough}
                              onCheckedChange={(v) => setConfig((prev) => ({ ...prev, feePassThrough: v }))}
                              data-testid="toggle-fee-pass-through"
                            />
                            <span className="text-xs text-gray-400">
                              {config.feePassThrough ? "Cliente" : "Yo"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Manual payment specific advanced options */}
                  {paymentMethod === "manual" && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-gray-300 text-sm">Método Recibido</Label>
                          <Select
                            value={config.manualMethod}
                            onValueChange={(v: any) => setConfig((prev) => ({ ...prev, manualMethod: v }))}
                          >
                            <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1" data-testid="select-manual-method">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              <SelectItem value="cash">Efectivo</SelectItem>
                              <SelectItem value="check">Cheque</SelectItem>
                              <SelectItem value="zelle">Zelle</SelectItem>
                              <SelectItem value="venmo">Venmo</SelectItem>
                              <SelectItem value="other">Otro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-gray-300 text-sm">Fecha de Pago</Label>
                          <Input
                            type="date"
                            value={config.paymentDate}
                            onChange={(e) => setConfig((prev) => ({ ...prev, paymentDate: e.target.value }))}
                            className="bg-gray-800 border-gray-600 text-white mt-1"
                            data-testid="input-payment-date"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Número de Referencia / Cheque (opcional)</Label>
                        <Input
                          value={config.referenceNumber}
                          onChange={(e) => setConfig((prev) => ({ ...prev, referenceNumber: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white mt-1"
                          placeholder="Cheque #1234 o ID de transacción"
                          data-testid="input-reference-number"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-sm">Notas (opcional)</Label>
                        <Textarea
                          value={config.notes}
                          onChange={(e) => setConfig((prev) => ({ ...prev, notes: e.target.value }))}
                          className="bg-gray-800 border-gray-600 text-white mt-1"
                          placeholder="Notas adicionales sobre este pago..."
                          rows={2}
                          data-testid="textarea-notes"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* ── Submit button ────────────────────────────────────────────── */}
            <Button
              onClick={handleCreatePayment}
              disabled={isCreatingPayment || !paymentMethod || !config.amount}
              className="w-full bg-cyan-400 text-black hover:bg-cyan-300 py-6 text-lg font-semibold disabled:opacity-50"
              data-testid="button-create-payment"
            >
              {isCreatingPayment ? (
                <>
                  <Clock className="h-5 w-5 mr-2 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {paymentMethod === "link" && "Generar Payment Link"}
                  {paymentMethod === "manual" && "Registrar Pago"}
                  {paymentMethod === "terminal" && "Abrir Terminal"}
                  {!paymentMethod && "Selecciona un método de pago"}
                  {paymentMethod && <ArrowRight className="h-5 w-5 ml-2" />}
                </>
              )}
            </Button>

          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          STEP 2 — SUCCESS & SHARE
      ═══════════════════════════════════════════════════════════════════════ */}
      {step === "success" && (
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              {paymentMethod === "link" && "Payment Link Listo"}
              {paymentMethod === "manual" && "Pago Registrado"}
              {paymentMethod === "terminal" && "Terminal Activo"}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {paymentMethod === "link" && "Comparte el link con tu cliente"}
              {paymentMethod === "manual" && "El pago ha sido registrado en tu historial"}
              {paymentMethod === "terminal" && "Procesa el pago con Tap-to-Pay"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* ── Success banner ───────────────────────────────────────────── */}
            <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-green-400">¡Éxito!</p>
                <p className="text-green-300 text-sm mt-0.5">
                  {paymentMethod === "link" &&
                    `Payment link por ${formatDollars(parseFloat(config.amount))} creado correctamente`}
                  {paymentMethod === "manual" &&
                    `Pago de ${formatDollars(parseFloat(config.amount))} registrado`}
                  {paymentMethod === "terminal" && "Terminal listo para cobrar"}
                </p>
              </div>
            </div>

            {/* ── Payment link display + share ─────────────────────────────── */}
            {paymentMethod === "link" && generatedLink && (
              <>
                <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                  <Label className="text-white text-sm">Tu Payment Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedLink}
                      readOnly
                      className="bg-gray-700 border-gray-600 text-white font-mono text-sm"
                      data-testid="input-generated-link"
                    />
                    <Button
                      onClick={() => copyToClipboard(generatedLink)}
                      variant="outline"
                      className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600 shrink-0"
                      data-testid="button-copy-link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Compartir</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Button
                      onClick={sendPaymentEmail}
                      variant="outline"
                      className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      data-testid="button-send-email"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>

                    {config.clientPhone && (
                      <>
                        <Button
                          onClick={shareViaSMS}
                          variant="outline"
                          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          data-testid="button-send-sms"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          SMS
                        </Button>
                        <Button
                          onClick={shareViaWhatsApp}
                          variant="outline"
                          className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                          data-testid="button-send-whatsapp"
                        >
                          <MessageSquare className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </>
                    )}

                    <Button
                      onClick={() =>
                        toast({ title: "QR Code", description: "Generador de QR próximamente" })
                      }
                      variant="outline"
                      className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      data-testid="button-show-qr"
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Code
                    </Button>

                    <Button
                      onClick={() => window.open(generatedLink, "_blank")}
                      variant="outline"
                      className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      data-testid="button-open-link"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Preview
                    </Button>

                    <Button
                      onClick={() =>
                        toast({ title: "PDF", description: "Descarga de PDF próximamente" })
                      }
                      variant="outline"
                      className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                      data-testid="button-download-pdf"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* ── Terminal action ──────────────────────────────────────────── */}
            {paymentMethod === "terminal" && (
              <Button
                onClick={() =>
                  toast({
                    title: "Terminal",
                    description: "Integración con Stripe Terminal próximamente",
                  })
                }
                className="w-full bg-cyan-400 text-black hover:bg-cyan-300 py-6 text-lg font-semibold"
                data-testid="button-open-terminal"
              >
                <Smartphone className="h-5 w-5 mr-2" />
                Abrir Terminal
              </Button>
            )}

            {/* ── Payment summary ──────────────────────────────────────────── */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h4 className="font-medium text-white mb-3 text-sm">Resumen del Pago</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-gray-400">Monto:</span>
                <span className="text-white font-semibold">{formatDollars(parseFloat(config.amount))}</span>

                <span className="text-gray-400">Tipo:</span>
                <span className="text-white capitalize">{config.type}</span>

                {config.clientName && (
                  <>
                    <span className="text-gray-400">Cliente:</span>
                    <span className="text-white">{config.clientName}</span>
                  </>
                )}

                <span className="text-gray-400">Método:</span>
                <span className="text-white capitalize">{paymentMethod}</span>

                {selectedProject && (
                  <>
                    <span className="text-gray-400">Proyecto:</span>
                    <span className="text-white text-xs">
                      {selectedProject.projectType} — {selectedProject.address}
                    </span>
                  </>
                )}

                {paymentMethod === "manual" && config.referenceNumber && (
                  <>
                    <span className="text-gray-400">Referencia:</span>
                    <span className="text-white">{config.referenceNumber}</span>
                  </>
                )}
              </div>
            </div>

            {/* ── Next steps guidance ──────────────────────────────────────── */}
            <div className="bg-cyan-900/20 border border-cyan-700 p-4 rounded-lg">
              <h4 className="font-medium text-cyan-400 mb-2 text-sm">Próximos Pasos</h4>
              <ul className="text-cyan-300 text-sm space-y-1">
                {paymentMethod === "link" && (
                  <>
                    <li>• Comparte el link con tu cliente por email, SMS o WhatsApp</li>
                    <li>• Monitorea el estado del pago en Payment History</li>
                    <li>• El cliente recibirá confirmación automática al pagar</li>
                    <li>• Los fondos se depositan en tu cuenta conectada</li>
                  </>
                )}
                {paymentMethod === "manual" && (
                  <>
                    <li>• El pago ha sido registrado en tu historial</li>
                    <li>• Puedes generar un recibo para el cliente</li>
                    <li>• Actualiza el estatus del proyecto si es necesario</li>
                  </>
                )}
                {paymentMethod === "terminal" && (
                  <>
                    <li>• Procesa el pago con la tarjeta del cliente</li>
                    <li>• La confirmación se enviará automáticamente</li>
                    <li>• Los fondos se depositan en tu cuenta</li>
                  </>
                )}
              </ul>
            </div>

            {/* ── Actions ──────────────────────────────────────────────────── */}
            <div className="flex gap-3">
              <Button
                onClick={resetWorkflow}
                className="flex-1 bg-cyan-400 text-black hover:bg-cyan-300 font-semibold"
                data-testid="button-create-another"
              >
                Crear Otro Pago
              </Button>
              <Button
                onClick={() => {/* Navigate to history tab */}}
                variant="outline"
                className="bg-gray-800 border-gray-600 text-white hover:bg-gray-700"
                data-testid="button-view-history"
              >
                Ver Historial
              </Button>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}

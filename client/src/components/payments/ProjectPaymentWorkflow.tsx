import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  Calculator
} from 'lucide-react';

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
  type: 'deposit' | 'final' | 'milestone' | 'additional';
  status: 'pending' | 'succeeded' | 'failed' | 'canceled' | 'expired';
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
  isCreatingPayment
}: ProjectPaymentWorkflowProps) {
  // Workflow state
  const [currentStep, setCurrentStep] = useState<'select' | 'preview' | 'payment' | 'confirmation'>('select');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editableAmount, setEditableAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'zelle' | 'link' | 'card' | 'ach'>('cash');
  const [clientEmail, setClientEmail] = useState<string>('');

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const calculatePayments = (project: Project) => {
    const totalAmount = project.totalPrice ? project.totalPrice / 100 : 0; // Convert from cents
    
    // Calculate paid amount from existing payments
    const projectPayments = payments?.filter(p => p.projectId === project.id) || [];
    const totalPaid = projectPayments
      .filter(p => p.status === 'succeeded')
      .reduce((sum, p) => sum + (p.amount / 100), 0); // Convert from cents

    const remainingBalance = totalAmount - totalPaid;
    const depositAmount = totalAmount * 0.5; // 50% deposit

    return {
      totalAmount,
      totalPaid,
      remainingBalance,
      depositAmount
    };
  };

  // Step 1: Project Selection
  const renderProjectSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Paso 1: Seleccionar Proyecto
        </CardTitle>
        <CardDescription>
          Selecciona el proyecto para procesar el pago
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!projects || projects.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No hay proyectos disponibles. Los proyectos se cargan automáticamente desde Firebase.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => {
              const amounts = calculatePayments(project);
              
              return (
                <Card 
                  key={project.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedProject?.id === project.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => {
                    setSelectedProject(project);
                    setClientEmail(project.clientEmail || '');
                    setEditableAmount(amounts.depositAmount.toString());
                  }}
                >
                  <CardContent className="p-4">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium">{project.clientName}</h4>
                        <p className="text-sm text-muted-foreground">{project.projectType || 'Proyecto General'}</p>
                        <p className="text-xs text-muted-foreground">{project.address}</p>
                      </div>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span>Total:</span>
                          <span className="font-medium">{formatCurrency(amounts.totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pagado:</span>
                          <span className="text-green-600">{formatCurrency(amounts.totalPaid)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pendiente:</span>
                          <span className="text-orange-600">{formatCurrency(amounts.remainingBalance)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end">
                        <Badge variant={amounts.remainingBalance > 0 ? "secondary" : "default"}>
                          {amounts.remainingBalance > 0 ? 'Pendiente' : 'Completado'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedProject && (
          <div className="mt-6 flex justify-end">
            <Button onClick={() => setCurrentStep('preview')}>
              Continuar al Resumen
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
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
            Paso 2: Resumen Detallado del Proyecto
          </CardTitle>
          <CardDescription>
            Revisa la información completa del cliente, detalles del proyecto y costos totales
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enhanced Client Information Section */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Información del Cliente
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <div>
                    <div className="text-sm text-gray-600">Nombre Completo</div>
                    <div className="font-semibold text-lg">{selectedProject.clientName}</div>
                  </div>
                </div>
                {selectedProject.clientEmail && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="text-sm font-medium">{selectedProject.clientEmail}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {selectedProject.clientPhone && (
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-600">Teléfono</div>
                      <div className="text-sm font-medium">{selectedProject.clientPhone}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-blue-600 mt-1" />
                  <div>
                    <div className="text-sm text-gray-600">Dirección del Proyecto</div>
                    <div className="text-sm font-medium">{selectedProject.address}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Project Details Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              Detalles del Proyecto
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Tipo de Proyecto</div>
                  <div className="font-semibold">{selectedProject.projectType || 'Proyecto General'}</div>
                </div>
                {selectedProject.projectSubtype && (
                  <div>
                    <div className="text-sm text-gray-600">Estilo/Subtipo</div>
                    <div className="font-medium">{selectedProject.projectSubtype}</div>
                  </div>
                )}
                <div>
                  <div className="text-sm text-gray-600">Estado</div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {selectedProject.status === 'approved' ? 'Aprobado' : selectedProject.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                {selectedProject.projectDescription && (
                  <div>
                    <div className="text-sm text-gray-600">Descripción</div>
                    <div className="text-sm bg-white p-3 rounded border">
                      {selectedProject.projectDescription}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Total Costs Section */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border">
            <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Costos Totales
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(amounts.totalAmount)}
                </div>
                <div className="text-sm text-gray-600">Costo Total</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(amounts.totalPaid)}
                </div>
                <div className="text-sm text-gray-600">Pagado</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-orange-600">
                  {formatCurrency(amounts.remainingBalance)}
                </div>
                <div className="text-sm text-gray-600">Pendiente</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm border">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(previewAmount)}
                </div>
                <div className="text-sm text-gray-600">Este Pago</div>
              </div>
            </div>
          </div>

          {/* Editable Payment Amount */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <Label htmlFor="paymentAmount" className="text-base font-medium">Monto del Pago</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="paymentAmount"
                  type="number"
                  value={editableAmount}
                  onChange={(e) => setEditableAmount(e.target.value)}
                  className="pl-10 text-lg"
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  max={amounts.remainingBalance}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditableAmount(amounts.depositAmount.toString())}
              >
                Depósito 50%
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditableAmount(amounts.remainingBalance.toString())}
              >
                Saldo Completo
              </Button>
            </div>
          </div>

          {/* Client Email for Invoice */}
          <div className="space-y-2">
            <Label htmlFor="clientEmail" className="text-base font-medium">Email del Cliente (para factura)</Label>
            <Input
              id="clientEmail"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="cliente@ejemplo.com"
              className="text-base"
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('select')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Proyectos
            </Button>
            <Button
              onClick={() => setCurrentStep('payment')}
              disabled={!previewAmount || previewAmount <= 0 || !clientEmail}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Continuar al Pago
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
          Paso 3: Seleccionar Método de Pago
        </CardTitle>
        <CardDescription>
          Elige cómo quieres procesar el pago del cliente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhanced Payment Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              paymentMethod === 'cash' ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-muted/50'
            }`}
            onClick={() => setPaymentMethod('cash')}
          >
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-green-600" />
              <h4 className="font-semibold text-lg">Efectivo</h4>
              <p className="text-sm text-muted-foreground mt-2">
                Registrar pago en efectivo recibido en persona
              </p>
              <Badge variant="secondary" className="mt-3 bg-green-100 text-green-800">
                Disponible
              </Badge>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              paymentMethod === 'zelle' ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-muted/50'
            }`}
            onClick={() => setPaymentMethod('zelle')}
          >
            <CardContent className="p-6 text-center">
              <Phone className="h-12 w-12 mx-auto mb-3 text-blue-600" />
              <h4 className="font-semibold text-lg">Zelle</h4>
              <p className="text-sm text-muted-foreground mt-2">
                Transferencia bancaria instantánea via Zelle
              </p>
              <Badge variant="secondary" className="mt-3 bg-blue-100 text-blue-800">
                Disponible
              </Badge>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              paymentMethod === 'link' ? 'ring-2 ring-purple-500 bg-purple-50' : 'hover:bg-muted/50'
            }`}
            onClick={() => setPaymentMethod('link')}
          >
            <CardContent className="p-6 text-center">
              <LinkIcon className="h-12 w-12 mx-auto mb-3 text-purple-600" />
              <h4 className="font-semibold text-lg">Enlace de Pago</h4>
              <p className="text-sm text-muted-foreground mt-2">
                Generar enlace para que el cliente pague online
              </p>
              <Badge variant="secondary" className="mt-3 bg-orange-100 text-orange-800">
                En Desarrollo
              </Badge>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md opacity-60 ${
              paymentMethod === 'card' ? 'ring-2 ring-gray-400 bg-gray-50' : 'hover:bg-muted/30'
            }`}
            onClick={() => setPaymentMethod('card')}
          >
            <CardContent className="p-6 text-center">
              <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-500" />
              <h4 className="font-semibold text-lg">Tarjeta</h4>
              <p className="text-sm text-muted-foreground mt-2">
                Terminal de tarjetas (Stripe Connect)
              </p>
              <Badge variant="secondary" className="mt-3 bg-gray-100 text-gray-600">
                Pausado
              </Badge>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md opacity-60 ${
              paymentMethod === 'ach' ? 'ring-2 ring-gray-400 bg-gray-50' : 'hover:bg-muted/30'
            }`}
            onClick={() => setPaymentMethod('ach')}
          >
            <CardContent className="p-6 text-center">
              <Calculator className="h-12 w-12 mx-auto mb-3 text-gray-500" />
              <h4 className="font-semibold text-lg">ACH</h4>
              <p className="text-sm text-muted-foreground mt-2">
                Transferencia bancaria ACH directa
              </p>
              <Badge variant="secondary" className="mt-3 bg-gray-100 text-gray-600">
                Pausado
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Details */}
        {paymentMethod && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium mb-2">Instrucciones del Método Seleccionado</h5>
            {paymentMethod === 'cash' && (
              <p className="text-sm text-gray-600">
                ✅ Confirma que has recibido el pago en efectivo antes de procesar.
              </p>
            )}
            {paymentMethod === 'zelle' && (
              <p className="text-sm text-gray-600">
                📱 Proporciona tu número de Zelle al cliente y confirma la transferencia.
              </p>
            )}
            {paymentMethod === 'link' && (
              <p className="text-sm text-gray-600">
                🔗 Se generará un enlace seguro que puedes enviar al cliente por email.
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={() => setCurrentStep('preview')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al Resumen
          </Button>
          <Button 
            onClick={() => setCurrentStep('confirmation')}
            disabled={!paymentMethod}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Procesar Pago
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
      description: `${selectedProject.projectType || 'Project'} - ${selectedProject.clientName}`,
      type: 'deposit' as const
    };

    const handlePaymentSubmit = () => {
      if (paymentMethod === 'cash' || paymentMethod === 'zelle') {
        // For cash and zelle, register the payment immediately
        onCreatePayment(paymentData);
      } else if (paymentMethod === 'link') {
        // For payment links, create the link
        onCreatePayment(paymentData);
      }

      // Send invoice
      onSendInvoice({
        projectName: selectedProject.projectType || 'Project',
        clientName: selectedProject.clientName,
        clientEmail: selectedProject.clientEmail || clientEmail,
        totalAmount: selectedProject.totalPrice ? selectedProject.totalPrice / 100 : 0,
        paidAmount: parseFloat(editableAmount),
        remainingAmount: (selectedProject.totalPrice ? selectedProject.totalPrice / 100 : 0) - parseFloat(editableAmount)
      });
    };

    const handleStartOver = () => {
      setCurrentStep('select');
      setSelectedProject(null);
      setEditableAmount('');
      setPaymentMethod('cash');
      setClientEmail('');
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Paso 4: Confirmación del Pago
          </CardTitle>
          <CardDescription>
            Revisa y confirma todos los detalles antes de procesar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-lg border">
            <h4 className="font-semibold text-lg mb-4">Resumen del Pago</h4>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Cliente</div>
                  <div className="font-semibold">{selectedProject.clientName}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Proyecto</div>
                  <div className="font-medium">{selectedProject.projectType || 'Proyecto General'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Método de Pago</div>
                  <Badge variant="outline" className="font-medium">
                    {paymentMethod === 'cash' ? 'Efectivo' : 
                     paymentMethod === 'zelle' ? 'Zelle' : 
                     paymentMethod === 'link' ? 'Enlace de Pago' : paymentMethod}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-sm text-gray-600">Monto del Pago</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(parseFloat(editableAmount) || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Email para Factura</div>
                  <div className="font-medium">{clientEmail}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h5 className="font-medium text-blue-900 mb-2">Qué sucederá:</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Se registrará el pago en el historial</li>
              <li>📧 Se enviará una factura por email al cliente</li>
              <li>📊 Se actualizará el estado del proyecto</li>
              {paymentMethod === 'link' && (
                <li>🔗 Se generará un enlace de pago seguro</li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => setCurrentStep('payment')} className="flex-1">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cambiar Método
            </Button>
            <Button 
              onClick={handlePaymentSubmit}
              disabled={isCreatingPayment}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isCreatingPayment ? (
                <>
                  <Clock className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Pago
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleStartOver} className="flex-1">
              Nuevo Pago
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
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[
          { step: 'select', label: 'Seleccionar', icon: DollarSign },
          { step: 'preview', label: 'Revisar', icon: FileText },
          { step: 'payment', label: 'Método', icon: CreditCard },
          { step: 'confirmation', label: 'Confirmar', icon: CheckCircle }
        ].map(({ step, label, icon: Icon }) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              currentStep === step 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'border-gray-300 text-gray-400'
            }`}>
              <Icon className="h-5 w-5" />
            </div>
            <span className={`ml-2 text-sm font-medium ${
              currentStep === step ? 'text-blue-600' : 'text-gray-400'
            }`}>
              {label}
            </span>
            {step !== 'confirmation' && (
              <div className="w-12 h-px bg-gray-300 ml-4" />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      {currentStep === 'select' && renderProjectSelection()}
      {currentStep === 'preview' && renderPaymentPreview()}
      {currentStep === 'payment' && renderPaymentMethod()}
      {currentStep === 'confirmation' && renderConfirmation()}
    </div>
  );
}
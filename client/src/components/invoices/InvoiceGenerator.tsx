/**
 * Componente para generar facturas desde proyectos completados
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Phone, 
  Mail,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface Project {
  id: number;
  projectId: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  address: string;
  projectType: string;
  projectDescription?: string;
  status: string;
  totalPrice: number;
  completedDate: string;
  invoiceGenerated: boolean;
  invoiceNumber?: string;
}

interface InvoiceGeneratorProps {
  completedProjects: Project[];
  onGenerateInvoice: (data: {
    projectId: string;
    paymentTerms?: number;
    customMessage?: string;
  }) => void;
  isGenerating: boolean;
}

const InvoiceGenerator: React.FC<InvoiceGeneratorProps> = ({
  completedProjects,
  onGenerateInvoice,
  isGenerating
}) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<number>(30);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [step, setStep] = useState<'select' | 'configure' | 'preview'>('select');

  // Filtrar proyectos completados sin factura
  const availableProjects = completedProjects.filter(p => !p.invoiceGenerated);

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setStep('configure');
  };

  const handleGenerateInvoice = () => {
    if (!selectedProject) return;
    
    onGenerateInvoice({
      projectId: selectedProject.id.toString(),
      paymentTerms: paymentTerms || 30,
      customMessage: customMessage || undefined
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const calculateDueDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('es-ES');
  };

  if (availableProjects.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-medium mb-2">Todos los proyectos facturados</h3>
          <p className="text-muted-foreground">
            No hay proyectos completados pendientes de facturación.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center space-x-4">
        <div className={`flex items-center space-x-2 ${step === 'select' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'select' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            1
          </div>
          <span className="font-medium">Seleccionar Proyecto</span>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center space-x-2 ${step === 'configure' ? 'text-primary' : 'text-muted-foreground'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step === 'configure' ? 'bg-primary text-primary-foreground' : 'bg-muted'
          }`}>
            2
          </div>
          <span className="font-medium">Configurar Factura</span>
        </div>
      </div>

      {/* Step 1: Select Project */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Seleccionar Proyecto para Facturar
            </CardTitle>
            <CardDescription>
              Elija un proyecto completado para generar su factura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {availableProjects.map((project) => (
                <Card 
                  key={project.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProjectSelect(project)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{project.projectId}</h4>
                          <Badge variant="secondary">{project.projectType}</Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {project.clientName}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {project.address}
                          </div>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {project.clientEmail}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Completado: {new Date(project.completedDate).toLocaleDateString('es-ES')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(project.totalPrice)}
                        </div>
                        <Button size="sm" className="mt-2">
                          Generar Factura
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure Invoice */}
      {step === 'configure' && selectedProject && (
        <div className="grid gap-6">
          {/* Project Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen del Proyecto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Proyecto</Label>
                  <p className="text-sm">{selectedProject.projectId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm">{selectedProject.clientName}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo</Label>
                  <p className="text-sm">{selectedProject.projectType}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Monto Total</Label>
                  <p className="text-lg font-bold">{formatCurrency(selectedProject.totalPrice)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuración de la Factura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Payment Terms */}
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Términos de Pago (días)</Label>
                <Select value={paymentTerms.toString()} onValueChange={(value) => setPaymentTerms(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar términos de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 días</SelectItem>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="10">10 días</SelectItem>
                    <SelectItem value="15">15 días</SelectItem>
                    <SelectItem value="20">20 días</SelectItem>
                    <SelectItem value="30">30 días (estándar)</SelectItem>
                    <SelectItem value="45">45 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Fecha de vencimiento: {calculateDueDate(paymentTerms)}
                </p>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="customMessage">Mensaje de Agradecimiento (Opcional)</Label>
                <Textarea
                  id="customMessage"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Gracias por confiar en nuestros servicios. Ha sido un placer trabajar en su proyecto."
                  rows={3}
                />
                <p className="text-sm text-muted-foreground">
                  Si no especifica un mensaje, se utilizará un mensaje estándar
                </p>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('select')}
                >
                  Volver
                </Button>
                <Button 
                  onClick={handleGenerateInvoice}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Generar Factura
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default InvoiceGenerator;
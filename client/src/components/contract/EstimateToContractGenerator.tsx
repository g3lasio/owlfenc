/**
 * Generador de Contratos desde Estimados
 * 
 * Componente que toma un estimado aprobado y genera automáticamente un contrato legal
 * usando el Motor de Abogado Defensor Digital con Anthropic AI.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Eye,
  Settings,
  Brain
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { LegalContractEngine } from "@/services/legalContractEngine";

interface EstimateData {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  projectAddress: string;
  projectType: string;
  projectDescription: string;
  totalAmount: number;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  laborCost?: number;
  materialCost?: number;
  timeline?: string;
  contractorName: string;
  contractorAddress: string;
  contractorLicense?: string;
  state: string;
  createdAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

interface EstimateToContractGeneratorProps {
  estimate: EstimateData;
  onContractGenerated?: (contractHtml: string) => void;
}

const EstimateToContractGenerator: React.FC<EstimateToContractGeneratorProps> = ({
  estimate,
  onContractGenerated
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [riskAnalysis, setRiskAnalysis] = useState<string>('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false);
  const { toast } = useToast();

  // Generar contrato automáticamente desde el estimado
  const handleGenerateContract = async () => {
    if (estimate.status !== 'approved') {
      toast({
        title: "⚠️ Estimado no aprobado",
        description: "Solo se pueden generar contratos desde estimados aprobados",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const contractOptions = {
        includePermitClause: true,
        includeWarrantyTerms: true,
        paymentSchedule: 'milestone' as const,
        disputeResolution: 'arbitration' as const
      };

      const contractHtml = await LegalContractEngine.generateContractFromEstimate(
        estimate,
        contractOptions
      );

      setGeneratedContract(contractHtml);
      onContractGenerated?.(contractHtml);

      toast({
        title: "🤖 Contrato generado exitosamente",
        description: "El abogado defensor digital ha creado tu contrato legal",
        variant: "default"
      });

    } catch (error) {
      console.error('Error generating contract:', error);
      toast({
        title: "❌ Error generando contrato",
        description: "Verifica tu configuración de Anthropic API en las variables de entorno",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Analizar riesgos legales del proyecto
  const handleAnalyzeRisks = async () => {
    setIsAnalyzing(true);
    
    try {
      const analysis = await LegalContractEngine.analyzeLegalRisks(estimate);
      setRiskAnalysis(analysis);
      setIsRiskDialogOpen(true);

    } catch (error) {
      console.error('Error analyzing risks:', error);
      toast({
        title: "❌ Error en análisis de riesgo",
        description: "No se pudo completar el análisis legal",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Descargar contrato como HTML
  const handleDownloadContract = () => {
    if (!generatedContract) return;

    const blob = new Blob([generatedContract], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Contract_${estimate.clientName}_${estimate.id}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "📄 Contrato descargado",
      description: "El contrato se ha guardado en formato HTML",
    });
  };

  const getStatusBadge = () => {
    switch (estimate.status) {
      case 'approved':
        return <Badge className="bg-green-500">Aprobado</Badge>;
      case 'pending':
        return <Badge variant="outline">Pendiente</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Información del Estimado */}
      <Card className="border-cyan-500/30 bg-background">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-cyan-400">
            <div className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Estimado #{estimate.id}
            </div>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong className="text-cyan-400">Cliente:</strong> {estimate.clientName}
            </div>
            <div>
              <strong className="text-cyan-400">Proyecto:</strong> {estimate.projectType}
            </div>
            <div>
              <strong className="text-cyan-400">Ubicación:</strong> {estimate.projectAddress}
            </div>
            <div>
              <strong className="text-cyan-400">Valor:</strong> ${estimate.totalAmount.toLocaleString()}
            </div>
          </div>
          
          <Separator className="bg-cyan-500/30" />
          
          <div>
            <strong className="text-cyan-400">Descripción:</strong>
            <p className="text-sm text-gray-300 mt-1">{estimate.projectDescription}</p>
          </div>
        </CardContent>
      </Card>

      {/* Acciones del Motor Legal */}
      <Card className="border-cyan-500/30 bg-background">
        <CardHeader>
          <CardTitle className="flex items-center text-cyan-400">
            <Shield className="mr-2 h-5 w-5" />
            🤖 Abogado Defensor Digital
          </CardTitle>
          <DialogDescription className="text-cyan-300/80">
            Motor de IA especializado en protección legal del contratista
          </DialogDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Análisis de Riesgo */}
            <Button
              onClick={handleAnalyzeRisks}
              disabled={isAnalyzing}
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 h-20 flex-col"
            >
              {isAnalyzing ? (
                <Loader2 className="h-6 w-6 animate-spin mb-2" />
              ) : (
                <AlertTriangle className="h-6 w-6 mb-2" />
              )}
              <span className="text-sm">Analizar Riesgos Legales</span>
            </Button>

            {/* Generar Contrato */}
            <Button
              onClick={handleGenerateContract}
              disabled={isGenerating || estimate.status !== 'approved'}
              className="bg-gradient-to-r from-cyan-500 to-cyan-400 text-black hover:from-cyan-400 hover:to-cyan-300 h-20 flex-col"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin mb-2" />
                  <span className="text-sm">Generando Contrato...</span>
                </>
              ) : (
                <>
                  <Brain className="h-6 w-6 mb-2" />
                  <span className="text-sm">Generar Contrato Legal</span>
                </>
              )}
            </Button>
          </div>

          {/* Acciones del Contrato Generado */}
          {generatedContract && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center mb-3">
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-green-400 font-medium">Contrato generado exitosamente</span>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  onClick={() => setIsPreviewOpen(true)}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 text-green-400"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Previsualizar
                </Button>
                
                <Button
                  onClick={handleDownloadContract}
                  size="sm"
                  className="bg-green-500 text-black hover:bg-green-400"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar HTML
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de Preview del Contrato */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh]  flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">
              📄 Vista Previa del Contrato Legal
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1  border rounded p-4 bg-white text-black">
            <div dangerouslySetInnerHTML={{ __html: generatedContract }} />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleDownloadContract} className="bg-cyan-500 text-black">
              <Download className="h-4 w-4 mr-2" />
              Descargar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Análisis de Riesgo */}
      <Dialog open={isRiskDialogOpen} onOpenChange={setIsRiskDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]  flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center text-orange-400">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Análisis de Riesgo Legal
            </DialogTitle>
            <DialogDescription>
              Evaluación de riesgos específicos para tu proyecto
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 ">
            <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded whitespace-pre-wrap">
              {riskAnalysis || 'Analizando riesgos del proyecto...'}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRiskDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EstimateToContractGenerator;
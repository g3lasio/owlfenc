import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  FileCheck, 
  Signature, 
  Send, 
  Shield, 
  CheckCircle,
  Clock,
  Users,
  Download,
  ArrowRight
} from 'lucide-react';

import DigitalSignatureCanvas from './DigitalSignatureCanvas';
import ContractPreviewRenderer from './ContractPreviewRenderer';
import { signatureValidation, ValidationResult } from '../../services/digital-signature/SignatureValidation';
import { contractDistribution } from '../../services/digital-signature/ContractDistribution';

interface DigitalSigningWorkflowProps {
  contractData: any;
  onSigningComplete: (signedContract: any) => void;
  onWorkflowCancel: () => void;
  className?: string;
}

export default function DigitalSigningWorkflow({
  contractData,
  onSigningComplete,
  onWorkflowCancel,
  className = ""
}: DigitalSigningWorkflowProps) {
  const [currentPhase, setCurrentPhase] = useState<'preview' | 'signing' | 'distribution' | 'complete'>('preview');
  const [previewComplete, setPreviewComplete] = useState(false);
  const [contractorSignature, setContractorSignature] = useState<any>(null);
  const [clientSignature, setClientSignature] = useState<any>(null);
  const [validationResults, setValidationResults] = useState<{
    contractor?: ValidationResult;
    client?: ValidationResult;
  }>({});
  const [distributionStatus, setDistributionStatus] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { toast } = useToast();

  const workflowPhases = [
    { id: 'preview', title: 'Vista Previa', icon: FileCheck, description: 'Revisar contrato completo' },
    { id: 'signing', title: 'Firmado', icon: Signature, description: 'Firmas digitales' },
    { id: 'distribution', title: 'Distribución', icon: Send, description: 'Envío automático' },
    { id: 'complete', title: 'Completo', icon: CheckCircle, description: 'Proceso finalizado' }
  ];

  const getCurrentPhaseIndex = () => {
    return workflowPhases.findIndex(phase => phase.id === currentPhase);
  };

  const handlePreviewComplete = useCallback((readingConfirmed: boolean) => {
    if (readingConfirmed) {
      setPreviewComplete(true);
      setCurrentPhase('signing');
      toast({
        title: "Vista Previa Completada",
        description: "Ahora puede proceder al firmado digital",
      });
    } else {
      toast({
        title: "Vista Previa Requerida",
        description: "Complete la lectura del contrato para continuar",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleSectionComplete = useCallback((sectionId: string) => {
    console.log(`Section completed: ${sectionId}`);
  }, []);

  const handleContractorSignature = useCallback(async (signature: any) => {
    setIsProcessing(true);
    try {
      // Validate contractor signature
      const validation = signatureValidation.validateSignature(
        signature.biometrics,
        signature.metadata
      );

      setValidationResults(prev => ({ ...prev, contractor: validation }));
      
      if (validation.isValid) {
        setContractorSignature(signature);
        toast({
          title: "Firma del Contratista Validada",
          description: `Calidad: ${validation.confidence}% - ${validation.riskLevel} riesgo`,
        });
      } else {
        toast({
          title: "Firma Rechazada",
          description: validation.issues.join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error de Validación",
        description: "No se pudo validar la firma",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const handleClientSignature = useCallback(async (signature: any) => {
    setIsProcessing(true);
    try {
      // Validate client signature
      const validation = signatureValidation.validateSignature(
        signature.biometrics,
        signature.metadata
      );

      setValidationResults(prev => ({ ...prev, client: validation }));
      
      if (validation.isValid) {
        setClientSignature(signature);
        toast({
          title: "Firma del Cliente Validada",
          description: `Calidad: ${validation.confidence}% - ${validation.riskLevel} riesgo`,
        });
      } else {
        toast({
          title: "Firma Rechazada",
          description: validation.issues.join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error de Validación", 
        description: "No se pudo validar la firma",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const proceedToDistribution = useCallback(async () => {
    if (!contractorSignature || !clientSignature) {
      toast({
        title: "Firmas Requeridas",
        description: "Ambas partes deben firmar antes de continuar",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setCurrentPhase('distribution');

    try {
      // Distribute contract with signatures
      const distributionResult = await contractDistribution.distributeToClient(
        {
          contractId: contractData.id || `contract_${Date.now()}`,
          clientInfo: contractData.client,
          contractorInfo: contractData.contractor,
          contractSummary: {
            projectType: contractData.project?.type || 'Construction',
            totalAmount: contractData.financials?.total || 0,
            startDate: contractData.timeline?.startDate || new Date().toISOString(),
            completionDate: contractData.timeline?.completionDate || new Date().toISOString()
          }
        },
        {
          sendEmail: true,
          sendSMS: true
        }
      );

      setDistributionStatus(distributionResult);

      if (distributionResult.success) {
        setCurrentPhase('complete');
        toast({
          title: "Contrato Distribuido",
          description: "Contrato enviado exitosamente a ambas partes",
        });

        // Complete the workflow
        const signedContract = {
          ...contractData,
          signatures: {
            contractor: contractorSignature,
            client: clientSignature,
            validations: validationResults,
            signedAt: new Date().toISOString()
          },
          distribution: distributionResult,
          status: 'signed_and_distributed'
        };

        onSigningComplete(signedContract);
      } else {
        toast({
          title: "Error de Distribución",
          description: distributionResult.errors.join(', '),
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error de Distribución",
        description: "No se pudo distribuir el contrato",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [contractorSignature, clientSignature, contractData, validationResults, onSigningComplete, toast]);

  const bothSignaturesValid = contractorSignature && clientSignature && 
    validationResults.contractor?.isValid && validationResults.client?.isValid;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Workflow Progress Header */}
      <Card className="cyberpunk-border">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-cyan-400" />
              <span>Sistema de Firmado Digital Avanzado</span>
            </div>
            <Badge variant="outline" className="bg-cyan-600 text-white">
              Fase {getCurrentPhaseIndex() + 1} de {workflowPhases.length}
            </Badge>
          </CardTitle>
          
          <div className="space-y-4">
            <Progress value={(getCurrentPhaseIndex() + 1) / workflowPhases.length * 100} className="h-2" />
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {workflowPhases.map((phase, index) => {
                const Icon = phase.icon;
                const isActive = phase.id === currentPhase;
                const isCompleted = index < getCurrentPhaseIndex();
                
                return (
                  <div key={phase.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isActive ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/20' :
                    isCompleted ? 'border-green-400 bg-green-50 dark:bg-green-900/20' :
                    'border-gray-300 bg-gray-50 dark:bg-gray-800'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-cyan-600' :
                      isCompleted ? 'bg-green-600' :
                      'bg-gray-400'
                    }`}>
                      {isCompleted ? 
                        <CheckCircle className="h-5 w-5 text-white" /> :
                        <Icon className="h-5 w-5 text-white" />
                      }
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{phase.title}</div>
                      <div className="text-xs text-gray-600">{phase.description}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Phase Content */}
      {currentPhase === 'preview' && (
        <ContractPreviewRenderer
          contractData={contractData}
          onReadingComplete={handlePreviewComplete}
          onSectionComplete={handleSectionComplete}
          isLoading={isProcessing}
        />
      )}

      {currentPhase === 'signing' && (
        <div className="space-y-6">
          <Card className="cyberpunk-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signature className="h-5 w-5 text-cyan-400" />
                Firmado Digital Biométrico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Contractor Signature */}
                <DigitalSignatureCanvas
                  onSignatureComplete={handleContractorSignature}
                  onSignatureReset={() => setContractorSignature(null)}
                  signerName={contractData.contractor?.name || 'Contratista'}
                  signerRole="contractor"
                  existingSignature={contractorSignature?.imageData}
                />

                {/* Client Signature */}
                <DigitalSignatureCanvas
                  onSignatureComplete={handleClientSignature}
                  onSignatureReset={() => setClientSignature(null)}
                  signerName={contractData.client?.name || 'Cliente'}
                  signerRole="client"
                  existingSignature={clientSignature?.imageData}
                />
              </div>

              {/* Validation Results */}
              {(validationResults.contractor || validationResults.client) && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold">Resultados de Validación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {validationResults.contractor && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium">Contratista</div>
                        <div className="text-sm space-y-1">
                          <div>Confianza: {validationResults.contractor.confidence}%</div>
                          <div>Riesgo: {validationResults.contractor.riskLevel}</div>
                          <Badge variant={validationResults.contractor.isValid ? "default" : "destructive"}>
                            {validationResults.contractor.isValid ? "Válida" : "Inválida"}
                          </Badge>
                        </div>
                      </div>
                    )}
                    
                    {validationResults.client && (
                      <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                        <div className="font-medium">Cliente</div>
                        <div className="text-sm space-y-1">
                          <div>Confianza: {validationResults.client.confidence}%</div>
                          <div>Riesgo: {validationResults.client.riskLevel}</div>
                          <Badge variant={validationResults.client.isValid ? "default" : "destructive"}>
                            {validationResults.client.isValid ? "Válida" : "Inválida"}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={onWorkflowCancel}
                  className="flex-1"
                >
                  Cancelar Proceso
                </Button>
                
                <Button
                  onClick={proceedToDistribution}
                  disabled={!bothSignaturesValid || isProcessing}
                  className="flex-1 bg-cyan-600 hover:bg-cyan-700"
                >
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Distribuir Contrato
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {currentPhase === 'distribution' && (
        <Card className="cyberpunk-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-cyan-400" />
              Distribución Automática
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-cyan-400 animate-spin mb-4" />
                <h3 className="text-lg font-semibold mb-2">Distribuyendo Contrato</h3>
                <p className="text-gray-600">Enviando por email y SMS a ambas partes...</p>
              </div>
            ) : distributionStatus && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                    <h4 className="font-semibold mb-2">Estado del Envío</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Email:</span>
                        <Badge variant={distributionStatus.emailSent ? "default" : "destructive"}>
                          {distributionStatus.emailSent ? "Enviado" : "Fallido"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>SMS:</span>
                        <Badge variant={distributionStatus.smsSent ? "default" : "destructive"}>
                          {distributionStatus.smsSent ? "Enviado" : "Fallido"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded">
                    <h4 className="font-semibold mb-2">Enlaces de Acceso</h4>
                    <div className="space-y-2 text-sm">
                      <div>ID: {distributionStatus.linkId}</div>
                      <div>Expira: {new Date(distributionStatus.expiresAt).toLocaleDateString('es-ES')}</div>
                    </div>
                  </div>
                </div>
                
                {distributionStatus.errors.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200">
                    <h4 className="font-semibold text-red-800 mb-2">Errores de Distribución</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {distributionStatus.errors.map((error: string, index: number) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {currentPhase === 'complete' && (
        <Card className="cyberpunk-border border-green-400">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-green-600 mb-2">¡Proceso Completado!</h3>
              <p className="text-gray-600 mb-6">
                El contrato ha sido firmado digitalmente y distribuido exitosamente
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded">
                  <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <div className="font-semibold">Firmas Validadas</div>
                  <div className="text-sm text-gray-600">Biométricamente verificadas</div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                  <Send className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <div className="font-semibold">Distribuido</div>
                  <div className="text-sm text-gray-600">Email y SMS enviados</div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded">
                  <Shield className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                  <div className="font-semibold">Seguro</div>
                  <div className="text-sm text-gray-600">Trazabilidad completa</div>
                </div>
              </div>
              
              <Button 
                onClick={() => onSigningComplete({ ...contractData, status: 'completed' })}
                className="bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar Contrato Final
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
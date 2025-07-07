/**
 * EJEMPLO DE INTEGRACIÓN FASE 2 - SISTEMA AVANZADO DE FIRMADO DIGITAL
 * 
 * Este archivo demuestra cómo integrar todos los servicios avanzados de la Fase 2
 * con el flujo existente de SimpleContractGenerator de manera modular.
 * 
 * SERVICIOS INTEGRADOS:
 * ✅ TwilioSMSService - Notificaciones SMS
 * ✅ GeolocationValidation - Validación de ubicación
 * ✅ AdvancedEmailTemplates - Templates profesionales
 * ✅ AdvancedPDFService - PDFs con firmas insertadas
 * ✅ Phase2IntegrationOrchestrator - Coordinación de servicios
 */

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  Smartphone,
  MapPin,
  Mail,
  FileText,
  Settings,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  Globe,
  Lock,
  Clock
} from 'lucide-react';

// Import Phase 2 services
import { phase2Integration, Phase2IntegrationConfig } from '../services/digital-signature/Phase2IntegrationOrchestrator';
import { twilioSMS } from '../services/digital-signature/TwilioSMSService';
import { geolocationValidation } from '../services/digital-signature/GeolocationValidation';
import { advancedEmailTemplates } from '../services/digital-signature/AdvancedEmailTemplates';
import { advancedPDF } from '../services/digital-signature/AdvancedPDFService';

interface Phase2IntegrationExampleProps {
  contractData: any;
  signatures: any;
  originalPdfBytes: Uint8Array;
  onProcessingComplete: (result: any) => void;
}

export default function Phase2IntegrationExample({
  contractData,
  signatures,
  originalPdfBytes,
  onProcessingComplete
}: Phase2IntegrationExampleProps) {
  const [config, setConfig] = useState<Phase2IntegrationConfig>(phase2Integration.getConfiguration());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [serviceStatus, setServiceStatus] = useState({
    sms: { initialized: false, configured: false },
    geolocation: { available: false, permission: 'prompt' },
    email: { templates: 0 },
    pdf: { features: [] as string[] }
  });
  const [processingResult, setProcessingResult] = useState<any>(null);
  
  const { toast } = useToast();

  const processingSteps = [
    { title: 'Inicializando Servicios', icon: Settings },
    { title: 'Validación Biométrica', icon: Shield },
    { title: 'Validación de Ubicación', icon: MapPin },
    { title: 'Procesamiento de PDF', icon: FileText },
    { title: 'Distribución Automática', icon: Smartphone },
    { title: 'Finalización', icon: CheckCircle }
  ];

  // Initialize services status
  React.useEffect(() => {
    checkServicesStatus();
  }, []);

  const checkServicesStatus = async () => {
    try {
      // Check SMS service
      const smsStats = twilioSMS.getServiceStats();
      setServiceStatus(prev => ({
        ...prev,
        sms: {
          initialized: true,
          configured: smsStats.isConfigured
        }
      }));

      // Check geolocation
      const geoStats = geolocationValidation.getServiceStats();
      setServiceStatus(prev => ({
        ...prev,
        geolocation: {
          available: geoStats.isAvailable,
          permission: navigator.geolocation ? 'granted' : 'denied'
        }
      }));

      // Check email templates
      const emailTemplates = advancedEmailTemplates.getAvailableTemplates();
      setServiceStatus(prev => ({
        ...prev,
        email: {
          templates: emailTemplates.length
        }
      }));

      // Check PDF service
      const pdfStats = advancedPDF.getServiceStats();
      setServiceStatus(prev => ({
        ...prev,
        pdf: {
          features: pdfStats.featuresAvailable
        }
      }));

    } catch (error) {
      console.warn('Error checking services status:', error);
    }
  };

  const handleConfigChange = (key: keyof Phase2IntegrationConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    phase2Integration.updateConfiguration(newConfig);
  };

  const executePhase2Process = useCallback(async () => {
    if (!signatures?.contractor || !signatures?.client) {
      toast({
        title: "Firmas Requeridas",
        description: "Se necesitan las firmas del contratista y cliente",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStep(0);

    try {
      // Step 1: Initialize services
      setProcessingStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate initialization

      // Step 2: Signature validation (already done in previous steps)
      setProcessingStep(2);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Location validation
      setProcessingStep(3);
      if (config.enableGeolocation) {
        // Location validation would happen here
        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      // Step 4: PDF processing
      setProcessingStep(4);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate PDF processing

      // Step 5: Distribution
      setProcessingStep(5);
      if (config.enableSMS || config.enableAdvancedEmail) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      // Execute comprehensive signing process
      const result = await phase2Integration.executeComprehensiveSigningProcess(
        contractData,
        originalPdfBytes,
        signatures
      );

      setProcessingResult(result);
      setProcessingStep(6);

      if (result.success) {
        toast({
          title: "Proceso Completado",
          description: "Contrato procesado con tecnología avanzada",
        });
        onProcessingComplete(result);
      } else {
        toast({
          title: "Procesamiento con Errores",
          description: `${result.errors.length} errores encontrados`,
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error de Procesamiento",
        description: `Error: ${error}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [contractData, signatures, originalPdfBytes, config, toast, onProcessingComplete]);

  const getServiceStatusIcon = (status: boolean) => {
    return status ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="cyberpunk-border border-cyan-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-cyan-400" />
            Fase 2 - Sistema Avanzado de Firmado Digital
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Tecnología de última generación con validación biométrica, geolocalización, 
            SMS automático y PDFs con firmas insertadas.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <div className="text-sm font-medium">SMS Twilio</div>
              <div className="text-xs text-gray-500">
                {getServiceStatusIcon(serviceStatus.sms.configured)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <div className="text-sm font-medium">Geolocalización</div>
              <div className="text-xs text-gray-500">
                {getServiceStatusIcon(serviceStatus.geolocation.available)}
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <Mail className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <div className="text-sm font-medium">Email Avanzado</div>
              <div className="text-xs text-gray-500">
                {serviceStatus.email.templates} templates
              </div>
            </div>
            
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded">
              <FileText className="h-8 w-8 mx-auto mb-2 text-orange-500" />
              <div className="text-sm font-medium">PDF Avanzado</div>
              <div className="text-xs text-gray-500">
                {serviceStatus.pdf.features.length} características
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Panel */}
      <Card className="cyberpunk-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-600" />
            Configuración de Servicios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SMS Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Notificaciones SMS</span>
                </div>
                <Switch 
                  checked={config.enableSMS}
                  onCheckedChange={(checked) => handleConfigChange('enableSMS', checked)}
                />
              </div>
              
              {config.enableSMS && (
                <div className="pl-6 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Enviar a cliente</span>
                    <Switch 
                      checked={config.smsNotifications.sendToClient}
                      onCheckedChange={(checked) => 
                        handleConfigChange('smsNotifications', { ...config.smsNotifications, sendToClient: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Enviar a contratista</span>
                    <Switch 
                      checked={config.smsNotifications.sendToContractor}
                      onCheckedChange={(checked) => 
                        handleConfigChange('smsNotifications', { ...config.smsNotifications, sendToContractor: checked })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Recordatorios automáticos</span>
                    <Switch 
                      checked={config.smsNotifications.enableReminders}
                      onCheckedChange={(checked) => 
                        handleConfigChange('smsNotifications', { ...config.smsNotifications, enableReminders: checked })
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Geolocation Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Validación de Ubicación</span>
                </div>
                <Switch 
                  checked={config.enableGeolocation}
                  onCheckedChange={(checked) => handleConfigChange('enableGeolocation', checked)}
                />
              </div>
              
              {config.enableGeolocation && (
                <div className="pl-6 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Presencia física requerida</span>
                    <Switch 
                      checked={config.locationValidation.requiresPhysicalPresence}
                      onCheckedChange={(checked) => 
                        handleConfigChange('locationValidation', { 
                          ...config.locationValidation, 
                          requiresPhysicalPresence: checked 
                        })
                      }
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Radio máximo: {(config.locationValidation.maxDistanceFromProject / 1000).toFixed(0)}km del proyecto
                  </div>
                </div>
              )}
            </div>

            {/* Advanced Email Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">Email Avanzado</span>
                </div>
                <Switch 
                  checked={config.enableAdvancedEmail}
                  onCheckedChange={(checked) => handleConfigChange('enableAdvancedEmail', checked)}
                />
              </div>
              
              {config.enableAdvancedEmail && (
                <div className="pl-6 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Seguimiento de apertura</span>
                    <Switch 
                      checked={config.emailEnhancements.trackingEnabled}
                      onCheckedChange={(checked) => 
                        handleConfigChange('emailEnhancements', { 
                          ...config.emailEnhancements, 
                          trackingEnabled: checked 
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Branding personalizado</span>
                    <Switch 
                      checked={config.emailEnhancements.customBranding}
                      onCheckedChange={(checked) => 
                        handleConfigChange('emailEnhancements', { 
                          ...config.emailEnhancements, 
                          customBranding: checked 
                        })
                      }
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Nivel de seguridad: {config.emailEnhancements.securityLevel}
                  </div>
                </div>
              )}
            </div>

            {/* PDF Security Configuration */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">PDF Avanzado</span>
                </div>
                <Switch 
                  checked={config.enableAdvancedPDF}
                  onCheckedChange={(checked) => handleConfigChange('enableAdvancedPDF', checked)}
                />
              </div>
              
              {config.enableAdvancedPDF && (
                <div className="pl-6 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Metadatos de seguridad</span>
                    <Switch 
                      checked={config.pdfSecurity.embedMetadata}
                      onCheckedChange={(checked) => 
                        handleConfigChange('pdfSecurity', { 
                          ...config.pdfSecurity, 
                          embedMetadata: checked 
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Marcas de agua</span>
                    <Switch 
                      checked={config.pdfSecurity.addWatermarks}
                      onCheckedChange={(checked) => 
                        handleConfigChange('pdfSecurity', { 
                          ...config.pdfSecurity, 
                          addWatermarks: checked 
                        })
                      }
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    Audit trail: {config.pdfSecurity.auditTrailLevel}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="cyberpunk-border border-yellow-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600 animate-spin" />
              Procesamiento Avanzado en Curso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={(processingStep / processingSteps.length) * 100} className="h-2" />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {processingSteps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === processingStep - 1;
                  const isCompleted = index < processingStep - 1;
                  
                  return (
                    <div key={index} className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isActive ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20' :
                      isCompleted ? 'border-green-400 bg-green-50 dark:bg-green-900/20' :
                      'border-gray-300 bg-gray-50 dark:bg-gray-800'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        isActive ? 'text-yellow-600 animate-pulse' :
                        isCompleted ? 'text-green-600' :
                        'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        isActive ? 'text-yellow-700' :
                        isCompleted ? 'text-green-700' :
                        'text-gray-500'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {processingResult && (
        <Card className={`cyberpunk-border ${processingResult.success ? 'border-green-400' : 'border-red-400'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {processingResult.success ? 
                <CheckCircle className="h-5 w-5 text-green-600" /> :
                <AlertCircle className="h-5 w-5 text-red-600" />
              }
              Resultado del Procesamiento Avanzado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold">Firmas Digitales</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Contratista:</span>
                    <Badge variant={processingResult.signatures.contractor.validation.isValid ? "default" : "destructive"}>
                      {processingResult.signatures.contractor.validation.confidence}% confianza
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Cliente:</span>
                    <Badge variant={processingResult.signatures.client.validation.isValid ? "default" : "destructive"}>
                      {processingResult.signatures.client.validation.confidence}% confianza
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-semibold">Documento Final</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Tamaño:</span>
                    <span>{(processingResult.pdf.signed.fileSize / 1024).toFixed(1)} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hash:</span>
                    <span className="font-mono text-xs">{processingResult.pdf.signed.hash.substring(0, 16)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Eventos de auditoría:</span>
                    <span>{processingResult.security.auditTrail.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {processingResult.communications && (
              <div className="mt-6 space-y-3">
                <h4 className="font-semibold">Distribución</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <Mail className="h-6 w-6 mx-auto mb-1 text-blue-500" />
                    <div>Email Confirmación</div>
                    <Badge variant={processingResult.communications.emails.confirmation.sent ? "default" : "secondary"}>
                      {processingResult.communications.emails.confirmation.sent ? "Enviado" : "Pendiente"}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <Smartphone className="h-6 w-6 mx-auto mb-1 text-green-500" />
                    <div>SMS Cliente</div>
                    <Badge variant={processingResult.communications.sms.clientNotification.sent ? "default" : "secondary"}>
                      {processingResult.communications.sms.clientNotification.sent ? "Enviado" : "Pendiente"}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <Smartphone className="h-6 w-6 mx-auto mb-1 text-purple-500" />
                    <div>SMS Contratista</div>
                    <Badge variant={processingResult.communications.sms.contractorNotification.sent ? "default" : "secondary"}>
                      {processingResult.communications.sms.contractorNotification.sent ? "Enviado" : "Pendiente"}
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <Lock className="h-6 w-6 mx-auto mb-1 text-orange-500" />
                    <div>Validaciones</div>
                    <Badge variant="default">
                      {processingResult.security.biometricValidations.filter((v: any) => v.isValid).length}/2
                    </Badge>
                  </div>
                </div>
              </div>
            )}

            {processingResult.errors && processingResult.errors.length > 0 && (
              <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded">
                <h4 className="font-semibold text-red-800 mb-2">Errores</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {processingResult.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex gap-3">
        <Button
          onClick={executePhase2Process}
          disabled={isProcessing || !signatures?.contractor || !signatures?.client}
          className="flex-1 bg-cyan-600 hover:bg-cyan-700"
        >
          {isProcessing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Procesando con Tecnología Avanzada...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 mr-2" />
              Ejecutar Proceso Avanzado Fase 2
            </>
          )}
        </Button>
        
        <Button 
          variant="outline"
          onClick={checkServicesStatus}
          disabled={isProcessing}
        >
          <Settings className="h-4 w-4 mr-2" />
          Verificar Servicios
        </Button>
      </div>

      {/* Technical Information */}
      <Card className="cyberpunk-border border-gray-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Información Técnica - Fase 2
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-500 space-y-2">
          <div>
            <strong>Servicios Integrados:</strong> TwilioSMS, GeolocationValidation, AdvancedEmailTemplates, AdvancedPDFService
          </div>
          <div>
            <strong>Orquestación:</strong> Phase2IntegrationOrchestrator coordina todos los servicios automáticamente
          </div>
          <div>
            <strong>Compatibilidad:</strong> 100% compatible con SimpleContractGenerator existente - activación opcional
          </div>
          <div>
            <strong>Escalabilidad:</strong> Los servicios pueden habilitarse/deshabilitarse individualmente según necesidades
          </div>
          <div>
            <strong>Seguridad:</strong> Validación biométrica, geolocalización, audit trails y metadatos incrustados
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
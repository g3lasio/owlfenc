/**
 * EJEMPLO DE INTEGRACIÓN - SISTEMA DE FIRMADO DIGITAL
 * 
 * Este archivo demuestra cómo integrar el nuevo sistema de firmado digital
 * con el SimpleContractGenerator existente SIN ROMPER el flujo actual.
 * 
 * INTEGRACIÓN MODULAR - PRESERVA FUNCIONALIDAD EXISTENTE
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Signature, 
  ArrowRight, 
  Settings, 
  Shield,
  Zap
} from 'lucide-react';

// Import the new digital signing components
import DigitalSigningWorkflow from '../components/digital-signature/DigitalSigningWorkflow';

interface IntegrationExampleProps {
  contractData: any;
  onContractComplete: (result: any) => void;
}

export default function DigitalSigningIntegrationExample({
  contractData,
  onContractComplete
}: IntegrationExampleProps) {
  const [signingMode, setSigningMode] = useState<'traditional' | 'digital'>('traditional');
  const [showDigitalWorkflow, setShowDigitalWorkflow] = useState(false);

  /**
   * OPCIÓN 1: FLUJO TRADICIONAL (PRESERVADO)
   * El flujo existente de SimpleContractGenerator continúa funcionando exactamente igual
   */
  const handleTraditionalDownload = async () => {
    // Este es el flujo EXACTO que ya funciona en SimpleContractGenerator
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contractData),
      });

      if (response.ok && response.headers.get("content-type")?.includes("application/pdf")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `contract_traditional_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        onContractComplete({
          type: 'traditional',
          downloadedAt: new Date().toISOString(),
          status: 'downloaded'
        });
      }
    } catch (error) {
      console.error("Traditional download error:", error);
    }
  };

  /**
   * OPCIÓN 2: FLUJO DIGITAL AVANZADO (NUEVO)
   * Sistema completo de firmado digital que se activa SOLO cuando el usuario lo elige
   */
  const handleDigitalSigning = () => {
    setShowDigitalWorkflow(true);
  };

  const handleDigitalSigningComplete = (signedContract: any) => {
    setShowDigitalWorkflow(false);
    onContractComplete({
      type: 'digital',
      signedContract,
      completedAt: new Date().toISOString(),
      status: 'signed_and_distributed'
    });
  };

  const handleDigitalWorkflowCancel = () => {
    setShowDigitalWorkflow(false);
  };

  // Si está activo el workflow digital, mostrarlo
  if (showDigitalWorkflow) {
    return (
      <DigitalSigningWorkflow
        contractData={contractData}
        onSigningComplete={handleDigitalSigningComplete}
        onWorkflowCancel={handleDigitalWorkflowCancel}
      />
    );
  }

  // Vista principal con opciones de flujo
  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <Card className="cyberpunk-border border-cyan-400">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            Opciones de Finalización del Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Seleccione cómo desea finalizar este contrato. Ambas opciones son completamente funcionales.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Opción Tradicional */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-gray-200 hover:border-blue-400">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <Download className="h-8 w-8 text-blue-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Descarga Tradicional</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Generar y descargar PDF inmediatamente. Firmas físicas requeridas.
                    </p>
                    
                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Generación instantánea
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Flujo existente probado
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                        Firmas físicas necesarias
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleTraditionalDownload}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar PDF Ahora
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Opción Digital */}
            <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 border-cyan-200 hover:border-cyan-400">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-cyan-100 rounded-full flex items-center justify-center">
                    <Signature className="h-8 w-8 text-cyan-600" />
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Firmado Digital Avanzado</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Proceso completo con firmas biométricas y distribución automática.
                    </p>
                    
                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Validación biométrica
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Distribución automática
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Validez legal avanzada
                      </div>
                    </div>

                    <Badge className="bg-cyan-600 text-white">
                      <Zap className="h-3 w-3 mr-1" />
                      NUEVO
                    </Badge>
                  </div>
                  
                  <Button 
                    onClick={handleDigitalSigning}
                    className="w-full bg-cyan-600 hover:bg-cyan-700"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Iniciar Firmado Digital
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Información técnica para desarrolladores */}
      <Card className="cyberpunk-border border-gray-600">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-600">
            Información Técnica de Integración
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-gray-500 space-y-2">
          <div>
            <strong>Preservación del Flujo Existente:</strong> SimpleContractGenerator.tsx 
            mantiene su funcionalidad exacta sin modificaciones.
          </div>
          <div>
            <strong>Componentes Modulares:</strong> DigitalSigningWorkflow puede integrarse 
            en cualquier punto del flujo sin afectar el código existente.
          </div>
          <div>
            <strong>Compatibilidad Total:</strong> Ambos flujos utilizan el mismo contractData 
            y pueden coexistir perfectamente.
          </div>
          <div>
            <strong>Escalabilidad:</strong> El sistema digital se activa solo cuando se necesita, 
            sin overhead en el flujo tradicional.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * EJEMPLO DE INTEGRACIÓN EN SimpleContractGenerator.tsx
 * 
 * Para integrar en el archivo existente, simplemente reemplazar en Step 3:
 * 
 * // ANTES (líneas 1390-1440 aprox en SimpleContractGenerator.tsx):
 * <Button onClick={handleGenerateContract}>
 *   Generate Contract PDF
 * </Button>
 * 
 * // DESPUÉS:
 * <DigitalSigningIntegrationExample 
 *   contractData={contractPayload}
 *   onContractComplete={(result) => {
 *     if (result.type === 'traditional') {
 *       // Mantener lógica existente
 *       setCurrentStep(3);
 *       toast({ title: "PDF Downloaded" });
 *     } else {
 *       // Nueva lógica digital
 *       setCurrentStep(3);
 *       toast({ title: "Contract Signed & Distributed" });
 *     }
 *   }}
 * />
 * 
 * BENEFICIOS DE ESTA INTEGRACIÓN:
 * ✅ Zero breaking changes al código existente
 * ✅ Ambos flujos funcionan independientemente
 * ✅ Migración gradual posible (usuarios pueden elegir)
 * ✅ Rollback instantáneo si hay problemas
 * ✅ Testing independiente de cada flujo
 * ✅ Mantenimiento simplificado
 */
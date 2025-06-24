import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  FileUp, 
  Shield, 
  Zap, 
  CheckCircle, 
  FileText, 
  Upload, 
  Brain,
  Scale,
  Download,
  Eye,
  AlertTriangle,
  Award,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  PenTool,
  Send
} from 'lucide-react';

export default function LegalContractEngineFixed() {
  const { toast } = useToast();
  
  // Estados de navegación por pasos
  const [currentStep, setCurrentStep] = useState(0);
  const [isCreateMode, setIsCreateMode] = useState(false);
  
  // Estados del flujo existente
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [generatedContract, setGeneratedContract] = useState<string>('');
  const [contractStrength, setContractStrength] = useState<number>(0);
  const [legalAdvice, setLegalAdvice] = useState<string[]>([]);
  const [protectionsApplied, setProtectionsApplied] = useState<string[]>([]);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureData, setSignatureData] = useState<{contractor: string, client: string, date: string} | null>(null);
  const [selectedContractType, setSelectedContractType] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('');

  // Requisitos legales específicos por estado
  const STATE_REQUIREMENTS = {
    'california': {
      name: '🇺🇸 California',
      requirements: [
        'Contrato escrito obligatorio (> $500)',
        'Dibujo en contratos de piscina',
        'Límite anticipo 10% o $1,000',
        'Derecho a cancelar en 3 días'
      ]
    },
    'florida': {
      name: '🇺🇸 Florida', 
      requirements: [
        'Aviso obligatorio sobre gravámenes en primera página (> $2,500)',
        'Licencia obligatoria claramente indicada'
      ]
    },
    'texas': {
      name: '🇺🇸 Texas',
      requirements: [
        'Firma cónyuge obligatoria en contratos para vivienda protegida (homestead)',
        'Aviso destacado sobre pérdida de derechos de propiedad'
      ]
    },
    'newyork': {
      name: '🇺🇸 Nueva York',
      requirements: [
        'Contrato escrito (> $500)',
        'Número de licencia obligatorio (NYC)',
        'Avisos obligatorios de cancelación',
        'Manejo especial de anticipos'
      ]
    }
  };

  // Tipos de contratos especializados
  const CONTRACT_TYPES = [
    {
      id: 'general',
      name: '🏢 Contratista General',
      title: 'Contrato General de Construcción',
      description: 'Alcance global y gestión de subcontratistas',
      characteristics: [
        'Cronograma y pagos estructurados',
        'Cláusulas detalladas (seguros, fianzas, arbitraje)',
        'Gestión completa del proyecto',
        'Responsabilidad total ante el propietario'
      ],
      regulations: 'Más complejo, aplica en obras comerciales/residenciales grandes'
    },
    {
      id: 'pool',
      name: '🏊 Contratista de Piscinas',
      title: 'Contrato de Construcción de Piscina',
      description: 'Especializado en construcción de piscinas',
      characteristics: [
        'Plano/dibujo a escala obligatorio',
        'Detalles técnicos específicos (equipos, fases)',
        'Garantías especiales de estructura y equipos',
        'Límites legales de anticipo por estado'
      ],
      regulations: 'Considerado Contrato de Mejora del Hogar en residencial'
    },
    {
      id: 'homeimprovement',
      name: '🏡 Mejoras del Hogar',
      title: 'Contrato de Mejora del Hogar',
      description: 'Altamente regulado con protección al consumidor',
      characteristics: [
        'Descripción detallada del alcance',
        'Derecho a cancelar (3 días)',
        'Avisos legales sobre gravámenes y seguros',
        'Límites legales a anticipos iniciales'
      ],
      regulations: 'Más simple y estandarizado, alta protección consumidor'
    },
    {
      id: 'subcontractor',
      name: '🔧 Subcontratista',
      title: 'Acuerdo de Subcontratista',
      description: 'Contratistas especializados bajo General Contractors',
      characteristics: [
        'Alcance específico alineado al contrato principal',
        'Pago condicionado (Pay-When-Paid, Pay-If-Paid)',
        'Cláusulas flow-down del contrato principal',
        'Seguro obligatorio, cláusulas de indemnización'
      ],
      regulations: 'Contrato comercial, no directo con propietario final'
    }
  ];

  // Pasos del workflow horizontal
  const STEPS = [
    {
      id: 0,
      title: "Extraer Datos",
      description: "Subir y procesar PDF del estimado",
      icon: Upload,
      color: "blue"
    },
    {
      id: 1,
      title: "Análisis Legal",
      description: "Evaluar riesgos y protecciones",
      icon: Scale,
      color: "green"
    },
    {
      id: 2,
      title: "Generar Contrato",
      description: "Crear contrato blindado",
      icon: Shield,
      color: "purple"
    },
    {
      id: 3,
      title: "Vista Previa",
      description: "Revisar y descargar",
      icon: Eye,
      color: "orange"
    }
  ];

  // Funciones de navegación
  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: return extractedData !== null && selectedContractType !== '' && selectedState !== '';
      case 1: return riskAnalysis !== null;
      case 2: return generatedContract !== "";
      case 3: return true;
      default: return false;
    }
  };

  // Funciones del flujo existente
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      toast({
        title: "📄 PDF Seleccionado",
        description: `Archivo: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      });
    } else {
      toast({
        title: "❌ Archivo inválido",
        description: "Por favor selecciona un archivo PDF válido",
        variant: "destructive"
      });
    }
  };

  const processFile = async () => {
    if (!selectedFile) return;
    
    setIsProcessing(true);
    try {
      // Simular procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockData = {
        clientName: "Juan Pérez",
        projectType: "Cerca Residencial",
        totalAmount: "$5,500.00",
        address: "123 Main St, Austin, TX"
      };
      
      setExtractedData(mockData);
      toast({
        title: "✅ Datos extraídos correctamente",
        description: "La información del PDF ha sido procesada",
      });
      
      nextStep();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const performRiskAnalysis = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockRisk = {
        riskLevel: "medio",
        factors: [
          "Proyecto residencial estándar",
          "Cliente con historial positivo",
          "Monto dentro del rango normal"
        ],
        recommendations: [
          "Incluir cláusula de cambios de alcance",
          "Definir claramente tiempos de entrega",
          "Establecer términos de pago específicos"
        ]
      };
      
      setRiskAnalysis(mockRisk);
      setLegalAdvice(mockRisk.recommendations);
      
      toast({
        title: "✅ Análisis de riesgo completado",
        description: "Se han identificado las protecciones necesarias",
      });
      
      nextStep();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar el análisis de riesgo",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const generateContractByType = (contractType: string, data: any, state: string) => {
    const selectedType = CONTRACT_TYPES.find(t => t.id === contractType);
    const stateReqs = STATE_REQUIREMENTS[state as keyof typeof STATE_REQUIREMENTS];
    
    const baseContract = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6;">
        <h1 style="text-align: center; color: #2563eb; margin-bottom: 30px;">${selectedType?.title.toUpperCase()}</h1>
        <p style="text-align: center; font-weight: bold; color: #7c3aed; margin-bottom: 20px;">
          CONTRATO VÁLIDO PARA ${stateReqs?.name}
        </p>
    `;

    let specificClauses = '';
    let stateSpecificClauses = '';
    let protections: string[] = [];

    // Generar cláusulas específicas por estado
    switch (state) {
      case 'california':
        stateSpecificClauses = `
          <h2 style="color: #dc2626;">REQUISITOS LEGALES DE CALIFORNIA</h2>
          <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
            <p><strong>CONTRATO ESCRITO OBLIGATORIO:</strong> Este contrato es requerido por la ley de California para trabajos superiores a $500.</p>
            ${contractType === 'pool' ? '<p><strong>DIBUJO TÉCNICO ADJUNTO:</strong> Se incluye plano a escala como parte integral del contrato (Código de California).</p>' : ''}
            <p><strong>LÍMITE DE ANTICIPO:</strong> El anticipo no puede exceder 10% del precio total del contrato o $1,000, lo que sea menor.</p>
            <p><strong>DERECHO A CANCELAR:</strong> El cliente tiene derecho a cancelar este contrato dentro de 3 días hábiles sin penalidad.</p>
          </div>
        `;
        break;
      case 'florida':
        stateSpecificClauses = `
          <h2 style="color: #dc2626;">REQUISITOS LEGALES DE FLORIDA</h2>
          <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
            ${data?.totalAmount && parseFloat(data.totalAmount.replace(/[^0-9.-]+/g,"")) > 2500 ? 
              '<p><strong>AVISO OBLIGATORIO SOBRE GRAVÁMENES:</strong> IMPORTANTE: El contratista puede tener derecho legal a presentar un gravamen sobre la propiedad si no se realiza el pago completo según los términos del contrato.</p>' : 
              ''}
            <p><strong>LICENCIA OBLIGATORIA:</strong> Número de licencia del contratista: [LICENCIA REQUERIDA] - Verificable en MyFloridaLicense.com</p>
          </div>
        `;
        break;
      case 'texas':
        stateSpecificClauses = `
          <h2 style="color: #dc2626;">REQUISITOS LEGALES DE TEXAS</h2>
          <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
            <p><strong>FIRMA DE CÓNYUGE REQUERIDA:</strong> Si esta propiedad es una vivienda protegida (homestead), se requiere la firma de ambos cónyuges.</p>
            <p><strong>AVISO SOBRE DERECHOS DE PROPIEDAD:</strong> ATENCIÓN: Al firmar este contrato, el propietario puede estar renunciando a ciertos derechos de propiedad. Consulte con un abogado si tiene dudas.</p>
            <div style="margin-top: 10px; padding: 10px; background-color: #fee2e2;">
              <p><strong>Firmas Requeridas:</strong></p>
              <p>Propietario: _________________________ Fecha: _______</p>
              <p>Cónyuge: ____________________________ Fecha: _______</p>
            </div>
          </div>
        `;
        break;
      case 'newyork':
        stateSpecificClauses = `
          <h2 style="color: #dc2626;">REQUISITOS LEGALES DE NUEVA YORK</h2>
          <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 15px 0;">
            <p><strong>CONTRATO ESCRITO OBLIGATORIO:</strong> Requerido por ley de NY para trabajos superiores a $500.</p>
            <p><strong>NÚMERO DE LICENCIA NYC:</strong> [LICENCIA REQUERIDA] - Verificable en NYC.gov/consumers</p>
            <p><strong>AVISO DE CANCELACIÓN:</strong> El cliente tiene derecho a cancelar este contrato según las regulaciones de protección al consumidor de Nueva York.</p>
            <p><strong>MANEJO ESPECIAL DE ANTICIPOS:</strong> Los anticipos están regulados por las leyes de protección al consumidor de NY.</p>
          </div>
        `;
        break;
    }

    switch (contractType) {
      case 'general':
        specificClauses = `
          <h2>GESTIÓN INTEGRAL DEL PROYECTO</h2>
          <p><strong>Contratista General:</strong> [Nombre de la empresa]</p>
          <p><strong>Responsabilidad Total:</strong> El contratista asume responsabilidad completa ante el propietario por todos los aspectos del proyecto.</p>
          
          <h2>GESTIÓN DE SUBCONTRATISTAS</h2>
          <p>El contratista general será responsable de:</p>
          <ul>
            <li>Selección y supervisión de subcontratistas especializados</li>
            <li>Coordinación de cronogramas y entregas</li>
            <li>Verificación de seguros y licencias de subcontratistas</li>
          </ul>

          <h2>CRONOGRAMA Y PAGOS ESTRUCTURADOS</h2>
          <p><strong>Calendario de Pagos:</strong></p>
          <ul>
            <li>Anticipo: 10% al firmar el contrato</li>
            <li>Progreso: Pagos por hitos completados</li>
            <li>Final: 10% a la entrega final y aceptación</li>
          </ul>

          <h2>SEGUROS Y FIANZAS</h2>
          <p>El contratista mantendrá:</p>
          <ul>
            <li>Seguro de responsabilidad general: $1,000,000 mínimo</li>
            <li>Seguro de compensación laboral según ley estatal</li>
            <li>Fianza de cumplimiento cuando sea requerida</li>
          </ul>
        `;
        protections = [
          "Responsabilidad integral del contratista",
          "Gestión profesional de subcontratistas",
          "Cronograma estructurado de pagos",
          "Seguros obligatorios completos",
          "Fianzas de cumplimiento"
        ];
        break;

      case 'pool':
        specificClauses = `
          <h2>ESPECIFICACIONES TÉCNICAS DE PISCINA</h2>
          <p><strong>Planos a Escala:</strong> Se adjuntan planos técnicos detallados como parte integral del contrato.</p>
          
          <h2>FASES DE CONSTRUCCIÓN</h2>
          <ul>
            <li><strong>Fase 1:</strong> Excavación y preparación del terreno</li>
            <li><strong>Fase 2:</strong> Instalación de estructura y plomería</li>
            <li><strong>Fase 3:</strong> Instalación de equipos especializados</li>
            <li><strong>Fase 4:</strong> Acabados y pruebas finales</li>
          </ul>

          <h2>EQUIPOS Y GARANTÍAS ESPECIALES</h2>
          <p><strong>Garantía de Estructura:</strong> 10 años en estructura principal</p>
          <p><strong>Garantía de Equipos:</strong> 2 años en bombas, filtros y sistemas</p>
          
          <h2>LÍMITES DE ANTICIPO</h2>
          <p><strong>Anticipo Máximo Permitido:</strong> Según regulaciones estatales (máximo 10% o $1,000, lo que sea menor)</p>
        `;
        protections = [
          "Planos técnicos obligatorios",
          "Garantías especiales de estructura (10 años)",
          "Garantías de equipos especializados",
          "Límites legales de anticipos",
          "Fases de construcción detalladas"
        ];
        break;

      case 'homeimprovement':
        specificClauses = `
          <h2>PROTECCIONES AL CONSUMIDOR</h2>
          <p><strong>DERECHO A CANCELAR:</strong> El cliente tiene derecho a cancelar este contrato dentro de 3 días hábiles después de firmarlo.</p>
          
          <h2>AVISO SOBRE GRAVÁMENES</h2>
          <p><strong>IMPORTANTE:</strong> El contratista puede tener derecho a presentar un gravamen sobre la propiedad si no se realiza el pago completo.</p>
          
          <h2>DESCRIPCIÓN DETALLADA DEL ALCANCE</h2>
          <p><strong>Trabajos Incluidos:</strong></p>
          <ul>
            <li>Descripción específica de materiales y mano de obra</li>
            <li>Fechas de inicio y finalización</li>
            <li>Especificaciones de limpieza post-trabajo</li>
          </ul>

          <h2>LÍMITES DE ANTICIPO INICIAL</h2>
          <p><strong>Anticipo Permitido:</strong> Máximo permitido por ley estatal (típicamente 10% o $500)</p>
          
          <h2>SEGUROS REQUERIDOS</h2>
          <p>El contratista debe proporcionar comprobante de seguro de responsabilidad civil.</p>
        `;
        protections = [
          "Derecho de cancelación (3 días)",
          "Aviso legal sobre gravámenes",
          "Límites estrictos de anticipos",
          "Descripción detallada obligatoria",
          "Seguros de responsabilidad requeridos"
        ];
        break;

      case 'subcontractor':
        specificClauses = `
          <h2>RELACIÓN CON CONTRATO PRINCIPAL</h2>
          <p><strong>Contrato Principal:</strong> Este acuerdo está subordinado al contrato principal entre el Contratista General y el Propietario.</p>
          
          <h2>ALCANCE ESPECÍFICO</h2>
          <p><strong>Trabajos Asignados:</strong> [Descripción específica del trabajo especializado]</p>
          <p><strong>Alineación:</strong> Todo trabajo debe cumplir con especificaciones del contrato principal.</p>

          <h2>TÉRMINOS DE PAGO CONDICIONADO</h2>
          <p><strong>Pay-When-Paid:</strong> El pago está condicionado al pago del contrato principal.</p>
          <p><strong>Cronograma:</strong> Pagos dentro de 7 días después de recibir pago del propietario.</p>

          <h2>CLÁUSULAS FLOW-DOWN</h2>
          <p>Las siguientes obligaciones del contrato principal se aplican a este subcontrato:</p>
          <ul>
            <li>Estándares de calidad y especificaciones técnicas</li>
            <li>Cronogramas y fechas de entrega</li>
            <li>Requisitos de seguridad e inspecciones</li>
          </ul>

          <h2>SEGUROS E INDEMNIZACIÓN</h2>
          <p><strong>Seguro Obligatorio:</strong> Responsabilidad general mínima de $500,000</p>
          <p><strong>Indemnización:</strong> El subcontratista indemniza al contratista general por trabajos realizados.</p>
        `;
        protections = [
          "Alineación con contrato principal",
          "Pago condicionado estructurado",
          "Cláusulas flow-down aplicadas",
          "Seguros especializados obligatorios",
          "Indemnización mutua"
        ];
        break;

      default:
        specificClauses = '';
        protections = [];
    }

    const fullContract = baseContract + `
      <h2>DATOS DEL PROYECTO</h2>
      <p><strong>Cliente:</strong> ${data?.clientName}</p>
      <p><strong>Dirección:</strong> ${data?.address}</p>
      <p><strong>Tipo de Proyecto:</strong> ${data?.projectType}</p>
      <p><strong>Monto Total:</strong> ${data?.totalAmount}</p>
      
      ${stateSpecificClauses}
      
      ${specificClauses}
      
      <h2>TÉRMINOS GENERALES</h2>
      <ul>
        ${legalAdvice.map(advice => `<li>${advice}</li>`).join('')}
      </ul>
      
      <h2>DISPOSICIONES FINALES</h2>
      <p>Este contrato ha sido generado conforme a las regulaciones específicas para ${selectedType?.name} en ${stateReqs?.name}.</p>
      <p><strong>Regulación Aplicable:</strong> ${selectedType?.regulations}</p>
      <p><strong>Cumplimiento Legal:</strong> Cumple con ${stateReqs?.requirements.length} requisitos legales específicos del estado.</p>
      
      <p style="margin-top: 30px; text-align: center; font-size: 12px; color: #666;">
        Contrato generado por Legal Defense Engine - ${new Date().toLocaleDateString('es-ES')}
      </p>
    </div>
    `;

    // Combinar protecciones específicas del tipo de contrato con protecciones del estado
    const stateProtections = stateReqs?.requirements || [];
    const allProtections = [...protections, ...stateProtections];

    return { contract: fullContract, protections: allProtections };
  };

  const generateContract = async () => {
    setIsProcessing(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const { contract, protections } = generateContractByType(selectedContractType, extractedData, selectedState);
      
      setGeneratedContract(contract);
      setContractStrength(92);
      setProtectionsApplied(protections);
      
      const contractTypeName = CONTRACT_TYPES.find(t => t.id === selectedContractType)?.name;
      const stateName = STATE_REQUIREMENTS[selectedState as keyof typeof STATE_REQUIREMENTS]?.name;
      
      toast({
        title: "✅ Contrato especializado generado",
        description: `Contrato ${contractTypeName} para ${stateName} completado`,
      });
      
      nextStep();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el contrato",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadContract = () => {
    let contractWithSignatures = generatedContract;
    
    if (signatureData) {
      contractWithSignatures += `
        <div style="margin-top: 40px; border-top: 2px solid #333; padding-top: 20px;">
          <h3>FIRMAS ELECTRÓNICAS</h3>
          <div style="display: flex; justify-content: space-between; margin-top: 20px;">
            <div style="width: 45%;">
              <p><strong>Contratista:</strong></p>
              <p style="font-family: cursive; font-size: 24px; color: #2563eb;">${signatureData.contractor}</p>
              <p>Fecha: ${signatureData.date}</p>
            </div>
            <div style="width: 45%;">
              <p><strong>Cliente:</strong></p>
              <p style="font-family: cursive; font-size: 24px; color: #2563eb;">${signatureData.client}</p>
              <p>Fecha: ${signatureData.date}</p>
            </div>
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #666;">
            Este documento ha sido firmado electrónicamente de acuerdo con las leyes aplicables.
          </p>
        </div>
      `;
    }
    
    const blob = new Blob([contractWithSignatures], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contrato-blindado-firmado-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "📄 Contrato descargado",
      description: "El archivo firmado ha sido guardado en tu dispositivo",
    });
  };

  const handleElectronicSignature = async () => {
    setIsSigning(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const signatures = {
        contractor: "María González García",
        client: extractedData?.clientName || "Cliente",
        date: new Date().toLocaleDateString('es-ES')
      };
      
      setSignatureData(signatures);
      
      toast({
        title: "✅ Contrato firmado electrónicamente",
        description: "Las firmas han sido aplicadas correctamente",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo completar la firma electrónica",
        variant: "destructive"
      });
    } finally {
      setIsSigning(false);
    }
  };

  const handleCreateNew = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setRiskAnalysis(null);
    setGeneratedContract('');
    setContractStrength(0);
    setLegalAdvice([]);
    setProtectionsApplied([]);
    setCurrentStep(0);
    setIsCreateMode(true);
  };

  const handleBackToDashboard = () => {
    setIsCreateMode(false);
    setCurrentStep(0);
  };

  const getStepColor = (stepIndex: number) => {
    if (stepIndex < currentStep) return "bg-green-500 text-white border-green-500";
    if (stepIndex === currentStep) return "bg-blue-500 text-white border-blue-500";
    return "bg-gray-100 text-gray-400 border-gray-200";
  };

  const getProgressPercentage = () => {
    return ((currentStep) / (STEPS.length - 1)) * 100;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Extraer Datos
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Upload className="h-16 w-16 mx-auto text-blue-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Seleccionar Tipo de Contrato y Extraer Datos</h3>
              <p className="text-muted-foreground">
                Selecciona el tipo de contrato y sube el PDF de tu estimado
              </p>
            </div>

            {/* Selector de Tipo de Contrato */}
            {!selectedContractType && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-center">Selecciona el Tipo de Contrato</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CONTRACT_TYPES.map((type) => (
                    <Card 
                      key={type.id}
                      className={`cursor-pointer transition-all hover:shadow-lg ${
                        selectedContractType === type.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedContractType(type.id)}
                    >
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center">
                          {type.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                        <div className="text-xs space-y-1">
                          {type.characteristics.slice(0, 2).map((char, idx) => (
                            <p key={idx} className="text-gray-600">• {char}</p>
                          ))}
                        </div>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {type.regulations}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedContractType && (
              <div className="space-y-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-800">
                          {CONTRACT_TYPES.find(t => t.id === selectedContractType)?.name}
                        </p>
                        <p className="text-sm text-green-700">
                          {CONTRACT_TYPES.find(t => t.id === selectedContractType)?.title}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedContractType('')}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Selector de Estado */}
                {!selectedState && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-center">Selecciona el Estado</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(STATE_REQUIREMENTS).map(([stateKey, stateInfo]) => (
                        <Card 
                          key={stateKey}
                          className={`cursor-pointer transition-all hover:shadow-lg ${
                            selectedState === stateKey ? 'ring-2 ring-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedState(stateKey)}
                        >
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              {stateInfo.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xs space-y-1">
                              {stateInfo.requirements.slice(0, 2).map((req, idx) => (
                                <p key={idx} className="text-gray-600">• {req}</p>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {selectedState && (
                  <Card className="border-purple-200 bg-purple-50">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-purple-800">
                            Estado: {STATE_REQUIREMENTS[selectedState as keyof typeof STATE_REQUIREMENTS]?.name}
                          </p>
                          <p className="text-sm text-purple-700">
                            Requisitos legales específicos aplicables
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedState('')}
                        >
                          Cambiar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {!selectedFile ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FileUp className="h-12 w-12 text-gray-400 mb-4" />
                  <span className="text-lg font-medium">Haz clic para subir PDF</span>
                  <span className="text-sm text-gray-500 mt-1">O arrastra y suelta aquí</span>
                </label>
              </div>
            ) : (
              <div className="bg-blue-50 p-6 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <FileText className="h-10 w-10 text-blue-500" />
                    <div>
                      <p className="font-semibold">{selectedFile.name}</p>
                      <p className="text-sm text-gray-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={processFile}
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <Brain className="h-4 w-4 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4 mr-2" />
                        Extraer Datos
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 1: // Análisis Legal
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Scale className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Análisis Legal de Riesgos</h3>
              <p className="text-muted-foreground">
                Evaluando riesgos específicos y generando recomendaciones de protección
              </p>
            </div>
            
            {extractedData && (
              <div className="bg-green-50 p-6 rounded-lg">
                <h4 className="font-semibold mb-4">Datos Extraídos:</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">Cliente:</span>
                    <p className="font-medium">{extractedData.clientName}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Proyecto:</span>
                    <p className="font-medium">{extractedData.projectType}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Monto:</span>
                    <p className="font-medium">{extractedData.totalAmount}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">Dirección:</span>
                    <p className="font-medium">{extractedData.address}</p>
                  </div>
                </div>
              </div>
            )}
            
            {!riskAnalysis ? (
              <div className="text-center">
                <Button
                  onClick={performRiskAnalysis}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-spin" />
                      Analizando Riesgos...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Iniciar Análisis Legal
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-yellow-50 p-6 rounded-lg">
                <h4 className="font-semibold mb-4">Análisis Completado:</h4>
                <div className="space-y-3">
                  <div>
                    <Badge className={`${riskAnalysis.riskLevel === 'bajo' ? 'bg-green-500' : riskAnalysis.riskLevel === 'medio' ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
                      Riesgo {riskAnalysis.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">Recomendaciones:</h5>
                    <ul className="space-y-1">
                      {riskAnalysis.recommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Generar Contrato
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Shield className="h-16 w-16 mx-auto text-purple-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Generar Contrato Blindado</h3>
              <p className="text-muted-foreground">
                Creando contrato profesional con máxima protección legal
              </p>
            </div>
            
            {!generatedContract ? (
              <div className="text-center">
                <div className="bg-purple-50 p-6 rounded-lg mb-4">
                  <p className="text-purple-800 mb-4">
                    Listo para generar tu contrato blindado con todas las protecciones legales.
                  </p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-purple-600">Protecciones:</span>
                      <p>{legalAdvice.length} cláusulas de seguridad</p>
                    </div>
                    <div>
                      <span className="text-purple-600">Nivel de Riesgo:</span>
                      <p>{riskAnalysis?.riskLevel || 'Evaluado'}</p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={generateContract}
                  disabled={isProcessing}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-spin" />
                      Generando Contrato...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Generar Contrato Blindado
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="bg-green-50 p-6 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <Check className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold">Contrato Generado Exitosamente</h4>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-white rounded">
                    <div className="text-2xl font-bold text-green-600">{contractStrength}/100</div>
                    <div className="text-sm text-gray-600">Fortaleza Legal</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded">
                    <div className="text-2xl font-bold text-blue-600">{protectionsApplied.length}</div>
                    <div className="text-sm text-gray-600">Protecciones</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded">
                    <div className="text-2xl font-bold text-purple-600">100%</div>
                    <div className="text-sm text-gray-600">Completado</div>
                  </div>
                </div>
                <Button onClick={nextStep} className="w-full bg-green-600 hover:bg-green-700">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Vista Previa del Contrato
                </Button>
              </div>
            )}
          </div>
        );

      case 3: // Vista Previa
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Eye className="h-16 w-16 mx-auto text-orange-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Vista Previa del Contrato</h3>
              <p className="text-muted-foreground">
                Revisa tu contrato blindado y descárgalo cuando esté listo
              </p>
            </div>
            
            {generatedContract && (
              <div className="space-y-4">
                <div className="flex gap-4 justify-center">
                  {!signatureData && (
                    <Button
                      onClick={handleElectronicSignature}
                      disabled={isSigning}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      {isSigning ? "Firmando..." : "Firmar Electrónicamente"}
                    </Button>
                  )}
                  <Button
                    onClick={downloadContract}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {signatureData ? "Descargar Contrato Firmado" : "Descargar Contrato"}
                  </Button>
                </div>

                {signatureData && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center text-green-800">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        Contrato Firmado Electrónicamente
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p><strong>Contratista:</strong> {signatureData.contractor}</p>
                        </div>
                        <div>
                          <p><strong>Cliente:</strong> {signatureData.client}</p>
                        </div>
                        <div className="col-span-2">
                          <p><strong>Fecha de firma:</strong> {signatureData.date}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Contrato Blindado - Vista Previa</span>
                      <Badge className="bg-green-100 text-green-800">
                        Listo para Usar
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="border rounded-lg p-6 bg-white max-h-96 "
                      dangerouslySetInnerHTML={{ __html: generatedContract }}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isCreateMode) {
    return (
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
            <Scale className="h-10 w-10 text-green-600" />
            <Brain className="h-11 w-11 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-green-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🛡️ Generador de Contratos Legales
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Convierte tus estimados en contratos blindados con protección legal máxima
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <Sparkles className="h-4 w-4" />
            <span>Protección Legal Nivel Profesional</span>
            <Sparkles className="h-4 w-4" />
          </div>
        </div>

        {/* Botón principal */}
        <div className="text-center">
          <Button
            onClick={handleCreateNew}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8 py-3"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear Nuevo Contrato
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header con navegación */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Generador de Contratos</h1>
          <div className="w-20"></div>
        </div>

        {/* Indicador de pasos horizontal */}
        <div className="relative mb-8">
          {/* Barra de progreso */}
          <div className="absolute top-6 left-0 w-full h-1 bg-gray-200 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-in-out"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          
          {/* Círculos de pasos */}
          <div className="relative flex justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`
                      w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 bg-white
                      ${getStepColor(index)}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className={`font-medium text-sm ${isCurrent ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-gray-500 max-w-24">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido del paso actual */}
      <Card className="mb-8">
        <CardContent className="p-8">
          {renderStepContent()}
        </CardContent>
      </Card>

      {/* Botones de navegación */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </Button>
        
        <Button
          onClick={nextStep}
          disabled={currentStep === STEPS.length - 1 || !canProceedToNext()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}